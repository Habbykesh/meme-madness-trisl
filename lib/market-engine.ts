import { prisma } from "./db";
import { redis, LEADERBOARD_KEY, LEADERBOARD_OVERALL_KEY } from "./redis";
import { MarketDuration, MarketStatus, Outcome, TokenStatus } from "@prisma/client";
import { fetchMarketCapUsd } from "./market-data";

const DURATIONS: { key: MarketDuration; seconds: number; cutoffBeforeEnd: number }[] = [
  { key: "ONE_MIN", seconds: 60, cutoffBeforeEnd: 15 },
  { key: "THREE_MIN", seconds: 180, cutoffBeforeEnd: 15 },
  { key: "FIVE_MIN", seconds: 300, cutoffBeforeEnd: 15 },
];

/**
 * The single entry point called by /api/tick every ~1 minute.
 * Stateless — safe to call repeatedly, safe to call from a free cron pinger.
 * Never guesses a settlement value: if market data is unavailable, the
 * affected market is simply left un-settled until the next tick.
 */
export async function runTick() {
  const now = new Date();

  const activeDay = await prisma.tournamentDay.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
  });

  if (!activeDay) {
    return { ok: true, note: "no active tournament day right now" };
  }

  await settleDueMarkets(now);
  await ensureUpcomingMarkets(activeDay.id, now);
  await tallyBattleVolume(activeDay.id);

  return { ok: true, tournamentDayId: activeDay.id };
}

// ── Settlement ───────────────────────────────────────

async function settleDueMarkets(now: Date) {
  // Close predictions on anything past cutoff
  await prisma.market.updateMany({
    where: { status: "OPEN", cutoffAt: { lte: now } },
    data: { status: "PREDICTIONS_CLOSED" },
  });

  const dueToSettle = await prisma.market.findMany({
    where: { status: "PREDICTIONS_CLOSED", settlesAt: { lte: now } },
    include: { token: true, predictions: true },
  });

  for (const market of dueToSettle) {
    const endCap = await fetchMarketCapUsd(market.token.contractAddr);

    if (endCap === null) {
      // Data provider failed — do NOT guess. Leave it PREDICTIONS_CLOSED,
      // it'll retry next tick.
      continue;
    }

    const startCap = Number(market.startMarketCapUsd);
    let outcome: Outcome;
    if (endCap > startCap) outcome = "UP";
    else if (endCap < startCap) outcome = "DOWN";
    else outcome = "PUSH";

    await prisma.$transaction(async (tx) => {
      await tx.market.update({
        where: { id: market.id },
        data: { status: "SETTLED", endMarketCapUsd: endCap, outcome },
      });

      for (const pred of market.predictions) {
        if (pred.voided) continue;

        let payout: number;
        if (outcome === "PUSH") {
          payout = pred.stake; // refund
        } else if (pred.direction === outcome) {
          // Simple 2x pari-mutuel-style payout for the trial. Swap in a
          // real pari-mutuel pool split later if you want true dynamic odds.
          payout = pred.stake * 2;
        } else {
          payout = 0;
        }

        await tx.prediction.update({
          where: { id: pred.id },
          data: { payout, settledAt: new Date() },
        });

        const net = payout - pred.stake;
        await tx.dailyStat.upsert({
          where: { tournamentDayId_userId: { tournamentDayId: market.tournamentDayId, userId: pred.userId } },
          update: {
            netCreditsWon: { increment: net },
            predictionCount: { increment: 1 },
            bestMultiple: payout > 0 ? Math.max(payout / pred.stake, 0) : undefined,
          },
          create: {
            tournamentDayId: market.tournamentDayId,
            userId: pred.userId,
            netCreditsWon: net,
            predictionCount: 1,
            bestMultiple: payout > 0 ? payout / pred.stake : 0,
          },
        });

        await redis.zincrby(LEADERBOARD_KEY(market.tournamentDayId), net, pred.userId);
        await redis.zincrby(LEADERBOARD_OVERALL_KEY, net, pred.userId);
      }
    });
  }
}

// ── Market creation ──────────────────────────────────

async function ensureUpcomingMarkets(tournamentDayId: string, now: Date) {
  const lineup = await prisma.tokenLineup.findMany({
    where: { tournamentDayId },
    include: { token: true },
  });

  for (const entry of lineup) {
    for (const dur of DURATIONS) {
      const existing = await prisma.market.findFirst({
        where: {
          tournamentDayId,
          tokenId: entry.tokenId,
          duration: dur.key,
          status: { in: ["SCHEDULED", "OPEN", "PREDICTIONS_CLOSED"] },
        },
      });

      if (existing) continue; // one active/upcoming market per token+duration at a time

      const startCap = await fetchMarketCapUsd(entry.token.contractAddr);
      if (startCap === null) continue; // don't create a market we can't price

      const opensAt = now;
      const settlesAt = new Date(now.getTime() + dur.seconds * 1000);
      const cutoffAt = new Date(settlesAt.getTime() - dur.cutoffBeforeEnd * 1000);

      await prisma.market.create({
        data: {
          tournamentDayId,
          tokenId: entry.tokenId,
          duration: dur.key,
          status: "OPEN",
          opensAt,
          cutoffAt,
          settlesAt,
          startMarketCapUsd: startCap,
        },
      });
    }
  }
}

// ── Battle Mode (automatic, display-only — never mutates the lineup) ──

async function tallyBattleVolume(tournamentDayId: string) {
  const battle = await prisma.battle.findUnique({ where: { tournamentDayId } });
  if (!battle || battle.resolvedAt) return;

  const [volA, volB] = await Promise.all([
    countedVolume(battle.tokenAId, tournamentDayId),
    countedVolume(battle.tokenBId, tournamentDayId),
  ]);

  await prisma.battle.update({
    where: { id: battle.id },
    data: { volumeA: volA, volumeB: volB },
  });

  const day = await prisma.tournamentDay.findUnique({ where: { id: tournamentDayId } });
  if (day && day.endsAt <= new Date()) {
    const winnerTokenId = volA >= volB ? battle.tokenAId : battle.tokenBId;
    await prisma.battle.update({
      where: { id: battle.id },
      data: { winnerTokenId, resolvedAt: new Date() },
    });
  }
}

async function countedVolume(tokenId: string, tournamentDayId: string) {
  // Counted Volume = play credits staked on settled, non-voided predictions
  // for this token today. (Creator/linked-account exclusion can be added
  // once you're tracking device/IP fingerprints — schema has `voided` as
  // the hook for that.)
  const result = await prisma.prediction.aggregate({
    where: {
      voided: false,
      market: { tokenId, tournamentDayId, status: "SETTLED" },
    },
    _sum: { stake: true },
  });
  return result._sum.stake ?? 0;
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { getSessionUserId } from "@/lib/auth";
import { predictionRateLimit } from "@/lib/ratelimit";

const schema = z.object({
  marketId: z.string().cuid(),
  direction: z.enum(["UP", "DOWN"]),
  stake: z.number().int().positive().max(20000),
  idempotencyKey: z.string().min(10).max(128),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const { success } = await predictionRateLimit(userId);
  if (!success) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { marketId, direction, stake, idempotencyKey } = body.data;

  // Idempotency: if this exact key was already used, return the existing
  // prediction instead of creating a duplicate (handles double-tap/retry).
  const existing = await prisma.prediction.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return NextResponse.json({ ok: true, prediction: existing, deduped: true });
  }

  try {
    const prediction = await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({ where: { id: marketId } });
      if (!market) throw new Error("MARKET_NOT_FOUND");
      if (market.status !== "OPEN") throw new Error("PREDICTIONS_CLOSED");
      if (market.cutoffAt <= new Date()) throw new Error("PAST_CUTOFF");

      const day = await tx.tournamentDay.findUnique({ where: { id: market.tournamentDayId } });
      if (!day) throw new Error("MARKET_NOT_FOUND");

      // Balance check: 20,000 daily allocation minus everything staked
      // today (won-back credits from settled predictions count too).
      const stat = await tx.dailyStat.findUnique({
        where: { tournamentDayId_userId: { tournamentDayId: day.id, userId } },
      });
      const staked = await tx.prediction.aggregate({
        where: { userId, market: { tournamentDayId: day.id }, voided: false },
        _sum: { stake: true },
      });
      const wonBack = await tx.prediction.aggregate({
        where: { userId, market: { tournamentDayId: day.id }, voided: false, payout: { not: null } },
        _sum: { payout: true },
      });
      const available = 20000 - (staked._sum.stake ?? 0) + (wonBack._sum.payout ?? 0);

      if (stake > available) throw new Error("INSUFFICIENT_CREDITS");

      return tx.prediction.create({
        data: { marketId, userId, direction, stake, idempotencyKey },
      });
    });

    return NextResponse.json({ ok: true, prediction });
  } catch (err: any) {
    const message = err.message ?? "UNKNOWN_ERROR";
    const status = message === "INSUFFICIENT_CREDITS" || message === "PAST_CUTOFF" || message === "PREDICTIONS_CLOSED" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

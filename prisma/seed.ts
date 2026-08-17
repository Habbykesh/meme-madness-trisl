// Meme Madness Trial — seed script
// Run once before launch: `npx tsx prisma/seed.ts`
// This stages ALL 3 days' lineups + battles in advance.
// Nothing is decided live — the tick engine only ever reads these rows.

import { PrismaClient, TokenStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ── 1. Set your trial start date/time here (America/New_York recommended) ──
// Day windows: 20h active + 4h maintenance, back to back.
const TRIAL_START = new Date(process.env.TRIAL_START_DATE ?? "2026-08-24T05:00:00.000Z"); // 01:00 ET
const DAY_ACTIVE_HOURS = 20;
const DAY_TOTAL_HOURS = 24;

function dayWindow(dayNumber: number) {
  const startsAt = new Date(TRIAL_START.getTime() + (dayNumber - 1) * DAY_TOTAL_HOURS * 3600_000);
  const endsAt = new Date(startsAt.getTime() + DAY_ACTIVE_HOURS * 3600_000);
  return { startsAt, endsAt };
}

// ── 2. Token pool ──
// REPLACE the "REPLACE_WITH_REAL_CONTRACT_*" placeholders with real
// pump.fun contract addresses before launch. Do not go live with fakes —
// the market engine will fail closed (no data) rather than guess, so a
// bad address just means that token's markets never open, it won't crash.
const TOKENS = {
  pumpcade: { contractAddr: "Eg2ymQ2aQqjMcibnmTt8erC6Tvk9PVpJZCxvVPJz2agu", symbol: "PCADE", name: "Pumpcade (Cade Market)" },
  pepe:     { contractAddr: "FDqp7ioPenKRzQqseFv84kxDMUT83CX1qZxgDTQDkwT2",     symbol: "PEPE",  name: "Pepe" },
  doge:     { contractAddr: "97gUPNv41Xqz5prTcTqLdUrRxJj1PbUyfzUbZHQ4SNjs",     symbol: "DOGE",  name: "Doge" },
  wif:      { contractAddr: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",      symbol: "WIF",   name: "dogwifhat" },
  bonk:     { contractAddr: "TYv9vMFa8fw6QsUzFN3ap74zceGu61cYf2NvZzDbonk",     symbol: "BONK",  name: "Bonk" },
  popcat:   { contractAddr: "oobYwnWfmZks1hL7WMV4JPURKpTHVKC62dykRHxJy8A",   symbol: "POPCAT",name: "Popcat" },
  mew:      { contractAddr: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",      symbol: "MEW",   name: "cat in a dogs world" },
  giga:     { contractAddr: "63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9",     symbol: "GIGA",  name: "Gigachad" },
  // underdog pool — 6 tokens, 2 fresh challengers staged per day
  ud1: { contractAddr: "fjvllwkmf2xqedcbpgrnvwgpfczsrkfzabntfntwpump", symbol: "UDOG1", name: "Underdog Slot 1" },
  ud2: { contractAddr: "crrhwtqdpztzsvldvikd9tqnubwakbfz8vd5xxddtttu", symbol: "UDOG2", name: "Underdog Slot 2" },
  ud3: { contractAddr: "newkqpmzgxpb84zrduxhcveuprrk4wztcjyieraddnj", symbol: "UDOG3", name: "Underdog Slot 3" },
  ud4: { contractAddr: "cyz6sbpw9aca2wgxycjfxvduzedaigohxoppetor3ef", symbol: "UDOG4", name: "Underdog Slot 4" },
  ud5: { contractAddr: "7a6hgljh7cjvvdv6sxgrdkjiadl5sckmt7sehasxpump", symbol: "UDOG5", name: "Underdog Slot 5" },
  ud6: { contractAddr: "ammfxayhaqdgg3bzxterorh7ohx29umwagxeri1epump", symbol: "UDOG6", name: "Underdog Slot 6" },
};

// All-Stars are the same 8 across all 3 days (fixed roster, no rotation
// since lineups are pre-staged, not derived from Battle results).
const ALL_STAR_KEYS: (keyof typeof TOKENS)[] = [
  "pumpcade", "pepe", "doge", "wif", "bonk", "popcat", "mew", "giga",
];

// Two fresh Underdog challengers staged per day.
const UNDERDOG_SCHEDULE: Record<number, [keyof typeof TOKENS, keyof typeof TOKENS]> = {
  1: ["ud1", "ud2"],
  2: ["ud3", "ud4"],
  3: ["ud5", "ud6"],
};

async function main() {
  // Upsert all tokens
  const tokenRecords: Record<string, { id: string }> = {};
  for (const [key, t] of Object.entries(TOKENS)) {
    const record = await prisma.token.upsert({
      where: { contractAddr: t.contractAddr },
      update: {},
      create: {
        contractAddr: t.contractAddr,
        symbol: t.symbol,
        name: t.name,
        status: TokenStatus.ELIGIBLE,
      },
    });
    tokenRecords[key] = record;
  }

  for (let dayNumber = 1; dayNumber <= 3; dayNumber++) {
    const { startsAt, endsAt } = dayWindow(dayNumber);

    const day = await prisma.tournamentDay.upsert({
      where: { dayNumber },
      update: { startsAt, endsAt },
      create: { dayNumber, startsAt, endsAt },
    });

    // All-Star lineup rows
    for (const key of ALL_STAR_KEYS) {
      await prisma.tokenLineup.upsert({
        where: { tournamentDayId_tokenId: { tournamentDayId: day.id, tokenId: tokenRecords[key].id } },
        update: { role: TokenStatus.ALL_STAR },
        create: { tournamentDayId: day.id, tokenId: tokenRecords[key].id, role: TokenStatus.ALL_STAR },
      });
    }

    // Underdog lineup rows + Battle row for this day
    const [udA, udB] = UNDERDOG_SCHEDULE[dayNumber];
    for (const key of [udA, udB]) {
      await prisma.tokenLineup.upsert({
        where: { tournamentDayId_tokenId: { tournamentDayId: day.id, tokenId: tokenRecords[key].id } },
        update: { role: TokenStatus.UNDERDOG },
        create: { tournamentDayId: day.id, tokenId: tokenRecords[key].id, role: TokenStatus.UNDERDOG },
      });
    }

    await prisma.battle.upsert({
      where: { tournamentDayId: day.id },
      update: {},
      create: {
        tournamentDayId: day.id,
        tokenAId: tokenRecords[udA].id,
        tokenBId: tokenRecords[udB].id,
      },
    });

    console.log(`Day ${dayNumber}: ${startsAt.toISOString()} → ${endsAt.toISOString()} staged.`);
  }

  console.log("Seed complete. Remember to replace every REPLACE_WITH_REAL_CONTRACT_* address before launch.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

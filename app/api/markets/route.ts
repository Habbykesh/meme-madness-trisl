import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();

  const activeDay = await prisma.tournamentDay.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    include: {
      tokens: { include: { token: true } },
      battle: { include: { tokenA: true, tokenB: true } },
    },
  });

  if (!activeDay) {
    return NextResponse.json({ active: false, serverTime: now.toISOString() });
  }

  const markets = await prisma.market.findMany({
    where: { tournamentDayId: activeDay.id, status: { in: ["OPEN", "PREDICTIONS_CLOSED"] } },
    include: { token: true },
    orderBy: { settlesAt: "asc" },
  });

  return NextResponse.json({
    active: true,
    serverTime: now.toISOString(), // client MUST sync countdowns to this, never its own clock
    dayNumber: activeDay.dayNumber,
    endsAt: activeDay.endsAt,
    lineup: activeDay.tokens.map((t) => ({ token: t.token, role: t.role })),
    battle: activeDay.battle,
    markets,
  });
}

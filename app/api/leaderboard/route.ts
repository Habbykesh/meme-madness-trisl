import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis, LEADERBOARD_KEY, LEADERBOARD_OVERALL_KEY } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "today"; // "today" | "overall"
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 100);

  let key: string;
  if (scope === "overall") {
    key = LEADERBOARD_OVERALL_KEY;
  } else {
    const activeDay = await prisma.tournamentDay.findFirst({
      where: { startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
    });
    if (!activeDay) return NextResponse.json({ entries: [] });
    key = LEADERBOARD_KEY(activeDay.id);
  }

  // highest first, with scores — ioredis: zrevrange(key, start, stop, "WITHSCORES")
  const raw = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");

  const entries: { userId: string; netCreditsWon: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ userId: raw[i] as string, netCreditsWon: Number(raw[i + 1]) });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: entries.map((e) => e.userId) } },
    select: { id: true, username: true },
  });
  const usernameById = new Map(users.map((u) => [u.id, u.username]));

  return NextResponse.json({
    entries: entries.map((e, i) => ({
      rank: i + 1,
      username: usernameById.get(e.userId) ?? "unknown",
      netCreditsWon: e.netCreditsWon,
    })),
  });
}

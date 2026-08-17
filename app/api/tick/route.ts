import { NextRequest, NextResponse } from "next/server";
import { runTick } from "@/lib/market-engine";

// Called by cron-job.org (or similar free pinger) every ~1 minute.
// Protected by a shared secret so randoms can't trigger settlement early.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TICK_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runTick();
  return NextResponse.json(result);
}

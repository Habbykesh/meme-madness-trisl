import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, normalizeUsername } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const body = schema.safeParse(await req.json());

  if (!body.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const { username, password } = body.data;

  // 5 attempts per 5 minutes per IP — slows down password guessing.
  const { success } = await checkRateLimit(`login:${ip}`, 5, 300);
  if (!success) {
    return NextResponse.json({ error: "too many attempts, try again later" }, { status: 429 });
  }

  const usernameLower = normalizeUsername(username);
  const user = await prisma.user.findUnique({ where: { usernameLower } });

  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "incorrect username or password" }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}

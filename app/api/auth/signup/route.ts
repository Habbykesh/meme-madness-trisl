import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, isUsernameBlocked, normalizeUsername } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore only"),
  email: z.string().email(),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "invalid input" }, { status: 400 });
  }

  const { username, email, password } = body.data;

  if (isUsernameBlocked(username)) {
    return NextResponse.json({ error: "that username isn't available" }, { status: 400 });
  }

  const usernameLower = normalizeUsername(username);

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { usernameLower }] } });
  if (existing) {
    return NextResponse.json({ error: "username or email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { username, usernameLower, email, passwordHash },
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { createMagicLink, isUsernameBlocked, normalizeUsername } from "@/lib/auth";
import { magicLinkRateLimit } from "@/lib/ratelimit";
import { sendMagicLinkEmail } from "@/lib/email";

const schema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore only"),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const body = schema.safeParse(await req.json());

  if (!body.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const { username, email } = body.data;

  const { success } = await magicLinkRateLimit(`${ip}:${email}`);
  if (!success) {
    return NextResponse.json({ error: "too many requests, try again later" }, { status: 429 });
  }

  if (isUsernameBlocked(username)) {
    return NextResponse.json({ error: "that username isn't available" }, { status: 400 });
  }

  // Existing account with this email → send them a link for their real
  // username instead of letting a duplicate identity form.
  const existingByEmail = await prisma.user.findUnique({ where: { email } });

  if (existingByEmail) {
    const raw = await createMagicLink(existingByEmail.id);
    await sendMagicLinkEmail(email, existingByEmail.username, raw);
    return NextResponse.json({ ok: true });
  }

  const usernameLower = normalizeUsername(username);
  const usernameTaken = await prisma.user.findUnique({ where: { usernameLower } });
  if (usernameTaken) {
    return NextResponse.json({ error: "username already taken" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { username, usernameLower, email },
  });

  const raw = await createMagicLink(user.id);
  await sendMagicLinkEmail(email, username, raw);

  return NextResponse.json({ ok: true });
}

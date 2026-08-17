import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const MAGIC_LINK_TTL_MIN = 15;
const SESSION_TTL_DAYS = 7;

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

// ── Magic link ───────────────────────────────────────

export async function createMagicLink(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const token = hashToken(raw); // store only the hash, never the raw token
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60_000);

  await prisma.magicToken.create({ data: { token, userId, expiresAt } });

  // raw is what goes in the email link; token (hash) is what's stored.
  return raw;
}

export async function verifyMagicLink(raw: string) {
  const token = hashToken(raw);

  const record = await prisma.magicToken.findUnique({ where: { token } });
  if (!record) return { ok: false as const, reason: "invalid" as const };
  if (record.usedAt) return { ok: false as const, reason: "used" as const };
  if (record.expiresAt < new Date()) return { ok: false as const, reason: "expired" as const };

  // single-use: mark consumed regardless of what happens next
  await prisma.magicToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  return { ok: true as const, userId: record.userId };
}

// ── Session cookie (signed JWT, httpOnly) ───────────

export async function createSession(userId: string) {
  const jwt = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(SESSION_SECRET);

  const store = await cookies();
  store.set("session", jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 3600,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const jwt = store.get("session")?.value;
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, SESSION_SECRET);
    return (payload.userId as string) ?? null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete("session");
}

// ── Username normalization ──────────────────────────

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "mod", "moderator", "support", "staff",
  "meme-madness", "mememadness", "cade", "pumpcade", "root", "system",
]);

export function isUsernameBlocked(username: string) {
  return RESERVED_USERNAMES.has(normalizeUsername(username));
}

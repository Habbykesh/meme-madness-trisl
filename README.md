# Meme Madness Trial

Unofficial 3-day fan trial. Not affiliated with Cade Market Inc. Virtual credits only.

## What's built

- Full Prisma schema (auth, tournament days, pre-staged lineups, battles, markets, predictions, stats)
- Seed script — stages all 3 days' rosters + battles in advance, zero live admin work required
- Magic link auth (username + email, no password), case-insensitive unique usernames
- Stateless market tick engine (`/api/tick`) — open/close/settle markets, fail-closed on bad data
- Atomic, idempotent, rate-limited prediction placement
- Redis-backed leaderboard (daily + overall)
- Automatic Battle Mode volume tally (display-only, doesn't mutate lineup)
- Music player: shuffles your 3 tracks, auto-starts 5s after sign-in with a tap-to-enable fallback
- Disclaimer footer on every page

## What's still on you before launch

1. **Real token contract addresses.** Every token in `prisma/seed.ts` has a `REPLACE_WITH_REAL_CONTRACT_*` placeholder — including Pumpcade's, which I don't have. Swap all of these before seeding.
2. **Market data provider.** `lib/market-data.ts` has two empty stub functions (`fetchFromPrimary`/`fetchFromSecondary`). Wire up DexScreener, Birdeye, or your provider of choice — this is the one piece I can't pick for you without knowing your API access.
3. **Resend sending domain.** `lib/email.ts` has a placeholder `from` address — needs your verified domain.
4. **Payout model.** Settlement currently pays a flat 2x on a correct prediction (`market-engine.ts`, `settleDueMarkets`). That's a placeholder — swap in true pari-mutuel pool splitting if you want dynamic odds instead of fixed 2x.
5. **cron-job.org setup**: point it at `POST https://your-app.vercel.app/api/tick` every 1 minute, with header `Authorization: Bearer <TICK_SECRET>`.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Deploy

- Push to Vercel (Hobby plan) — set all `.env` vars in the Vercel dashboard
- Railway Postgres — separate project from LeagueHQ, run migrations against it
- Railway Redis — add the Redis plugin to that same Railway project, copy `REDIS_URL` from its connection tab
- Resend — free tier, verify a sending domain
- cron-job.org — free, hits `/api/tick` every minute

**Note on Railway Redis + Vercel serverless**: each Vercel function invocation is short-lived, and `ioredis` holds a persistent TCP connection. At 1K-user scale this is fine, but if you ever see connection-limit errors in Railway's logs, it means too many serverless invocations are opening connections faster than Railway's plan allows — the fix would be switching to a REST-based Redis (like Upstash) which doesn't hold a connection open between requests. Not a concern to solve now, just something to know if it comes up.

## On the music autoplay behavior

Mobile Safari and some desktop browsers can still block audio 5 seconds
after the triggering click, since the "user gesture" that permits autoplay
has a short shelf life. The player tries the auto-start first; if the
browser blocks it, a small "🔊 Tap for sound" button appears instead of
failing silently. This is a browser platform limit, not something any
code can fully guarantee around — the fallback is the honest fix.

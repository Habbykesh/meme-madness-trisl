import Redis from "ioredis";

// Railway gives you a single REDIS_URL connection string (redis://...).
// Singleton pattern, same reasoning as the Prisma client — avoid opening
// a fresh TCP connection on every hot-reload in dev / every cold start
// in production.
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL!);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export const LEADERBOARD_KEY = (tournamentDayId: string) => `lb:day:${tournamentDayId}`;
export const LEADERBOARD_OVERALL_KEY = "lb:overall";

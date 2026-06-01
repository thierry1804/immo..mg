import { Redis, type RedisOptions } from "ioredis";

function parseRedisUrl(): RedisOptions {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const redisConnection: RedisOptions = parseRedisUrl();

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis: Redis =
  globalForRedis.redis ?? new Redis(redisConnection);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

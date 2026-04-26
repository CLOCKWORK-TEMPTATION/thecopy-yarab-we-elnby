import { logger } from "@/lib/logger";

const REDIS_ENABLED = process.env["REDIS_ENABLED"] === "true";
const REDIS_URL = process.env["REDIS_URL"];
const DEFAULT_CACHE_TTL_SECONDS = 3600;

interface RedisCacheClient {
  connect: () => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    options?: { EX?: number }
  ) => Promise<unknown>;
  del: (keyOrKeys: string | string[]) => Promise<unknown>;
  keys: (pattern: string) => Promise<string[]>;
  on: (event: "error", listener: (error: Error) => void) => RedisCacheClient;
}

let redisClientPromise: Promise<RedisCacheClient | null> | null = null;

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

async function createRedisClient(): Promise<RedisCacheClient | null> {
  if (!REDIS_ENABLED || typeof window !== "undefined") {
    return null;
  }

  if (!REDIS_URL) {
    throw new Error("REDIS_URL must be set when REDIS_ENABLED=true");
  }

  const { createClient } = await import("redis");
  const client = createClient({
    url: REDIS_URL,
  }) as unknown as RedisCacheClient;
  client.on("error", (error) => {
    logger.error({ error }, "Redis client error");
  });
  await client.connect();
  return client;
}

async function getRedisClient(): Promise<RedisCacheClient | null> {
  redisClientPromise ??= createRedisClient();
  return redisClientPromise;
}

function parseCachedValue<T>(value: string): T {
  return JSON.parse(value) as T;
}

/**
 * Generate a cache key for Gemini API calls
 */
export function generateGeminiCacheKey(
  prompt: string,
  model: string,
  options?: Record<string, unknown>
): string {
  const hash = Buffer.from(JSON.stringify({ prompt, model, options })).toString(
    "base64"
  );
  return `gemini:${model}:${hash}`;
}

/**
 * Cached Gemini API call.
 */
export async function cachedGeminiCall<T>(
  keyOrCallFn: string | (() => Promise<T>),
  maybeCallFn?: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const callFn = typeof keyOrCallFn === "function" ? keyOrCallFn : maybeCallFn;
  const cacheKey = typeof keyOrCallFn === "string" ? keyOrCallFn : null;

  if (!callFn) {
    throw new Error("cachedGeminiCall requires a function to execute");
  }

  if (!cacheKey) {
    return callFn();
  }

  try {
    const cached = await getCached<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await callFn();
    await setCached(cacheKey, result, options);
    return result;
  } catch (error) {
    logger.warn(
      { error, cacheKey },
      "Redis cache failed; executing Gemini call directly"
    );
    return callFn();
  }
}

/**
 * Get cached value.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const value = await client.get(key);
  return value === null ? null : parseCachedValue<T>(value);
}

/**
 * Set cached value.
 */
export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), {
    EX: options.ttl ?? DEFAULT_CACHE_TTL_SECONDS,
  });
}

/**
 * Invalidate cache.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  const keys = await client.keys(pattern);
  if (keys.length === 0) {
    return;
  }

  await client.del(keys);
}

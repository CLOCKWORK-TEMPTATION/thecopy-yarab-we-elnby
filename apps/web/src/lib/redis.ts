/**
 * Redis caching utilities
 *
 * NOTE: This is a STUB implementation for development.
 * In production, connect to actual Redis instance by:
 * 1. Set REDIS_ENABLED=true in environment
 * 2. Provide REDIS_URL connection string
 * 3. Implement actual Redis client connection below
 *
 * Current behavior: Caching is DISABLED - all calls pass through
 */

// Development flag - set to true and implement Redis client for production
const REDIS_ENABLED = process.env["REDIS_ENABLED"] === "true";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

/**
 * Generate a cache key for Gemini API calls
 */
export function generateGeminiCacheKey(
  prompt: string,
  model: string,
  options?: Record<string, any>
): string {
  const hash = Buffer.from(JSON.stringify({ prompt, model, options })).toString(
    "base64"
  );
  return `gemini:${model}:${hash}`;
}

/**
 * Cached Gemini API call
 *
 * DEV STUB: Currently bypasses caching completely
 * TODO PRODUCTION: Implement Redis connection and caching logic
 */
export async function cachedGeminiCall<T>(
  keyOrCallFn: string | (() => Promise<T>),
  maybeCallFn?: () => Promise<T>,
  _options?: CacheOptions
): Promise<T> {
  const callFn = typeof keyOrCallFn === "function" ? keyOrCallFn : maybeCallFn;

  if (!callFn) {
    throw new Error("cachedGeminiCall requires a function to execute");
  }

  if (!REDIS_ENABLED) {
    // Development mode: no caching
    return callFn();
  }

  // TODO PRODUCTION: Implement actual Redis caching
  // 1. Check Redis for existing cache with key
  // 2. If found, return cached value
  // 3. If not found, call callFn(), cache result, return value
  // Example:
  // const cached = await redisClient.get(key);
  // if (cached) return JSON.parse(cached);
  // const result = await callFn();
  // await redisClient.setex(key, options?.ttl || 3600, JSON.stringify(result));
  // return result;

  return callFn();
}

/**
 * Get cached value
 *
 * DEV STUB: Always returns null
 * TODO PRODUCTION: Implement Redis get operation
 */
export async function getCached<T>(_key: string): Promise<T | null> {
  if (!REDIS_ENABLED) {
    return null;
  }

  // TODO PRODUCTION: Implement actual Redis get
  // const value = await redisClient.get(key);
  // return value ? JSON.parse(value) : null;

  return null;
}

/**
 * Set cached value
 *
 * DEV STUB: No-op function
 * TODO PRODUCTION: Implement Redis set operation
 */
export async function setCached<T>(
  _key: string,
  _value: T,
  _options?: CacheOptions
): Promise<void> {
  if (!REDIS_ENABLED) {
    return;
  }

  // TODO PRODUCTION: Implement actual Redis set
  // const ttl = options?.ttl || 3600;
  // await redisClient.setex(key, ttl, JSON.stringify(value));
}

/**
 * Invalidate cache
 *
 * DEV STUB: No-op function
 * TODO PRODUCTION: Implement Redis pattern-based deletion
 */
export async function invalidateCache(_pattern: string): Promise<void> {
  if (!REDIS_ENABLED) {
    return;
  }

  // TODO PRODUCTION: Implement actual Redis invalidation
  // const keys = await redisClient.keys(pattern);
  // if (keys.length > 0) {
  //   await redisClient.del(...keys);
  // }
}

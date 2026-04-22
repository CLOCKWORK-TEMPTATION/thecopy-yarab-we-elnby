/**
 * Cache Middleware for Next.js API Routes
 *
 * Provides caching layer for API responses with Redis
 */

import { NextRequest, NextResponse } from "next/server";
import { getCached, setCached, invalidateCache } from "@/lib/redis";

export interface CacheOptions {
  /** Cache key prefix */
  keyPrefix?: string;
  /** Time to live in seconds */
  ttl?: number;
  /** Skip cache for certain conditions */
  shouldCache?: (request: NextRequest) => boolean;
  /** Generate custom cache key */
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * Generates a cache key from request
 */
function generateCacheKey(
  request: NextRequest,
  prefix: string = "api"
): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;
  const method = request.method;

  // Include request method and query params in cache key
  return `${prefix}:${method}:${pathname}${search}`;
}

/**
 * Cache wrapper for API route handlers
 */
export function withCache<T = any>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  options: CacheOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const {
      keyPrefix = "api",
      ttl = 3600, // 1 hour default
      shouldCache = () => request.method === "GET",
      keyGenerator = (req) => generateCacheKey(req, keyPrefix),
    } = options;

    // Only cache GET requests by default
    if (!shouldCache(request)) {
      return handler(request);
    }

    const cacheKey = keyGenerator(request);

    try {
      // Try to get from cache
      const cached = await getCached<T>(cacheKey);

      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
          },
        }) as NextResponse<T>;
      }

      // If not in cache, execute handler
      const response = await handler(request);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const data = await response.json();
        await setCached(cacheKey, data, { ttl });
        return NextResponse.json(data, {
          headers: {
            "X-Cache": "MISS",
            "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
          },
        }) as NextResponse<T>;
      }

      return response as NextResponse<T>;
    } catch {
      // If caching fails, execute handler normally
      const response = await handler(request);

      // Add cache miss header
      const headers = new Headers(response.headers);
      headers.set("X-Cache", "MISS");

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  };
}

/**
 * Invalidate cache for a specific pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  await invalidateCache(pattern);
}

/**
 * Common cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
} as const;

export default withCache;

/**
 * Gemini API Caching Strategies
 *
 * Advanced caching strategies specific to Gemini API calls:
 * - Intelligent cache key generation
 * - Dynamic TTL based on content type
 * - Cache warming for frequent requests
 * - Stale-while-revalidate pattern
 * - Adaptive caching based on hit rates
 */

import { cacheService } from './cache.service';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

/**
 * Cache TTL configuration by analysis type (in seconds)
 */
export const GEMINI_CACHE_TTL = {
  // Character analysis changes rarely - cache for 2 hours
  characters: 7200,

  // Theme analysis is relatively stable - cache for 1 hour
  themes: 3600,

  // Structure analysis is stable - cache for 1 hour
  structure: 3600,

  // Screenplay review may change with edits - cache for 30 minutes
  screenplay: 1800,

  // Quick analysis - cache for 20 minutes
  quick: 1200,

  // Detailed analysis - cache for 2 hours
  detailed: 7200,

  // Full project analysis - cache for 4 hours
  full: 14400,

  // Chat responses - cache for 30 minutes (conversational)
  chat: 1800,

  // Shot suggestions - cache for 1 hour (creative but stable)
  'shot-suggestion': 3600,

  // Default fallback - 30 minutes
  default: 1800,
} as const;

/**
 * Cache key prefixes for different Gemini operations
 */
export const GEMINI_CACHE_PREFIX = {
  analysis: 'gemini:analysis',
  screenplay: 'gemini:screenplay',
  scene: 'gemini:scene',
  character: 'gemini:character',
  shot: 'gemini:shot',
  project: 'gemini:project',
  chat: 'gemini:chat',
  'shot-suggestion': 'gemini:shot-suggestion',
} as const;

/**
 * Generate optimized cache key for Gemini API calls
 */
export function generateGeminiCacheKey(
  prefix: keyof typeof GEMINI_CACHE_PREFIX,
  params: {
    text?: string;
    analysisType?: string;
    entityId?: string;
    options?: Record<string, any>;
    message?: string;
    context?: any;
    sceneDescription?: string;
    shotType?: string;
  }
): string {
  const keyPrefix = GEMINI_CACHE_PREFIX[prefix];

  // For entity-based queries (scene, character, shot, project)
  if (params.entityId) {
    const optionsHash = params.options
      ? crypto.createHash('sha256').update(JSON.stringify(params.options)).digest('hex').substring(0, 8)
      : '';

    return `${keyPrefix}:${params.entityId}:${params.analysisType || 'default'}${optionsHash ? `:${optionsHash}` : ''}`;
  }

  // For text-based analysis
  if (params.text) {
    // Generate deterministic hash of text
    const textHash = crypto
      .createHash('sha256')
      .update(params.text)
      .digest('hex')
      .substring(0, 16);

    return `${keyPrefix}:${params.analysisType || 'default'}:${textHash}`;
  }

  // For chat messages
  if (params.message) {
    const messageHash = crypto
      .createHash('sha256')
      .update(params.message)
      .digest('hex')
      .substring(0, 16);

    const contextHash = params["context"]
      ? crypto.createHash('sha256').update(JSON.stringify(params["context"])).digest('hex').substring(0, 8)
      : '';

    return `${keyPrefix}:${messageHash}${contextHash ? `:${contextHash}` : ''}`;
  }

  // For shot suggestions
  if (params.sceneDescription) {
    const sceneHash = crypto
      .createHash('sha256')
      .update(params.sceneDescription)
      .digest('hex')
      .substring(0, 16);

    return `${keyPrefix}:${params.shotType || 'default'}:${sceneHash}`;
  }

  // Fallback to generic key
  return cacheService.generateKey(keyPrefix, params);
}

/**
 * Get TTL for specific analysis type
 */
export function getGeminiCacheTTL(analysisType?: string): number {
  if (!analysisType) {
    return GEMINI_CACHE_TTL.default;
  }

  const ttl = GEMINI_CACHE_TTL[analysisType as keyof typeof GEMINI_CACHE_TTL];
  return ttl || GEMINI_CACHE_TTL.default;
}

/**
 * Cache wrapper for Gemini API calls with stale-while-revalidate
 */
export async function cachedGeminiCall<T>(
  cacheKey: string,
  ttl: number,
  apiCall: () => Promise<T>,
  options?: {
    staleWhileRevalidate?: boolean;
    staleTTL?: number;
  }
): Promise<T> {
  // Try to get from cache
  const cached = await cacheService.get<T>(cacheKey);

  if (cached) {
    logger.debug(`Gemini cache hit: ${cacheKey}`);
    return cached;
  }

  // If stale-while-revalidate is enabled, check for stale data
  if (options?.staleWhileRevalidate) {
    const staleKey = `${cacheKey}:stale`;
    const stale = await cacheService.get<T>(staleKey);

    if (stale) {
      logger.debug(`Serving stale data while revalidating: ${cacheKey}`);

      // Revalidate in background (don't await)
      apiCall()
        .then(async (fresh) => {
          await cacheService.set(cacheKey, fresh, ttl);
          await cacheService.set(staleKey, fresh, options.staleTTL || ttl * 2);
          logger.debug(`Revalidated cache: ${cacheKey}`);
        })
        .catch((error) => {
          logger.error(`Failed to revalidate cache: ${cacheKey}`, error);
        });

      return stale;
    }
  }

  // Cache miss - call API
  logger.debug(`Gemini cache miss: ${cacheKey}`);

  try {
    const result = await apiCall();

    // Store in cache
    await cacheService.set(cacheKey, result, ttl);

    // If stale-while-revalidate, also store in stale cache
    if (options?.staleWhileRevalidate) {
      const staleKey = `${cacheKey}:stale`;
      await cacheService.set(staleKey, result, options.staleTTL || ttl * 2);
    }

    return result;
  } catch (error) {
    logger.error(`Gemini API call failed: ${cacheKey}`, error);
    throw error;
  }
}

/**
 * Warm cache for frequently accessed entities
 */
export async function warmGeminiCache(
  entities: Array<{
    type: 'scene' | 'character' | 'shot' | 'project';
    id: string;
    analysisType: string;
  }>,
  processor: (entity: { type: string; id: string; analysisType: string }) => Promise<any>
): Promise<void> {
  logger.info(`Warming cache for ${entities.length} entities`);

  // Process in batches to avoid overwhelming API
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 2000; // 2 seconds between batches

  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (entity) => {
        const cacheKey = generateGeminiCacheKey(entity.type, {
          entityId: entity.id,
          analysisType: entity.analysisType,
        });

        // Check if already cached
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.debug(`Cache already warm: ${cacheKey}`);
          return;
        }

        try {
          // Process and cache
          const result = await processor(entity);
          const ttl = getGeminiCacheTTL(entity.analysisType);
          await cacheService.set(cacheKey, result, ttl);

          logger.debug(`Cache warmed: ${cacheKey}`);
        } catch (error) {
          logger.error(`Failed to warm cache for ${cacheKey}:`, error);
        }
      })
    );

    // Delay between batches
    if (i + BATCH_SIZE < entities.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  logger.info('Cache warming completed');
}

/**
 * Invalidate cache for specific entity
 */
export async function invalidateGeminiCache(
  type: keyof typeof GEMINI_CACHE_PREFIX,
  entityId: string
): Promise<void> {
  const pattern = `${GEMINI_CACHE_PREFIX[type]}:${entityId}`;
  await cacheService.clear(pattern);
  logger.info(`Invalidated cache for: ${pattern}`);
}

/**
 * Get cache statistics for Gemini operations
 */
export async function getGeminiCacheStats(): Promise<{
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  redisStatus: string;
}> {
  const stats = cacheService.getStats();

  return {
    totalHits: stats.metrics.hits.total,
    totalMisses: stats.metrics.misses,
    hitRate: stats.hitRate,
    redisStatus: stats.redisStatus,
  };
}

/**
 * Adaptive TTL: Adjust TTL based on cache hit rate
 * If hit rate is high, increase TTL. If low, decrease TTL.
 */
export function getAdaptiveTTL(baseAnalysisType: string, hitRate: number): number {
  const baseTTL = getGeminiCacheTTL(baseAnalysisType);

  // If hit rate > 80%, increase TTL by 50%
  if (hitRate > 80) {
    return Math.min(baseTTL * 1.5, 28800); // Max 8 hours
  }

  // If hit rate < 30%, decrease TTL by 30%
  if (hitRate < 30) {
    return Math.max(baseTTL * 0.7, 600); // Min 10 minutes
  }

  // Otherwise, use base TTL
  return baseTTL;
}

/**
 * Simple wrapper for cached analysis operations
 * Returns both data and cache status
 *
 * @example
 * const result = await analyzeWithCache(
 *   'analysis:user123',
 *   3600,
 *   () => performExpensiveAnalysis()
 * );
 * console.log('Cached:', result.cached);
 */
export async function analyzeWithCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  try {
    // Try to get from cache
    const cached = await cacheService.get<T>(key);

    if (cached) {
      logger.debug(`✅ Cache HIT: ${key}`);
      return {
        data: cached,
        cached: true,
      };
    }

    // Cache MISS - fetch fresh data
    logger.debug(`❌ Cache MISS: ${key}`);
    const data = await fetchFn();

    // Store in cache
    await cacheService.set(key, data, ttl);

    return {
      data,
      cached: false,
    };
  } catch (error) {
    logger.error(`Cache operation error for ${key}, falling back to direct fetch:`, error);
    // In case of cache error, fall back to direct fetch
    const data = await fetchFn();
    return { data, cached: false };
  }
}

/**
 * Analyze text with automatic cache key generation
 * Convenience wrapper around analyzeWithCache
 */
export async function analyzeTextWithCache<T>(
  text: string,
  analysisType: string,
  analyzeFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const cacheKey = generateGeminiCacheKey('analysis', { text, analysisType });
  const ttl = getGeminiCacheTTL(analysisType);

  return analyzeWithCache(cacheKey, ttl, analyzeFn);
}

export default {
  generateGeminiCacheKey,
  getGeminiCacheTTL,
  cachedGeminiCall,
  warmGeminiCache,
  invalidateGeminiCache,
  getGeminiCacheStats,
  getAdaptiveTTL,
  analyzeWithCache,
  analyzeTextWithCache,
};

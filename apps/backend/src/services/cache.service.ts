
/**
 * Multi-Layer Cache Service
 *
 * Implements a two-tier caching strategy:
 * - L1: In-memory LRU cache for ultra-fast access
 * - L2: Redis cache for persistence and distributed caching
 *
 * Features:
 * - Automatic fallback to L1 if Redis is unavailable
 * - TTL (Time To Live) support
 * - Stale-while-revalidate pattern
 * - Cache key generation with hashing
 * - Metrics tracking (hit/miss rates, Redis health)
 * - Sentry performance monitoring integration
 */

import crypto from 'crypto';

import * as Sentry from '@sentry/node';

import { env } from '@/config/env';
import { isRedisEnabled } from '@/config/redis-gate';
import { logger } from '@/lib/logger';

import { buildRedisClient } from './cache-redis-init';
import type { CacheEntry, CacheMetrics, RedisClientInstance, RedisOperation } from './cache.types';

const sentryEnabled = Boolean(env.SENTRY_DSN);

export class CacheService {
  private redis: RedisClientInstance | null = null;
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private readonly MAX_MEMORY_CACHE_SIZE = 100; // Maximum items in L1 cache
  private readonly DEFAULT_TTL = 1800; // 30 minutes in seconds
  private readonly MAX_TTL = 86400; // 24 hours maximum
  private readonly MAX_VALUE_SIZE = 1024 * 1024; // 1MB maximum value size
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metrics: CacheMetrics = {
    hits: {
      l1: 0,
      l2: 0,
      total: 0,
    },
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    redisConnectionHealth: {
      status: 'disconnected',
      lastCheck: Date.now(),
      consecutiveFailures: 0,
    },
  };

  constructor() {
    if (isRedisEnabled()) {
      this.initializeRedis();
    } else {
      logger.info('Cache operating in L1-only mode — Redis is disabled');
    }
    this.startMemoryCacheCleanup();
  }

  /**
   * Initialize Redis connection with Sentinel support and retry strategy.
   * Config building and client creation delegated to cache-redis-init.
   */
  private initializeRedis(): void {
    try {
      const redisClient = buildRedisClient({
        onError: (error: Error) => {
          logger.warn('Redis connection error, falling back to memory cache:', error.message);
          this.updateRedisHealth('error');
          this.metrics.errors++;

          if (sentryEnabled) {
            Sentry.captureException(error, {
              tags: { component: 'cache-service', layer: 'redis' },
              level: 'warning',
            });
          }
        },
        onConnect: () => {
          logger.info('Redis cache connected successfully');
          this.updateRedisHealth('connected');
        },
        onEnd: () => {
          logger.warn('Redis connection closed');
          this.updateRedisHealth('disconnected');
        },
      });

      this.redis = redisClient;

      redisClient.connect().catch((error: Error) => {
        logger.warn('Redis initial connection failed, using memory cache only:', error.message);
        this.updateRedisHealth('error');
        this.redis = null;
      });
    } catch (error) {
      logger.warn('Redis initialization failed, using memory cache only:', error);
      this.updateRedisHealth('error');
      this.redis = null;
      this.metrics.errors++;
    }
  }

  /**
   * Update Redis connection health status
   */
  private updateRedisHealth(status: 'connected' | 'disconnected' | 'error'): void {
    this.metrics.redisConnectionHealth.status = status;
    this.metrics.redisConnectionHealth.lastCheck = Date.now();

    if (status === 'error' || status === 'disconnected') {
      this.metrics.redisConnectionHealth.consecutiveFailures++;
    } else {
      this.metrics.redisConnectionHealth.consecutiveFailures = 0;
    }
  }

  /**
   * Check if Redis is available for operations
   */
  private isRedisAvailable(): boolean {
    return this.redis?.isOpen === true;
  }

  /**
   * Execute a Redis operation with error handling and metrics tracking.
   * Returns null if Redis is unavailable or the operation fails.
   */
  private async executeRedisOperation<T>(
    operation: RedisOperation<T>,
    operationName: string
  ): Promise<T | null> {
    if (!this.isRedisAvailable()) {
      return null;
    }

    try {
      const result = await operation();
      this.updateRedisHealth('connected');
      return result;
    } catch (error) {
      logger.error(`Redis ${operationName} error:`, error);
      this.metrics.errors++;
      this.updateRedisHealth('error');
      this.captureError(error, operationName, 'redis');
      return null;
    }
  }

  /**
   * Capture error to Sentry if configured
   */
  private captureError(error: unknown, operation: string, layer?: string): void {
    if (!sentryEnabled) return;

    Sentry.captureException(error, {
      tags: {
        component: 'cache-service',
        operation,
        ...(layer && { layer }),
      },
      level: 'warning',
    });
  }

  /**
   * Check if an L1 cache entry is still valid (not expired)
   */
  private isEntryValid(entry: CacheEntry<unknown>): boolean {
    const age = Date.now() - entry.timestamp;
    const maxAge = entry.ttl * 1000;
    return age < maxAge;
  }

  /**
   * Validate and normalize TTL value
   */
  private normalizeTTL(ttl: number): number {
    if (ttl <= 0 || ttl > this.MAX_TTL) {
      logger.warn(`Invalid TTL ${ttl}, using default: ${this.DEFAULT_TTL}`);
      return this.DEFAULT_TTL;
    }
    return ttl;
  }

  /**
   * Check if value size is within limits
   */
  private isValueSizeValid(serialized: string): boolean {
    if (serialized.length > this.MAX_VALUE_SIZE) {
      logger.warn(`Value too large (${serialized.length} bytes), skipping cache`);
      return false;
    }
    return true;
  }

  /**
   * Generate a cache key from prefix and data
   */
  generateKey(prefix: string, data: unknown): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache (L1 -> L2 -> null)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const l1Result = this.getFromL1Cache<T>(key);
      if (l1Result !== null) {
        return l1Result;
      }

      const l2Result = await this.getFromL2Cache<T>(key);
      if (l2Result !== null) {
        return l2Result;
      }

      logger.debug(`Cache miss: ${key}`);
      this.metrics.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      this.metrics.errors++;
      this.captureError(error, 'get');
      return null;
    }
  }

  /**
   * Attempt to get value from L1 (memory) cache
   */
  private getFromL1Cache<T>(key: string): T | null {
    const memEntry = this.memoryCache.get(key);
    if (!memEntry) {
      return null;
    }

    if (this.isEntryValid(memEntry)) {
      logger.debug(`Cache hit (L1): ${key}`);
      this.metrics.hits.l1++;
      this.metrics.hits.total++;
      return memEntry.data as T;
    }

    this.memoryCache.delete(key);
    return null;
  }

  /**
   * Attempt to get value from L2 (Redis) cache
   */
  private async getFromL2Cache<T>(key: string): Promise<T | null> {
    const value = await this.executeRedisOperation(
      () => this.redis!.get(key),
      'get'
    );

    if (!value || typeof value !== 'string') {
      return null;
    }

    logger.debug(`Cache hit (L2): ${key}`);
    const parsed = JSON.parse(value) as T;

    // Populate L1 cache for faster subsequent access
    this.setMemoryCache(key, parsed, this.DEFAULT_TTL);

    this.metrics.hits.l2++;
    this.metrics.hits.total++;
    return parsed;
  }

  /**
   * Set value in cache (L1 + L2)
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const normalizedTTL = this.normalizeTTL(ttl);
      const serialized = JSON.stringify(value);

      if (!this.isValueSizeValid(serialized)) {
        return;
      }

      this.setMemoryCache(key, value, normalizedTTL);

      const redisSuccess = await this.setInL2Cache(key, serialized, normalizedTTL);
      const layer = redisSuccess ? 'L1+L2' : 'L1 only';

      logger.debug(`Cache set (${layer}): ${key}, TTL: ${normalizedTTL}s`);
      this.metrics.sets++;
    } catch (error) {
      logger.error('Cache set error:', error);
      this.metrics.errors++;
      this.captureError(error, 'set');
    }
  }

  /**
   * Attempt to set value in L2 (Redis) cache.
   * Returns true if successful, false otherwise.
   */
  private async setInL2Cache(key: string, serialized: string, ttl: number): Promise<boolean> {
    const result = await this.executeRedisOperation(
      () => this.redis!.setEx(key, ttl, serialized),
      'set'
    );
    return result !== null;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);

      await this.executeRedisOperation(
        () => this.redis!.del(key),
        'delete'
      );

      this.metrics.deletes++;
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.metrics.errors++;
      this.captureError(error, 'delete');
    }
  }

  /**
   * Clear all cache or entries matching a pattern
   */
  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        await this.clearByPattern(pattern);
      } else {
        await this.clearAll();
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
      this.captureError(error, 'clear');
    }
  }

  private async clearByPattern(pattern: string): Promise<void> {
    const keysToDelete = Array.from(this.memoryCache.keys()).filter((key) =>
      key.startsWith(pattern)
    );
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    await this.executeRedisOperation(async () => {
      const keys = await this.redis!.keys(`${pattern}*`);
      if (keys.length > 0) {
        await this.redis!.del(keys);
      }
      return keys.length;
    }, 'clear-pattern');

    logger.info(`Cache cleared for pattern: ${pattern}`);
  }

  private async clearAll(): Promise<void> {
    this.memoryCache.clear();

    await this.executeRedisOperation(
      () => this.redis!.flushDb(),
      'clear-all'
    );

    logger.info('All cache cleared');
  }

  /**
   * Set value in L1 memory cache with LRU eviction
   */
  private setMemoryCache<T>(key: string, value: T, ttl: number): void {
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Start periodic cleanup of expired memory cache entries
   */
  private startMemoryCacheCleanup(): void {
    const CLEANUP_INTERVAL_MS = 60000;

    this.cleanupInterval = setInterval(() => {
      const expiredKeys = Array.from(this.memoryCache.entries())
        .filter(([, entry]) => !this.isEntryValid(entry))
        .map(([key]) => key);

      expiredKeys.forEach((key) => this.memoryCache.delete(key));

      if (expiredKeys.length > 0) {
        logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    redisStatus: string;
    metrics: CacheMetrics;
    hitRate: number;
  } {
    const totalRequests = this.metrics.hits.total + this.metrics.misses;
    const hitRate = this.calculateHitRate(totalRequests);

    return {
      memorySize: this.memoryCache.size,
      redisStatus: this.isRedisAvailable() ? 'connected' : 'disconnected',
      metrics: { ...this.metrics },
      hitRate,
    };
  }

  private calculateHitRate(totalRequests: number): number {
    if (totalRequests === 0) {
      return 0;
    }
    const rate = (this.metrics.hits.total / totalRequests) * 100;
    return Math.round(rate * 100) / 100;
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: {
        l1: 0,
        l2: 0,
        total: 0,
      },
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      redisConnectionHealth: {
        ...this.metrics.redisConnectionHealth,
      },
    };
  }

  /**
   * Disconnect Redis and cleanup resources
   */
  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
    }

    this.memoryCache.clear();
    logger.info('Cache service disconnected and cleaned up');
  }
}

// Export singleton instance
export const cacheService = new CacheService();

/**
 * @module services/cache.types
 * @description أنواع وواجهات خدمة الكاش متعددة الطبقات.
 */

import { createClient } from 'redis';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RedisHealthStatus {
  status: 'connected' | 'disconnected' | 'error';
  lastCheck: number;
  consecutiveFailures: number;
}

export interface CacheMetrics {
  hits: {
    l1: number;
    l2: number;
    total: number;
  };
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  redisConnectionHealth: RedisHealthStatus;
}

export type RedisOperation<T> = () => Promise<T>;
export type RedisClientInstance = ReturnType<typeof createClient>;

export interface RedisRetryOptions {
  error?: {
    code?: string;
  };
  total_retry_time: number;
  attempt: number;
}

export type CacheRedisConfig = NonNullable<Parameters<typeof createClient>[0]> & {
  host?: string;
  port?: number;
  password?: string;
  sentinels?: { host: string; port: number }[];
  name?: string;
  sentinelPassword?: string;
  retry_strategy?: (options: RedisRetryOptions) => Error | number | undefined;
};

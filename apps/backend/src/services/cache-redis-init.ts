/**
 * @module services/cache-redis-init
 * @description بناء وتهيئة عميل Redis — منطق الإعداد والاتصال الأولي.
 * يدعم Sentinel وRESIS_URL والإعداد الفردي (host/port).
 */

import { createClient } from "redis";

import { logger } from "@/lib/logger";

import type {
  CacheRedisConfig,
  RedisClientInstance,
  RedisRetryOptions,
} from "./cache.types";

// ─── بناء إعداد Redis ──────────────────────────────────────────────

function buildRedisConfig(): CacheRedisConfig {
  let config: CacheRedisConfig;

  if (process.env.REDIS_SENTINEL_ENABLED === "true") {
    const sentinels = (
      process.env.REDIS_SENTINELS ??
      "127.0.0.1:26379,127.0.0.1:26380,127.0.0.1:26381"
    )
      .split(",")
      .map((s) => {
        const [host, port] = s.trim().split(":");
        return { host: host ?? "127.0.0.1", port: parseInt(port ?? "26379") };
      });

    config = {
      sentinels,
      name: process.env.REDIS_MASTER_NAME ?? "mymaster",
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
    if (process.env.REDIS_SENTINEL_PASSWORD) {
      config.sentinelPassword = process.env.REDIS_SENTINEL_PASSWORD;
    }

    logger.info(
      `Connecting to Redis via Sentinel: ${sentinels.length} sentinels`,
    );
  } else if (process.env.REDIS_URL) {
    config = { url: process.env.REDIS_URL };
  } else {
    config = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: parseInt(process.env.REDIS_PORT ?? "6379"),
    };
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
  }

  config.retry_strategy = (
    options: RedisRetryOptions,
  ): Error | number | undefined => {
    if (options.error?.code === "ECONNREFUSED") {
      logger.error("Redis connection refused");
      return new Error("Redis Server Connection Error");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error("Redis retry time exhausted");
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      return undefined;
    }
    const delay = Math.min(options.attempt * 100, 3000);
    logger.debug(`Redis retry attempt ${options.attempt}, delay: ${delay}ms`);
    return delay;
  };

  return config;
}

// ─── واجهة callbacks ──────────────────────────────────────────────

export interface RedisClientCallbacks {
  onError: (error: Error) => void;
  onConnect: () => void;
  onEnd: () => void;
}

// ─── بناء العميل مع تسجيل الأحداث (بدون connect) ────────────────

/**
 * ينشئ عميل Redis ويسجّل معالجات الأحداث.
 * لا يستدعي .connect() — المسؤولية على المستدعي.
 */
export function buildRedisClient(
  callbacks: RedisClientCallbacks,
): RedisClientInstance {
  const config = buildRedisConfig();
  const client = createClient(config as Parameters<typeof createClient>[0]);

  client.on("error", callbacks.onError);
  client.on("connect", callbacks.onConnect);
  client.on("end", callbacks.onEnd);

  return client;
}

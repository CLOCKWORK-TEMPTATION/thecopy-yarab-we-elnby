/**
 * Redis Configuration and Version Compatibility Check
 *
 * Handles Redis connection configuration and version validation for BullMQ
 */

import { createClient } from 'redis';
import { logger } from '@/lib/logger';

const BULLMQ_MIN_REDIS_VERSION = '5.0.0';

type RedisReconnectStrategy = (retries: number) => number | false;

interface RedisSocketConfig {
  host?: string;
  port?: number;
  reconnectStrategy: RedisReconnectStrategy;
}

interface RedisConnectionConfig {
  url?: string;
  password?: string;
  name?: string;
  sentinelPassword?: string;
  sentinels?: Array<{ host: string; port: number }>;
  socket: RedisSocketConfig;
}

type RedisClientInstance = ReturnType<typeof createClient>;

function buildReconnectStrategy(label: string): RedisReconnectStrategy {
  return (retries: number) => {
    if (retries > 10) {
      logger.error(`${label} retry attempts exhausted`);
      return false;
    }
    return Math.min(retries * 100, 3000);
  };
}

/**
 * Parse Redis URL or use individual configuration with Sentinel support
 */
export function getRedisConfig(): RedisConnectionConfig {
  // Sentinel configuration
  if (process.env['REDIS_SENTINEL_ENABLED'] === 'true') {
    logger.info('🔧 Redis Sentinel Mode: ACTIVATED');

    const sentinels = (process.env['REDIS_SENTINELS'] || '127.0.0.1:26379,127.0.0.1:26380,127.0.0.1:26381')
      .split(',')
      .map(s => {
        const [host, port] = s.trim().split(':');
        return { host: host || '127.0.0.1', port: parseInt(port || '26379') };
      });

    logger.info(`🔌 Connecting to ${sentinels.length} Sentinels: ${sentinels.map(s => `${s.host}:${s.port}`).join(', ')}`);

    const sentinelConfig: RedisConnectionConfig = {
      sentinels,
      name: process.env['REDIS_MASTER_NAME'] || 'mymaster',
      socket: {
        reconnectStrategy: buildReconnectStrategy('Redis Sentinel'),
      },
    };

    if (process.env['REDIS_PASSWORD']) {
      sentinelConfig.password = process.env['REDIS_PASSWORD'];
    }

    if (process.env['REDIS_SENTINEL_PASSWORD']) {
      sentinelConfig.sentinelPassword = process.env['REDIS_SENTINEL_PASSWORD'];
    }

    return sentinelConfig;
  }

  // If REDIS_URL is provided, use it directly
  if (process.env['REDIS_URL']) {
    const config: RedisConnectionConfig = {
      url: process.env['REDIS_URL'],
      socket: {
        reconnectStrategy: buildReconnectStrategy('Redis'),
      },
    };
    
    // Add password if provided separately
    if (process.env['REDIS_PASSWORD']) {
      config.password = process.env['REDIS_PASSWORD'];
    }
    
    return config;
  }

  // Otherwise use individual variables
  const config: RedisConnectionConfig = {
    socket: {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      reconnectStrategy: buildReconnectStrategy('Redis'),
    },
  };

  if (process.env['REDIS_PASSWORD']) {
    config.password = process.env['REDIS_PASSWORD'];
  }

  return config;
}

/**
 * Parse version string to comparable number
 * Example: "5.0.7" -> 5000007, "3.0.504" -> 3000504
 */
function parseVersion(version: string): number {
  const parts = version.split('.').map(Number);
  return (parts[0] || 0) * 1000000 + (parts[1] || 0) * 1000 + (parts[2] || 0);
}

/**
 * Check if Redis version is compatible with BullMQ
 */
export async function checkRedisVersion(): Promise<{
  compatible: boolean;
  version: string;
  minVersion: string;
  reason?: string;
}> {
  let client: RedisClientInstance | null = null;

  try {
    const config = getRedisConfig();
    const redisClient = createClient(config as Parameters<typeof createClient>[0]);
    client = redisClient;

    // Connect to Redis with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
      )
    ]);

    // Get server info
    const info = await redisClient.info('server');
    const versionMatch = info.match(/redis_version:(\S+)/);

    if (!versionMatch) {
      return {
        compatible: false,
        version: 'unknown',
        minVersion: BULLMQ_MIN_REDIS_VERSION,
        reason: 'Could not detect Redis version',
      };
    }

    const currentVersion = versionMatch[1] || 'unknown';
    const currentVersionNum = parseVersion(currentVersion);
    const minVersionNum = parseVersion(BULLMQ_MIN_REDIS_VERSION);

    const compatible = currentVersionNum >= minVersionNum;

    if (compatible) {
      return {
        compatible,
        version: currentVersion,
        minVersion: BULLMQ_MIN_REDIS_VERSION,
      };
    }

    return {
      compatible,
      version: currentVersion,
      minVersion: BULLMQ_MIN_REDIS_VERSION,
      reason: `BullMQ requires Redis >= ${BULLMQ_MIN_REDIS_VERSION}`,
    };
  } catch (error) {
    logger.error('Redis version check failed:', error);
    return {
      compatible: false,
      version: 'unknown',
      minVersion: BULLMQ_MIN_REDIS_VERSION,
      reason: error instanceof Error ? error.message : 'Connection failed',
    };
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
}

export default {
  getRedisConfig,
  checkRedisVersion,
  BULLMQ_MIN_REDIS_VERSION,
};

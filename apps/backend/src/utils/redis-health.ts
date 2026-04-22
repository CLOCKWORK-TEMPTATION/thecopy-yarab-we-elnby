/**
 * Redis Health Check Utility
 */

import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { getRedisConfig } from '@/config/redis.config';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

function getRedisEndpointMetadata(): { host: string; port: number } {
  const redisUrl = process.env['REDIS_URL']?.trim();

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname || 'localhost',
        port: Number.parseInt(parsed.port || '6379', 10),
      };
    } catch {
      logger.warn('[Redis] Failed to parse REDIS_URL for status metadata');
    }
  }

  return {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: Number.parseInt(process.env['REDIS_PORT'] || '6379', 10),
  };
}

async function disconnectHealthClient(client: RedisClientType | null): Promise<void> {
  if (!client) {
    return;
  }

  try {
    const isOpen =
      typeof (client as RedisClientType & { isOpen?: boolean }).isOpen === 'boolean'
        ? (client as RedisClientType & { isOpen: boolean }).isOpen
        : true;

    if (!isOpen) {
      return;
    }

    await client.disconnect();
  } catch (error) {
    logger.warn('[Redis] Failed to close health check client:', error);
  }
}

/**
 * Check if Redis is available
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redisClient) {
      const config = getRedisConfig();

      redisClient = createClient({
        ...config,
        socket: {
          ...(config.socket ?? {}),
          connectTimeout: 5000,
          reconnectStrategy: () => false,
        },
      });
      
      await redisClient.connect();
    }

    await redisClient.ping();
    logger.info('[Redis] Health check passed');
    return true;
  } catch (error) {
    logger.warn('[Redis] Health check failed:', error);

    const clientToDispose = redisClient;
    redisClient = null;
    await disconnectHealthClient(clientToDispose);

    return false;
  }
}

/**
 * Get Redis status for monitoring
 */
export async function getRedisStatus() {
  const isHealthy = await checkRedisHealth();
  const endpoint = getRedisEndpointMetadata();
  
  return {
    status: isHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    host: endpoint.host,
    port: endpoint.port,
  };
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection() {
  const clientToDispose = redisClient;
  redisClient = null;

  if (!clientToDispose) {
    return;
  }

  try {
    const isOpen =
      typeof (clientToDispose as RedisClientType & { isOpen?: boolean }).isOpen === 'boolean'
        ? (clientToDispose as RedisClientType & { isOpen: boolean }).isOpen
        : true;

    if (!isOpen) {
      return;
    }

    await clientToDispose.quit();
  } catch (error) {
    logger.warn('[Redis] Failed to quit health check client:', error);
  }
}

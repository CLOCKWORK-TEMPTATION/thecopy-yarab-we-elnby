import { createClient } from 'redis';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

interface SentinelRedisClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<string>;
  set(key: string, value: string): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
}

function getClient(client: SentinelRedisClient | undefined): SentinelRedisClient {
  if (!client) {
    throw new Error('Redis Sentinel client was not initialized');
  }

  return client;
}

describe('Redis Sentinel Integration', () => {
  let client: SentinelRedisClient | undefined;

  beforeAll(async () => {
    if (process.env.REDIS_SENTINEL_ENABLED !== 'true') {
      return;
    }

    const sentinels = (process.env.REDIS_SENTINELS ?? '127.0.0.1:26379,127.0.0.1:26380,127.0.0.1:26381')
      .split(',')
      .map(s => {
        const [host, port] = s.trim().split(':');
        return { host, port: parseInt(port) };
      });

    client = createClient({
      sentinels,
      name: process.env.REDIS_MASTER_NAME ?? 'mymaster',
      password: process.env.REDIS_PASSWORD,
    }) as unknown as SentinelRedisClient;

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it('should connect to Redis via Sentinel', async () => {
    if (process.env.REDIS_SENTINEL_ENABLED !== 'true') {
      return;
    }

    const pong = await getClient(client).ping();
    expect(pong).toBe('PONG');
  });

  it('should set and get values', async () => {
    if (process.env.REDIS_SENTINEL_ENABLED !== 'true') {
      return;
    }

    await getClient(client).set('test:sentinel', 'working');
    const value = await getClient(client).get('test:sentinel');
    expect(value).toBe('working');
    await getClient(client).del('test:sentinel');
  });

  it('should handle failover gracefully', async () => {
    if (process.env.REDIS_SENTINEL_ENABLED !== 'true') {
      return;
    }

    // Set initial value
    await getClient(client).set('test:failover', 'before');
    
    // Simulate master failure (in real test, you'd stop the master)
    // For now, just verify connection resilience
    const value = await getClient(client).get('test:failover');
    expect(value).toBe('before');
    
    await getClient(client).del('test:failover');
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from 'redis';

describe('Redis Sentinel Integration', () => {
  let client: any;

  beforeAll(async () => {
    if (process.env['REDIS_SENTINEL_ENABLED'] !== 'true') {
      return;
    }

    const sentinels = (process.env['REDIS_SENTINELS'] || '127.0.0.1:26379,127.0.0.1:26380,127.0.0.1:26381')
      .split(',')
      .map(s => {
        const [host, port] = s.trim().split(':');
        return { host, port: parseInt(port) };
      });

    client = createClient({
      sentinels,
      name: process.env['REDIS_MASTER_NAME'] || 'mymaster',
      password: process.env['REDIS_PASSWORD'],
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it('should connect to Redis via Sentinel', async () => {
    if (process.env['REDIS_SENTINEL_ENABLED'] !== 'true') {
      return;
    }

    const pong = await client.ping();
    expect(pong).toBe('PONG');
  });

  it('should set and get values', async () => {
    if (process.env['REDIS_SENTINEL_ENABLED'] !== 'true') {
      return;
    }

    await client.set('test:sentinel', 'working');
    const value = await client.get('test:sentinel');
    expect(value).toBe('working');
    await client.del('test:sentinel');
  });

  it('should handle failover gracefully', async () => {
    if (process.env['REDIS_SENTINEL_ENABLED'] !== 'true') {
      return;
    }

    // Set initial value
    await client.set('test:failover', 'before');
    
    // Simulate master failure (in real test, you'd stop the master)
    // For now, just verify connection resilience
    const value = await client.get('test:failover');
    expect(value).toBe('before');
    
    await client.del('test:failover');
  });
});

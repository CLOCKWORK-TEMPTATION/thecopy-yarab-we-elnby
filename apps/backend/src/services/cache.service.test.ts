import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

import { CacheService } from './cache.service';

interface MockRedis {
  status: string;
  isOpen: boolean;
  connect: Mock;
  get: Mock;
  setEx: Mock;
  del: Mock;
  keys: Mock;
  flushDb: Mock;
  disconnect: Mock;
  on: Mock;
}

interface CacheServiceInternals {
  redis: MockRedis | null;
  cleanupInterval: NodeJS.Timeout | null;
}

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    status: 'ready',
    isOpen: true,
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    flushDb: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@sentry/node', () => ({
  startTransaction: vi.fn(() => ({
    setTag: vi.fn(),
    setData: vi.fn(),
    setStatus: vi.fn(),
    finish: vi.fn(),
  })),
  captureException: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  env: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    NODE_ENV: 'test',
  },
}));

function createMockRedis(): MockRedis {
  return {
    status: 'ready',
    isOpen: true,
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    flushDb: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  };
}

let cacheService: CacheService;
let mockRedis: MockRedis;

function internals(): CacheServiceInternals {
  return cacheService as unknown as CacheServiceInternals;
}

beforeEach(() => {
  delete process.env.REDIS_URL;
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';

  mockRedis = createMockRedis();
  cacheService = new CacheService();
  internals().redis = mockRedis;
});

afterEach(() => {
  const view = internals();
  if (view.cleanupInterval) {
    clearInterval(view.cleanupInterval);
    view.cleanupInterval = null;
  }
  vi.clearAllMocks();
});

describe('CacheService > L1/L2 Caching', () => {
  it('should get value from L1 cache when available', async () => {
    const key = 'test-key-l1';
    const value = { data: 'test-value' };
    const ttl = 3600;

    await cacheService.set(key, value, ttl);
    mockRedis.get.mockClear();

    const result = await cacheService.get(key);
    expect(result).toEqual(value);
    expect(mockRedis.get).not.toHaveBeenCalled();

    const stats = cacheService.getStats();
    expect(stats.metrics.hits.l1).toBeGreaterThan(0);
    expect(stats.metrics.hits.total).toBeGreaterThan(0);
  });

  it('should get value from L2 cache when L1 misses', async () => {
    const key = 'test-key-l2-only';
    const value = { data: 'test-value-l2' };
    const serializedValue = JSON.stringify(value);

    mockRedis.get.mockResolvedValue(serializedValue);

    const result = await cacheService.get(key);
    expect(result).toEqual(value);
    expect(mockRedis.get).toHaveBeenCalledWith(key);

    const stats = cacheService.getStats();
    expect(stats.metrics.hits.l2).toBeGreaterThan(0);
  });

  it('should set value in both L1 and L2 cache', async () => {
    const key = 'test-key-both';
    const value = { data: 'test-value-both' };
    const ttl = 3600;

    mockRedis.setEx.mockResolvedValue('OK');

    await cacheService.set(key, value, ttl);

    const l1Result = await cacheService.get(key);
    expect(l1Result).toEqual(value);
    expect(mockRedis.setEx).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));

    const stats = cacheService.getStats();
    expect(stats.metrics.sets).toBeGreaterThan(0);
  });

  it('should handle expired L1 cache entries', async () => {
    const key = 'test-key-expire';
    const value = { data: 'test-value' };
    const shortTtl = 1;

    await cacheService.set(key, value, shortTtl);

    const immediateResult = await cacheService.get(key);
    expect(immediateResult).toEqual(value);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    mockRedis.get.mockResolvedValue(null);

    const expiredResult = await cacheService.get(key);
    expect(expiredResult).toBeNull();

    const stats = cacheService.getStats();
    expect(stats.metrics.misses).toBeGreaterThan(0);
  });
});

describe('CacheService > Fallback Behavior', () => {
  it('should fallback to L1 when Redis connection fails', async () => {
    const key = 'test-key-fallback';
    const value = { data: 'test-value-fallback' };

    mockRedis.status = 'disconnected';
    mockRedis.isOpen = false;

    await cacheService.set(key, value);
    const result = await cacheService.get(key);
    expect(result).toEqual(value);
    expect(mockRedis.setEx).not.toHaveBeenCalled();
    expect(mockRedis.get).not.toHaveBeenCalled();
  });
});

describe('CacheService > Cache Operations', () => {
  it('should delete from both L1 and L2', async () => {
    const key = 'test-key-delete';
    const value = { data: 'test-value' };

    mockRedis.setEx.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    await cacheService.set(key, value);

    expect(await cacheService.get(key)).toEqual(value);

    await cacheService.delete(key);
    mockRedis.get.mockResolvedValue(null);

    expect(await cacheService.get(key)).toBeNull();
    expect(mockRedis.del).toHaveBeenCalledWith(key);

    const stats = cacheService.getStats();
    expect(stats.metrics.deletes).toBeGreaterThan(0);
  });

  it('should clear all cache', async () => {
    mockRedis.setEx.mockResolvedValue('OK');
    mockRedis.flushDb.mockResolvedValue('OK');

    await cacheService.set('key1', { data: 'value1' });
    await cacheService.set('key2', { data: 'value2' });

    await cacheService.clear();
    mockRedis.get.mockResolvedValue(null);

    expect(await cacheService.get('key1')).toBeNull();
    expect(await cacheService.get('key2')).toBeNull();
    expect(mockRedis.flushDb).toHaveBeenCalled();
  });
});

describe('CacheService > Validation', () => {
  it('should validate TTL and use default for invalid values', async () => {
    const key = 'test-key-ttl';
    const value = { data: 'test-value' };

    mockRedis.setEx.mockResolvedValue('OK');

    await cacheService.set(key, value, -1);
    const stats = cacheService.getStats();
    expect(stats.metrics.sets).toBeGreaterThan(0);

    await cacheService.set('key2', value, 100000);
    const stats2 = cacheService.getStats();
    expect(stats2.metrics.sets).toBeGreaterThan(1);
  });

  it('should reject values exceeding MAX_VALUE_SIZE', async () => {
    const key = 'test-key-large';
    const largeValue = { data: 'x'.repeat(1024 * 1024 + 1) };

    await cacheService.set(key, largeValue);

    mockRedis.get.mockResolvedValue(null);
    const result = await cacheService.get(key);
    expect(result).toBeNull();
    expect(mockRedis.setEx).not.toHaveBeenCalled();
  });

  it('should validate cache key format', () => {
    const prefix = 'test';
    const data = { id: 123, name: 'test' };

    const key = cacheService.generateKey(prefix, data);
    expect(key).toMatch(/^test:[a-f0-9]{16}$/);
  });

  it('should generate consistent keys for same data', () => {
    const prefix = 'test';
    const data = { id: 123, name: 'test' };

    const key1 = cacheService.generateKey(prefix, data);
    const key2 = cacheService.generateKey(prefix, data);

    expect(key1).toBe(key2);
  });

  it('should generate different keys for different data', () => {
    const prefix = 'test';
    const data1 = { id: 123 };
    const data2 = { id: 456 };

    const key1 = cacheService.generateKey(prefix, data1);
    const key2 = cacheService.generateKey(prefix, data2);

    expect(key1).not.toBe(key2);
  });
});

describe('CacheService > Metrics', () => {
  it('should track cache hit rates', async () => {
    const key = 'test-key-metrics';
    const value = { data: 'test-value' };

    mockRedis.setEx.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);

    await cacheService.set(key, value);
    await cacheService.get(key);
    await cacheService.get(key);
    await cacheService.get('miss-key');

    const stats = cacheService.getStats();
    expect(stats.metrics.hits.total).toBeGreaterThan(0);
    expect(stats.metrics.misses).toBeGreaterThan(0);
    expect(stats.hitRate).toBeGreaterThan(0);
  });

  it('should reset metrics', async () => {
    const key = 'test-key-reset';
    const value = { data: 'test-value' };

    await cacheService.set(key, value);
    await cacheService.get(key);
    await cacheService.get('miss');

    const statsBefore = cacheService.getStats();
    expect(statsBefore.metrics.hits.total).toBeGreaterThan(0);

    cacheService.resetMetrics();

    const statsAfter = cacheService.getStats();
    expect(statsAfter.metrics.hits.total).toBe(0);
    expect(statsAfter.metrics.misses).toBe(0);
    expect(statsAfter.metrics.sets).toBe(0);
  });

  it('should track Redis connection health', () => {
    const stats = cacheService.getStats();

    expect(stats.metrics.redisConnectionHealth).toBeDefined();
    expect(stats.metrics.redisConnectionHealth.status).toBeDefined();
    expect(stats.metrics.redisConnectionHealth.lastCheck).toBeDefined();
    expect(stats.metrics.redisConnectionHealth.consecutiveFailures).toBeDefined();
  });
});

describe('CacheService > Type Safety', () => {
  interface TestType {
    id: number;
    name: string;
  }

  it('should preserve type information with generics', async () => {
    const key = 'typed-key';
    const value: TestType = { id: 1, name: 'test' };

    await cacheService.set<TestType>(key, value);
    const result = await cacheService.get<TestType>(key);

    expect(result).toEqual(value);
    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(Number) as unknown,
        name: expect.any(String) as unknown,
      })
    );
  });

  it('should handle different value types', async () => {
    await cacheService.set('string-key', 'string-value');
    expect(await cacheService.get<string>('string-key')).toBe('string-value');

    await cacheService.set('number-key', 42);
    expect(await cacheService.get<number>('number-key')).toBe(42);

    await cacheService.set('array-key', [1, 2, 3]);
    expect(await cacheService.get<number[]>('array-key')).toEqual([1, 2, 3]);

    await cacheService.set('object-key', { nested: { value: 'test' } });
    expect(await cacheService.get<{ nested: { value: string } }>('object-key')).toEqual({
      nested: { value: 'test' },
    });
  });
});

describe('CacheService > Error Handling', () => {
  it('should handle JSON parse errors gracefully', async () => {
    const key = 'test-key-invalid';
    const invalidJson = 'invalid-json-{{{';

    mockRedis.get.mockResolvedValue(invalidJson);

    const result = await cacheService.get(key);
    expect(result).toBeDefined();
  });

  it('should handle Redis connection errors', async () => {
    internals().redis = null;

    await cacheService.set('test-key', { data: 'value' });
    const result = await cacheService.get('test-key');
    expect(result).toEqual({ data: 'value' });
  });
});

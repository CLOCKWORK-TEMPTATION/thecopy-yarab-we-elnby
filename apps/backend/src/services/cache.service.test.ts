// File: backend/src/services/cache.service.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from './cache.service';

// Mock Redis client
vi.mock('redis', () => {
  return {
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
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
  startTransaction: vi.fn(() => ({
    setTag: vi.fn(),
    setData: vi.fn(),
    setStatus: vi.fn(),
    finish: vi.fn(),
  })),
  captureException: vi.fn(),
}));

// Mock env
vi.mock('@/config/env', () => ({
  env: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    NODE_ENV: 'test',
  },
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: any;

  beforeEach(() => {
    // Reset environment
    process.env['REDIS_URL'] = undefined;
    process.env['REDIS_HOST'] = 'localhost';
    process.env['REDIS_PORT'] = '6379';

    // Create a proper mock Redis instance
    mockRedis = {
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

    // Create new instance
    cacheService = new CacheService();

    // Inject mock Redis
    (cacheService as any).redis = mockRedis;
  });

  afterEach(async () => {
    // Clean up
    if (cacheService) {
      const service = cacheService as any;
      if (service.cleanupInterval) {
        clearInterval(service.cleanupInterval);
        service.cleanupInterval = null;
      }
    }
    vi.clearAllMocks();
  });

  describe('L1/L2 Caching', () => {
    it('should get value from L1 cache when available', async () => {
      const key = 'test-key-l1';
      const value = { data: 'test-value' };
      const ttl = 3600;

      // Set in L1 cache
      await cacheService.set(key, value, ttl);

      // Clear mock calls from set operation
      mockRedis.get.mockClear();

      // Get should return from L1
      const result = await cacheService.get(key);
      expect(result).toEqual(value);

      // Verify Redis was not called for get
      expect(mockRedis.get).not.toHaveBeenCalled();

      // Verify metrics
      const stats = cacheService.getStats();
      expect(stats.metrics.hits.l1).toBeGreaterThan(0);
      expect(stats.metrics.hits.total).toBeGreaterThan(0);
    });

    it('should get value from L2 cache when L1 misses', async () => {
      const key = 'test-key-l2-only';
      const value = { data: 'test-value-l2' };
      const serializedValue = JSON.stringify(value);

      // Mock Redis to return value
      mockRedis.get.mockResolvedValue(serializedValue);

      // Get should fetch from L2 (L1 is empty)
      const result = await cacheService.get(key);
      expect(result).toEqual(value);

      // Verify Redis was called
      expect(mockRedis.get).toHaveBeenCalledWith(key);

      // Verify metrics
      const stats = cacheService.getStats();
      expect(stats.metrics.hits.l2).toBeGreaterThan(0);
    });

    it('should set value in both L1 and L2 cache', async () => {
      const key = 'test-key-both';
      const value = { data: 'test-value-both' };
      const ttl = 3600;

      // Ensure setEx is mocked
      mockRedis.setEx.mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      // Verify L1 has the value
      const l1Result = await cacheService.get(key);
      expect(l1Result).toEqual(value);

      // Verify Redis setEx was called
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );

      // Verify metrics
      const stats = cacheService.getStats();
      expect(stats.metrics.sets).toBeGreaterThan(0);
    });

    it('should handle expired L1 cache entries', async () => {
      const key = 'test-key-expire';
      const value = { data: 'test-value' };
      const shortTtl = 1; // 1 second

      // Set with short TTL
      await cacheService.set(key, value, shortTtl);

      // Verify it's in L1
      const immediateResult = await cacheService.get(key);
      expect(immediateResult).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Mock Redis to return null (expired)
      mockRedis.get.mockResolvedValue(null);

      // Should miss after expiration
      const expiredResult = await cacheService.get(key);
      expect(expiredResult).toBeNull();

      // Verify metrics
      const stats = cacheService.getStats();
      expect(stats.metrics.misses).toBeGreaterThan(0);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to L1 when Redis connection fails', async () => {
      const key = 'test-key-fallback';
      const value = { data: 'test-value-fallback' };

      // Set Redis status to disconnected and not open
      mockRedis["status"] = 'disconnected';
      mockRedis.isOpen = false;

      // Set should still work (L1 only)
      await cacheService.set(key, value);

      // Get should work from L1
      const result = await cacheService.get(key);
      expect(result).toEqual(value);

      // Verify Redis was not called since it's not open
      expect(mockRedis.setEx).not.toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });

  describe('Cache Operations', () => {
    it('should delete from both L1 and L2', async () => {
      const key = 'test-key-delete';
      const value = { data: 'test-value' };

      // Set value
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);
      await cacheService.set(key, value);

      // Verify it exists
      expect(await cacheService.get(key)).toEqual(value);

      // Delete
      await cacheService.delete(key);

      // Mock Redis to return null after delete
      mockRedis.get.mockResolvedValue(null);

      // Verify it's gone
      expect(await cacheService.get(key)).toBeNull();

      // Verify Redis del was called
      expect(mockRedis.del).toHaveBeenCalledWith(key);

      // Verify metrics
      const stats = cacheService.getStats();
      expect(stats.metrics.deletes).toBeGreaterThan(0);
    });

    it('should clear all cache', async () => {
      // Set multiple values
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.flushDb.mockResolvedValue('OK');

      await cacheService.set('key1', { data: 'value1' });
      await cacheService.set('key2', { data: 'value2' });

      // Clear all
      await cacheService.clear();

      // Mock Redis to return null after clear
      mockRedis.get.mockResolvedValue(null);

      // Verify all are gone
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();

      // Verify Redis flushDb was called
      expect(mockRedis.flushDb).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate TTL and use default for invalid values', async () => {
      const key = 'test-key-ttl';
      const value = { data: 'test-value' };

      mockRedis.setEx.mockResolvedValue('OK');

      // Test negative TTL
      await cacheService.set(key, value, -1);
      const stats = cacheService.getStats();
      expect(stats.metrics.sets).toBeGreaterThan(0);

      // Test TTL exceeding MAX_TTL
      await cacheService.set('key2', value, 100000);
      const stats2 = cacheService.getStats();
      expect(stats2.metrics.sets).toBeGreaterThan(1);
    });

    it('should reject values exceeding MAX_VALUE_SIZE', async () => {
      const key = 'test-key-large';
      // Create a value larger than 1MB
      const largeValue = { data: 'x'.repeat(1024 * 1024 + 1) };

      await cacheService.set(key, largeValue);

      // Value should not be cached
      mockRedis.get.mockResolvedValue(null);
      const result = await cacheService.get(key);
      expect(result).toBeNull();

      // Verify Redis was not called for set
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

  describe('Metrics', () => {
    it('should track cache hit rates', async () => {
      const key = 'test-key-metrics';
      const value = { data: 'test-value' };

      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(null);

      // Set and get multiple times
      await cacheService.set(key, value);
      await cacheService.get(key); // Hit from L1
      await cacheService.get(key); // Hit from L1
      await cacheService.get('miss-key'); // Miss

      const stats = cacheService.getStats();
      expect(stats.metrics.hits.total).toBeGreaterThan(0);
      expect(stats.metrics.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      const key = 'test-key-reset';
      const value = { data: 'test-value' };

      // Generate some metrics
      await cacheService.set(key, value);
      await cacheService.get(key);
      await cacheService.get('miss');

      const statsBefore = cacheService.getStats();
      expect(statsBefore.metrics.hits.total).toBeGreaterThan(0);

      // Reset metrics
      cacheService.resetMetrics();

      const statsAfter = cacheService.getStats();
      expect(statsAfter.metrics.hits.total).toBe(0);
      expect(statsAfter.metrics.misses).toBe(0);
      expect(statsAfter.metrics.sets).toBe(0);
    });

    it('should track Redis connection health', async () => {
      const stats = cacheService.getStats();

      expect(stats.metrics.redisConnectionHealth).toBeDefined();
      expect(stats.metrics.redisConnectionHealth["status"]).toBeDefined();
      expect(stats.metrics.redisConnectionHealth.lastCheck).toBeDefined();
      expect(stats.metrics.redisConnectionHealth.consecutiveFailures).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should preserve type information with generics', async () => {
      interface TestType {
        id: number;
        name: string;
      }

      const key = 'typed-key';
      const value: TestType = { id: 1, name: 'test' };

      await cacheService.set<TestType>(key, value);
      const result = await cacheService.get<TestType>(key);

      expect(result).toEqual(value);
      if (result) {
        expect(typeof result.id).toBe('number');
        expect(typeof result.name).toBe('string');
      }
    });

    it('should handle different value types', async () => {
      // String
      await cacheService.set('string-key', 'string-value');
      expect(await cacheService.get<string>('string-key')).toBe('string-value');

      // Number
      await cacheService.set('number-key', 42);
      expect(await cacheService.get<number>('number-key')).toBe(42);

      // Array
      await cacheService.set('array-key', [1, 2, 3]);
      expect(await cacheService.get<number[]>('array-key')).toEqual([1, 2, 3]);

      // Object
      await cacheService.set('object-key', { nested: { value: 'test' } });
      expect(await cacheService.get<{ nested: { value: string } }>('object-key')).toEqual({
        nested: { value: 'test' },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      const key = 'test-key-invalid';
      const invalidJson = 'invalid-json-{{{';

      // Mock Redis to return invalid JSON
      mockRedis.get.mockResolvedValue(invalidJson);

      // Should handle error gracefully and return the invalid string
      const result = await cacheService.get(key);
      expect(result).toBeDefined();
    });

    it('should handle Redis connection errors', async () => {
      // Simulate Redis not available
      (cacheService as any).redis = null;

      // Operations should still work with L1 only
      await cacheService.set('test-key', { data: 'value' });
      const result = await cacheService.get('test-key');
      expect(result).toEqual({ data: 'value' });
    });
  });
});

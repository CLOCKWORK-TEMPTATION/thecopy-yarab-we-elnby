import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prom-client with proper class constructors
vi.mock('prom-client', () => {
  const mockCounter = class {
    inc = vi.fn();
  };
  const mockGauge = class {
    set = vi.fn();
  };
  return {
    Counter: mockCounter,
    Gauge: mockGauge,
  };
});

// Mock metrics middleware
vi.mock('@/middleware/metrics.middleware', () => ({
  register: {},
}));

// Mock cache service
vi.mock('./cache.service', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./notification.service', () => ({
  notificationService: {
    sendAlert: vi.fn().mockResolvedValue(undefined),
  },
}));

import { logger } from '@/lib/logger';

import { cacheService } from './cache.service';
import { GeminiCostTrackerService, geminiCostTracker } from './gemini-cost-tracker.service';

describe('GeminiCostTrackerService', () => {
  let service: GeminiCostTrackerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiCostTrackerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(service).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Gemini Cost Tracker initialized',
        expect.objectContaining({
          dailyLimit: 10.0,
          monthlyBudget: 300.0,
          warningThreshold: 0.80,
        })
      );
    });
  });

  describe('trackUsage', () => {
    it('should track token usage and calculate cost', async () => {
      const inputTokens = 1000;
      const outputTokens = 500;

      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      const result = await service.trackUsage(inputTokens, outputTokens, 'characters');

      expect(result).toEqual({
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        cost: expect.any(Number),
        timestamp: expect.any(Number),
      });

      // Verify cost calculation: (1000/1M * 0.075) + (500/1M * 0.30)
      const expectedCost = (1000 / 1_000_000) * 0.075 + (500 / 1_000_000) * 0.30;
      expect(result.cost).toBeCloseTo(expectedCost, 6);
    });

    it('should log usage information', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      await service.trackUsage(1000, 500, 'themes');

      expect(logger.info).toHaveBeenCalledWith(
        'Gemini API usage tracked',
        expect.objectContaining({
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          analysisType: 'themes',
        })
      );
    });

    it('should update existing daily usage', async () => {
      const existingUsage = {
        tokens: { input: 500, output: 200, total: 700 },
        cost: 0.0001,
        requestCount: 1,
        lastUpdated: Date.now() - 1000,
      };

      vi.mocked(cacheService.get).mockResolvedValue(existingUsage);
      vi.mocked(cacheService.set).mockResolvedValue(undefined);

      await service.trackUsage(1000, 500);

      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getDailyUsage', () => {
    it('should return daily usage from cache', async () => {
      const mockUsage = {
        tokens: { input: 1000, output: 500, total: 1500 },
        cost: 0.00025,
        requestCount: 2,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get).mockResolvedValue(mockUsage);

      const result = await service.getDailyUsage();

      expect(result).toEqual(mockUsage);
    });

    it('should return null if no daily usage', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await service.getDailyUsage();

      expect(result).toBeNull();
    });
  });

  describe('getMonthlyUsage', () => {
    it('should return monthly usage from cache', async () => {
      const mockUsage = {
        tokens: { input: 50000, output: 25000, total: 75000 },
        cost: 0.012,
        requestCount: 50,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get).mockResolvedValue(mockUsage);

      const result = await service.getMonthlyUsage();

      expect(result).toEqual(mockUsage);
    });

    it('should return null if no monthly usage', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await service.getMonthlyUsage();

      expect(result).toBeNull();
    });
  });

  describe('getCostSummary', () => {
    it('should return complete cost summary', async () => {
      const dailyUsage = {
        tokens: { input: 1000, output: 500, total: 1500 },
        cost: 0.5,
        requestCount: 5,
        lastUpdated: Date.now(),
      };

      const monthlyUsage = {
        tokens: { input: 50000, output: 25000, total: 75000 },
        cost: 25.0,
        requestCount: 100,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get)
        .mockResolvedValueOnce(dailyUsage)
        .mockResolvedValueOnce(monthlyUsage);

      const result = await service.getCostSummary();

      expect(result).toEqual({
        daily: {
          cost: 0.5,
          tokens: 1500,
          requests: 5,
          limitReached: false,
          percentOfLimit: 5, // 0.5 / 10 * 100
        },
        monthly: {
          cost: 25.0,
          tokens: 75000,
          requests: 100,
          budget: 300.0,
          percentOfBudget: expect.any(Number),
          quotaWarning: false,
        },
      });
    });

    it('should return empty summary if no usage data', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await service.getCostSummary();

      expect(result.daily.cost).toBe(0);
      expect(result.daily.tokens).toBe(0);
      expect(result.monthly.cost).toBe(0);
      expect(result.monthly.tokens).toBe(0);
    });

    it('should indicate limit reached when daily cost exceeds limit', async () => {
      const dailyUsage = {
        tokens: { input: 1000000, output: 500000, total: 1500000 },
        cost: 15.0, // Over $10 limit
        requestCount: 1000,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get)
        .mockResolvedValueOnce(dailyUsage)
        .mockResolvedValueOnce(null);

      const result = await service.getCostSummary();

      expect(result.daily.limitReached).toBe(true);
      expect(result.daily.percentOfLimit).toBe(150);
    });

    it('should indicate quota warning when monthly cost exceeds 80%', async () => {
      const monthlyUsage = {
        tokens: { input: 10000000, output: 5000000, total: 15000000 },
        cost: 250.0, // 83% of $300 budget
        requestCount: 5000,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(monthlyUsage);

      const result = await service.getCostSummary();

      expect(result.monthly.quotaWarning).toBe(true);
    });
  });

  describe('resetUsage', () => {
    it('should reset daily usage', async () => {
      vi.mocked(cacheService.delete).mockResolvedValue(true);

      await service.resetUsage('daily');

      expect(logger.info).toHaveBeenCalledWith('Usage data reset', { period: 'daily' });
    });

    it('should reset monthly usage', async () => {
      vi.mocked(cacheService.delete).mockResolvedValue(true);

      await service.resetUsage('monthly');

      expect(logger.info).toHaveBeenCalledWith('Usage data reset', { period: 'monthly' });
    });

    it('should reset all usage by default', async () => {
      vi.mocked(cacheService.delete).mockResolvedValue(true);

      await service.resetUsage();

      expect(logger.info).toHaveBeenCalledWith('Usage data reset', { period: 'all' });
    });

    it('should handle cache delete errors gracefully', async () => {
      vi.mocked(cacheService.delete).mockRejectedValue(new Error('Cache error'));

      await service.resetUsage('all');

      expect(logger.info).toHaveBeenCalledWith('Usage data reset', { period: 'all' });
    });
  });

  describe('cost alerts', () => {
    it('should trigger daily limit alert when limit is exceeded', async () => {
      const highCostUsage = {
        tokens: { input: 5000000, output: 2500000, total: 7500000 },
        cost: 9.5, // Close to limit
        requestCount: 100,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get)
        .mockResolvedValueOnce(highCostUsage) // Existing daily usage
        .mockResolvedValueOnce(null) // Alert not sent yet
        .mockResolvedValueOnce(null) // Monthly usage check
        .mockResolvedValueOnce(null); // Monthly alert check

      // This should push daily cost over $10 limit
      // Cost: (5000000/1M * 0.075) + (2500000/1M * 0.30) = 0.375 + 0.75 = 1.125
      await service.trackUsage(5000000, 2500000);

      // Check if error was logged with expected content
      const errorCalls = vi.mocked(logger.error).mock.calls;
      const hasLimitAlert = errorCalls.some(call =>
        typeof call[0] === 'string' && call[0].includes('GEMINI COST ALERT')
      );
      expect(hasLimitAlert).toBe(true);
    });

    it('should not send duplicate daily alerts', async () => {
      const existingAlert = {
        tokens: { input: 0, output: 0, total: 0 },
        cost: 10.5,
        requestCount: 1,
        lastUpdated: Date.now(),
      };

      const highCostUsage = {
        tokens: { input: 5000000, output: 2500000, total: 7500000 },
        cost: 10.5,
        requestCount: 100,
        lastUpdated: Date.now(),
      };

      vi.mocked(cacheService.get)
        .mockResolvedValueOnce(highCostUsage) // Existing daily usage
        .mockResolvedValueOnce(existingAlert) // Alert already sent
        .mockResolvedValueOnce(null); // Monthly usage

      await service.trackUsage(100000, 50000);

      // Should not log a new CRITICAL error since alert was already sent
      const criticalCalls = vi.mocked(logger.error).mock.calls.filter(
        call => call[0].includes('Daily limit exceeded')
      );
      expect(criticalCalls.length).toBe(0);
    });
  });

  describe('cache fallback', () => {
    it('should fall back to memory store when cache unavailable', async () => {
      vi.mocked(cacheService.get).mockRejectedValue(new Error('Cache unavailable'));
      vi.mocked(cacheService.set).mockRejectedValue(new Error('Cache unavailable'));

      // Should not throw and should work with memory store
      await expect(service.trackUsage(1000, 500)).resolves.toBeDefined();

      const debugMessages = vi.mocked(logger.debug).mock.calls.map(([message]) => message);
      expect(
        debugMessages.some((message) =>
          typeof message === 'string' && message.includes('Cache unavailable')
        )
      ).toBe(true);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(geminiCostTracker).toBeDefined();
      expect(geminiCostTracker).toBeInstanceOf(GeminiCostTrackerService);
    });
  });
});

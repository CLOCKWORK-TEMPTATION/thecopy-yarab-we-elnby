import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("prom-client", () => {
  const mockCounter = class {
    inc = vi.fn();
  };
  const mockGauge = class {
    set = vi.fn();
  };
  return { Counter: mockCounter, Gauge: mockGauge };
});

vi.mock("@/middleware/metrics.middleware", () => ({
  register: {},
}));

const { cacheMock, loggerMock, notifMock } = vi.hoisted(() => ({
  cacheMock: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  notifMock: { sendAlert: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("./cache.service", () => ({ cacheService: cacheMock }));
vi.mock("@/lib/logger", () => ({ logger: loggerMock }));
vi.mock("./notification.service", () => ({ notificationService: notifMock }));

import {
  GeminiCostTrackerService,
  geminiCostTracker,
} from "./gemini-cost-tracker.service";

let service: GeminiCostTrackerService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new GeminiCostTrackerService();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GeminiCostTrackerService > constructor", () => {
  it("should initialize with default configuration", () => {
    expect(service).toBeDefined();
    expect(loggerMock.info).toHaveBeenCalledWith(
      "Gemini Cost Tracker initialized",
      expect.objectContaining({
        dailyLimit: 10.0,
        monthlyBudget: 300.0,
        warningThreshold: 0.8,
      }),
    );
  });
});

describe("GeminiCostTrackerService > trackUsage", () => {
  it("should track token usage and calculate cost", async () => {
    cacheMock.get.mockResolvedValue(null);
    cacheMock.set.mockResolvedValue(undefined);

    const result = await service.trackUsage(1000, 500, "characters");

    expect(result).toEqual({
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      cost: expect.any(Number) as unknown,
      timestamp: expect.any(Number) as unknown,
    });

    const expectedCost = (1000 / 1_000_000) * 0.075 + (500 / 1_000_000) * 0.3;
    expect(result.cost).toBeCloseTo(expectedCost, 6);
  });

  it("should log usage information", async () => {
    cacheMock.get.mockResolvedValue(null);
    cacheMock.set.mockResolvedValue(undefined);

    await service.trackUsage(1000, 500, "themes");

    expect(loggerMock.info).toHaveBeenCalledWith(
      "Gemini API usage tracked",
      expect.objectContaining({
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        analysisType: "themes",
      }),
    );
  });

  it("should update existing daily usage", async () => {
    const existingUsage = {
      tokens: { input: 500, output: 200, total: 700 },
      cost: 0.0001,
      requestCount: 1,
      lastUpdated: Date.now() - 1000,
    };

    cacheMock.get.mockResolvedValue(existingUsage);
    cacheMock.set.mockResolvedValue(undefined);

    await service.trackUsage(1000, 500);

    expect(cacheMock.set).toHaveBeenCalled();
  });
});

describe("GeminiCostTrackerService > getDailyUsage", () => {
  it("should return daily usage from cache", async () => {
    const mockUsage = {
      tokens: { input: 1000, output: 500, total: 1500 },
      cost: 0.00025,
      requestCount: 2,
      lastUpdated: Date.now(),
    };

    cacheMock.get.mockResolvedValue(mockUsage);

    expect(await service.getDailyUsage()).toEqual(mockUsage);
  });

  it("should return null if no daily usage", async () => {
    cacheMock.get.mockResolvedValue(null);
    expect(await service.getDailyUsage()).toBeNull();
  });
});

describe("GeminiCostTrackerService > getMonthlyUsage", () => {
  it("should return monthly usage from cache", async () => {
    const mockUsage = {
      tokens: { input: 50000, output: 25000, total: 75000 },
      cost: 0.012,
      requestCount: 50,
      lastUpdated: Date.now(),
    };

    cacheMock.get.mockResolvedValue(mockUsage);

    expect(await service.getMonthlyUsage()).toEqual(mockUsage);
  });

  it("should return null if no monthly usage", async () => {
    cacheMock.get.mockResolvedValue(null);
    expect(await service.getMonthlyUsage()).toBeNull();
  });
});

describe("GeminiCostTrackerService > getCostSummary", () => {
  it("should return complete cost summary", async () => {
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

    cacheMock.get
      .mockResolvedValueOnce(dailyUsage)
      .mockResolvedValueOnce(monthlyUsage);

    const result = await service.getCostSummary();

    expect(result).toEqual({
      daily: {
        cost: 0.5,
        tokens: 1500,
        requests: 5,
        limitReached: false,
        percentOfLimit: 5,
      },
      monthly: {
        cost: 25.0,
        tokens: 75000,
        requests: 100,
        budget: 300.0,
        percentOfBudget: expect.any(Number) as unknown,
        quotaWarning: false,
      },
    });
  });

  it("should return empty summary if no usage data", async () => {
    cacheMock.get.mockResolvedValue(null);

    const result = await service.getCostSummary();

    expect(result.daily.cost).toBe(0);
    expect(result.daily.tokens).toBe(0);
    expect(result.monthly.cost).toBe(0);
    expect(result.monthly.tokens).toBe(0);
  });

  it("should indicate limit reached when daily cost exceeds limit", async () => {
    const dailyUsage = {
      tokens: { input: 1000000, output: 500000, total: 1500000 },
      cost: 15.0,
      requestCount: 1000,
      lastUpdated: Date.now(),
    };

    cacheMock.get.mockResolvedValueOnce(dailyUsage).mockResolvedValueOnce(null);

    const result = await service.getCostSummary();

    expect(result.daily.limitReached).toBe(true);
    expect(result.daily.percentOfLimit).toBe(150);
  });

  it("should indicate quota warning when monthly cost exceeds 80%", async () => {
    const monthlyUsage = {
      tokens: { input: 10000000, output: 5000000, total: 15000000 },
      cost: 250.0,
      requestCount: 5000,
      lastUpdated: Date.now(),
    };

    cacheMock.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(monthlyUsage);

    const result = await service.getCostSummary();

    expect(result.monthly.quotaWarning).toBe(true);
  });
});

describe("GeminiCostTrackerService > resetUsage", () => {
  it("should reset daily usage", async () => {
    cacheMock.delete.mockResolvedValue(true);
    await service.resetUsage("daily");
    expect(loggerMock.info).toHaveBeenCalledWith("Usage data reset", {
      period: "daily",
    });
  });

  it("should reset monthly usage", async () => {
    cacheMock.delete.mockResolvedValue(true);
    await service.resetUsage("monthly");
    expect(loggerMock.info).toHaveBeenCalledWith("Usage data reset", {
      period: "monthly",
    });
  });

  it("should reset all usage by default", async () => {
    cacheMock.delete.mockResolvedValue(true);
    await service.resetUsage();
    expect(loggerMock.info).toHaveBeenCalledWith("Usage data reset", {
      period: "all",
    });
  });

  it("should handle cache delete errors gracefully", async () => {
    cacheMock.delete.mockRejectedValue(new Error("Cache error"));
    await service.resetUsage("all");
    expect(loggerMock.info).toHaveBeenCalledWith("Usage data reset", {
      period: "all",
    });
  });
});

describe("GeminiCostTrackerService > cost alerts", () => {
  it("should trigger daily limit alert when limit is exceeded", async () => {
    const highCostUsage = {
      tokens: { input: 5000000, output: 2500000, total: 7500000 },
      cost: 9.5,
      requestCount: 100,
      lastUpdated: Date.now(),
    };

    cacheMock.get
      .mockResolvedValueOnce(highCostUsage)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await service.trackUsage(5000000, 2500000);

    const errorCalls = loggerMock.error.mock.calls;
    const hasLimitAlert = errorCalls.some(
      (call) =>
        typeof call[0] === "string" && call[0].includes("GEMINI COST ALERT"),
    );
    expect(hasLimitAlert).toBe(true);
  });

  it("should not send duplicate daily alerts", async () => {
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

    cacheMock.get
      .mockResolvedValueOnce(highCostUsage)
      .mockResolvedValueOnce(existingAlert)
      .mockResolvedValueOnce(null);

    await service.trackUsage(100000, 50000);

    const criticalCalls = loggerMock.error.mock.calls.filter(
      (call) =>
        typeof call[0] === "string" && call[0].includes("Daily limit exceeded"),
    );
    expect(criticalCalls.length).toBe(0);
  });
});

describe("GeminiCostTrackerService > cache fallback", () => {
  it("should fall back to memory store when cache unavailable", async () => {
    cacheMock.get.mockRejectedValue(new Error("Cache unavailable"));
    cacheMock.set.mockRejectedValue(new Error("Cache unavailable"));

    await expect(service.trackUsage(1000, 500)).resolves.toBeDefined();

    const debugMessages = loggerMock.debug.mock.calls.map(
      (call): unknown => call[0],
    );
    expect(
      debugMessages.some(
        (message) =>
          typeof message === "string" && message.includes("Cache unavailable"),
      ),
    ).toBe(true);
  });
});

describe("GeminiCostTrackerService > singleton export", () => {
  it("should export a singleton instance", () => {
    expect(geminiCostTracker).toBeDefined();
    expect(geminiCostTracker).toBeInstanceOf(GeminiCostTrackerService);
  });
});

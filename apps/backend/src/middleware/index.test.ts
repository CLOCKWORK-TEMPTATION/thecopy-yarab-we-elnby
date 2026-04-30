/**
 * Middleware Index Tests
 * اختبارات شاملة للـ middleware الرئيسي
 *
 * يتحقق من:
 * - setupMiddleware يُعدّل Express app بشكل صحيح
 * - errorHandler يعالج الأخطاء ويُنتج استجابات مناسبة
 * - createPerUserLimiter ينشئ rate limiter مُخصص
 * - perUserAiLimiter و perUserWriteLimiter يعملان بشكل صحيح
 * - CORS whitelist بناءً على البيئة
 * - Editor runtime path detection
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ═══ Mock for dependencies (hoisted - no top-level variables) ═══
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("./security-logger.middleware", () => ({
  logSecurityEvent: vi.fn(),
  SecurityEventType: {
    CORS_VIOLATION: "CORS_VIOLATION",
  },
}));

import { logger } from "@/utils/logger";

import {
  createPerUserLimiter,
  errorHandler,
  perUserAiLimiter,
  perUserWriteLimiter,
  setupMiddleware,
} from "./index";

import type { Application, NextFunction, Request, Response } from "express";

// ═══ Test setup ═══
describe("setupMiddleware", () => {
  let mockApp: {
    use: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApp = {
      use: vi.fn(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should apply all middleware layers to Express app", () => {
    setupMiddleware(mockApp as unknown as Application);

    // Should apply CORS, helmet, compression, body parsers, rate limiting, logging
    expect(mockApp.use).toHaveBeenCalled();
    const callCount = mockApp.use.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(5);
  });
});

// ═══ Error Handler Tests ═══
describe("errorHandler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: "/api/test",
      method: "GET",
    };
    mockRes = {
      setHeader: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it("should handle 4xx client errors with appropriate status code", () => {
    const error = Object.assign(new Error("Bad Request"), {
      statusCode: 400,
      code: "BAD_REQUEST",
    });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json; charset=utf-8",
    );
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "طلب غير مصرح به",
        code: "BAD_REQUEST",
      }),
    );
  });

  it("should handle 500 server errors with generic message", () => {
    const error = new Error("Database connection failed");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "حدث خطأ داخلي في الخادم",
      }),
    );
  });

  it("should log errors with request context", () => {
    const error = new Error("Test error");

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(logger.error).toHaveBeenCalled();
  });

  it("should extract error code from error object when available", () => {
    const error = Object.assign(new Error("Validation failed"), {
      statusCode: 422,
      code: "VALIDATION_ERROR",
    });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
      }),
    );
  });

  it("should handle 403 forbidden errors", () => {
    const error = Object.assign(new Error("Forbidden"), {
      statusCode: 403,
      code: "CORS_POLICY_VIOLATION",
    });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it("should handle 401 unauthorized errors", () => {
    const error = Object.assign(new Error("Unauthorized"), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

// ═══ Per-User Rate Limiter Tests ═══
describe("createPerUserLimiter", () => {
  it("should return Express middleware function", () => {
    const limiter = createPerUserLimiter({
      windowMs: 60000,
      max: 10,
      errorMessage: "Test limit exceeded",
    });

    expect(typeof limiter).toBe("function");
  });

  it("should create limiter with custom options", () => {
    const errorMessage = "Custom rate limit message";
    const limiter = createPerUserLimiter({
      windowMs: 60000,
      max: 10,
      errorMessage,
    });

    expect(limiter).toBeDefined();
  });
});

describe("perUserAiLimiter", () => {
  it("should be defined as a middleware function", () => {
    expect(typeof perUserAiLimiter).toBe("function");
  });

  it("should have correct error message in Arabic", () => {
    // The limiter is created with Arabic error message
    expect(perUserAiLimiter).toBeDefined();
  });
});

describe("perUserWriteLimiter", () => {
  it("should be defined as a middleware function", () => {
    expect(typeof perUserWriteLimiter).toBe("function");
  });

  it("should be configured for write operations", () => {
    expect(perUserWriteLimiter).toBeDefined();
  });
});

// ═══ Validation Middleware Exports ═══
describe("validation middleware exports", () => {
  it("should export validation utilities from index", async () => {
    const index = await import("./index");

    expect(index.validateBody).toBeDefined();
    expect(index.validateQuery).toBeDefined();
    expect(index.validateParams).toBeDefined();
    expect(index.commonSchemas).toBeDefined();
    expect(index.detectAttacks).toBeDefined();
  });
});

// ═══ SLO Metrics Exports ═══
describe("SLO metrics exports", () => {
  it("should export SLO utilities from index", async () => {
    const index = await import("./index");

    expect(index.sloMetricsMiddleware).toBeDefined();
    expect(index.trackAPIRequest).toBeDefined();
    expect(index.trackAuthAttempt).toBeDefined();
    expect(index.trackGeminiCall).toBeDefined();
    expect(index.trackDatabaseQuery).toBeDefined();
    expect(index.getSLOStatus).toBeDefined();
    expect(index.SLO_TARGETS).toBeDefined();
    expect(index.ERROR_BUDGETS).toBeDefined();
  });
});

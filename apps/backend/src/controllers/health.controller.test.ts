import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbExecute,
  mockRedisClient,
  mockCreateClient,
  mockGetRedisConfig,
  mockGetEditorIntegrationHealth,
  mockProbeHealth,
  mockWeaviateGetStatus,
  mockWeaviateHealthCheck,
  mockStatfs,
  mockGetAnalyticsHealth,
} = vi.hoisted(() => ({
  mockDbExecute: vi.fn(),
  mockRedisClient: {
    connect: vi.fn(),
    ping: vi.fn(),
    disconnect: vi.fn(),
  },
  mockCreateClient: vi.fn(),
  mockGetRedisConfig: vi.fn(),
  mockGetEditorIntegrationHealth: vi.fn(),
  mockProbeHealth: vi.fn(),
  mockWeaviateGetStatus: vi.fn(),
  mockWeaviateHealthCheck: vi.fn(),
  mockStatfs: vi.fn(),
  mockGetAnalyticsHealth: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  db: {
    execute: mockDbExecute,
  },
}));

vi.mock("redis", () => ({
  createClient: mockCreateClient,
}));

vi.mock("../config/redis.config.js", () => ({
  getRedisConfig: mockGetRedisConfig,
}));

vi.mock("@/editor/runtime", () => ({
  getEditorIntegrationHealth: mockGetEditorIntegrationHealth,
}));

vi.mock("@/services/platform-genai.service", () => ({
  platformGenAIService: {
    probeHealth: mockProbeHealth,
  },
}));

vi.mock("@/memory", () => ({
  weaviateStore: {
    getStatus: mockWeaviateGetStatus,
    healthCheck: mockWeaviateHealthCheck,
  },
}));

vi.mock("node:fs/promises", () => ({
  statfs: mockStatfs,
}));

vi.mock("@/utils/connectivity-telemetry", () => ({
  getAnalyticsHealth: mockGetAnalyticsHealth,
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { HealthController } from "./health.controller";

function createMockResponse(): Response & {
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const response = {
    json,
    status: vi.fn(),
  } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  response["status"].mockImplementation(() => response);
  return response;
}

describe("HealthController", () => {
  let controller: HealthController;
  let originalRedisEnabled: string | undefined;
  let originalRedisHost: string | undefined;

  beforeEach(() => {
    controller = new HealthController();
    vi.clearAllMocks();

    originalRedisEnabled = process.env['REDIS_ENABLED'];
    originalRedisHost = process.env['REDIS_HOST'];

    process.env['REDIS_ENABLED'] = "false";
    delete process.env['REDIS_HOST'];

    mockDbExecute.mockResolvedValue(undefined);
    mockCreateClient.mockReturnValue(mockRedisClient);
    mockGetRedisConfig.mockReturnValue({});
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.ping.mockResolvedValue("PONG");
    mockRedisClient.disconnect.mockResolvedValue(undefined);
    mockGetEditorIntegrationHealth.mockResolvedValue({ ok: true });
    mockProbeHealth.mockResolvedValue({
      status: "healthy",
      responseTime: 12,
      message: "AI provider responded to readiness probe.",
      details: {
        provider: "google-genai",
        credentialsConfigured: true,
      },
    });
    mockWeaviateGetStatus.mockReturnValue({
      enabled: false,
      required: false,
      state: "disabled",
    });
    mockWeaviateHealthCheck.mockResolvedValue(true);
    mockStatfs.mockResolvedValue({
      blocks: 1000,
      bavail: 500,
      bsize: 4096,
    });
    mockGetAnalyticsHealth.mockReturnValue({
      status: "healthy",
      lastSuccess: "2026-04-02T00:00:00.000Z",
      failureCount: 0,
    });
  });

  afterEach(() => {
    if (originalRedisEnabled === undefined) {
      delete process.env['REDIS_ENABLED'];
    } else {
      process.env['REDIS_ENABLED'] = originalRedisEnabled;
    }

    if (originalRedisHost === undefined) {
      delete process.env['REDIS_HOST'];
    } else {
      process.env['REDIS_HOST'] = originalRedisHost;
    }
  });

  it("returns not_ready when the AI provider probe fails", async () => {
    mockProbeHealth.mockResolvedValueOnce({
      status: "unhealthy",
      responseTime: 9,
      error:
        "GOOGLE_GENAI_API_KEY is configured but expired. Renew the key before using AI-backed routes.",
      details: {
        provider: "google-genai",
        credentialsConfigured: true,
      },
    });

    const res = createMockResponse();

    await controller.getReadiness({} as Request, res);

    expect(res["status"]).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "not_ready",
        checks: expect.objectContaining({
          external_services: expect.objectContaining({
            status: "unhealthy",
            error:
              "GOOGLE_GENAI_API_KEY is configured but expired. Renew the key before using AI-backed routes.",
          }),
        }),
      })
    );
  });

  it("reports unhealthy disk usage from real filesystem statistics instead of a mock value", async () => {
    mockStatfs.mockResolvedValueOnce({
      blocks: 100,
      bavail: 5,
      bsize: 4096,
    });

    const res = createMockResponse();

    await controller.getDetailedHealth({} as Request, res);

    expect(res["status"]).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "unhealthy",
        checks: expect.objectContaining({
          disk: expect.objectContaining({
            status: "unhealthy",
            error: "Disk usage (95%) exceeds limit (90%).",
            details: expect.objectContaining({
              totalBytes: 409600,
              usedBytes: 389120,
              availableBytes: 20480,
            }),
          }),
        }),
      })
    );
  });

  it("returns degraded health when optional weaviate is unavailable", async () => {
    mockWeaviateGetStatus
      .mockReturnValueOnce({
        enabled: true,
        required: false,
        state: "connecting",
        host: "http://localhost:8080",
      })
      .mockReturnValueOnce({
        enabled: true,
        required: false,
        state: "failed",
        host: "http://localhost:8080",
        lastError: "connection refused",
      });
    mockWeaviateHealthCheck.mockResolvedValueOnce(false);

    const res = createMockResponse();

    await controller.getHealth({} as Request, res);

    expect(res["status"]).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        checks: expect.objectContaining({
          weaviate: expect.objectContaining({
            status: "degraded",
            required: false,
          }),
        }),
      })
    );
  });

  it("returns not_ready when required weaviate is unavailable", async () => {
    mockWeaviateGetStatus
      .mockReturnValueOnce({
        enabled: true,
        required: true,
        state: "connecting",
        host: "http://localhost:8080",
      })
      .mockReturnValueOnce({
        enabled: true,
        required: true,
        state: "failed",
        host: "http://localhost:8080",
        lastError: "connection refused",
      });
    mockWeaviateHealthCheck.mockResolvedValueOnce(false);

    const res = createMockResponse();

    await controller.getReadiness({} as Request, res);

    expect(res["status"]).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "not_ready",
        checks: expect.objectContaining({
          weaviate: expect.objectContaining({
            status: "unhealthy",
            required: true,
          }),
        }),
      })
    );
  });
});

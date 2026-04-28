import { vi } from "vitest";

import type { Request, Response } from "express";

// Mock logger
export function setupLoggerMock() {
  return vi.mock("@/utils/logger", () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }));
}

// Mock env
export function setupEnvMock() {
  return vi.mock("@/config/env", () => ({
    env: {
      NODE_ENV: "test",
    },
  }));
}

export type MockFn = ReturnType<typeof vi.fn>;
export type MockResponse = Response & {
  json: MockFn;
  setHeader: MockFn;
  status: MockFn;
};

// Helper to create mock request
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    path: "/api/test",
    originalUrl: "/api/test",
    body: {},
    query: {},
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    cookies: {},
    ip: "192.168.1.100",
    socket: { remoteAddress: "192.168.1.100" },
    get: vi.fn((header: string) => {
      if (header === "User-Agent")
        return overrides.headers?.["user-agent"] ?? "Mozilla/5.0";
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
}

// Helper to create mock response
export function createMockResponse(): MockResponse {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as unknown as MockResponse;
}

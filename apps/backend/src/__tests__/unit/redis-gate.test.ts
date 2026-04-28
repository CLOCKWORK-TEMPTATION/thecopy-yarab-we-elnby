/**
 * Unit Tests - Redis Gate
 *
 * Verifies the isRedisEnabled() function from @/config/redis-gate correctly
 * reads environment variables to decide whether Redis should be used.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Redis Gate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when REDIS_ENABLED=false", async () => {
    process.env["REDIS_ENABLED"] = "false";
    process.env.REDIS_URL = "redis://localhost:6379";
    const { isRedisEnabled } = await import("@/config/redis-gate");
    expect(isRedisEnabled()).toBe(false);
  });

  it("returns false when no Redis connection config exists", async () => {
    delete process.env["REDIS_ENABLED"];
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    const { isRedisEnabled } = await import("@/config/redis-gate");
    expect(isRedisEnabled()).toBe(false);
  });

  it("returns true when REDIS_ENABLED is not false and REDIS_URL exists", async () => {
    process.env["REDIS_ENABLED"] = "true";
    process.env.REDIS_URL = "redis://localhost:6379";
    const { isRedisEnabled } = await import("@/config/redis-gate");
    expect(isRedisEnabled()).toBe(true);
  });

  it("returns true when REDIS_HOST is set", async () => {
    delete process.env["REDIS_ENABLED"];
    process.env.REDIS_HOST = "localhost";
    const { isRedisEnabled } = await import("@/config/redis-gate");
    expect(isRedisEnabled()).toBe(true);
  });
});

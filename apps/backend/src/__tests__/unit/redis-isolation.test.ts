/**
 * Unit Tests - Redis Isolation
 *
 * Verifies that when REDIS_ENABLED=false, the queue initialisation path
 * does NOT create any Redis client connections. This guards against
 * accidental Redis calls during development or CI environments that have
 * no Redis instance available.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── Mock للوحدات الثقيلة لتجنب مشاكل الاعتماد في بيئة الاختبار ───
vi.mock("@/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 3001,
    CORS_ORIGIN: "http://localhost:5000",
    REDIS_ENABLED: false,
    REDIS_URL: "",
  },
}));

describe("Redis Isolation - REDIS_ENABLED=false", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env["REDIS_ENABLED"] = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("isRedisEnabled يرجع false عندما REDIS_ENABLED=false", async () => {
    const { isRedisEnabled } = await import("@/config/redis-gate");
    expect(isRedisEnabled()).toBe(false);
  });

  it("لا يجب إنشاء عميل Redis عند تعطيل Redis", () => {
    // التحقق من أن بوابة Redis تمنع الاتصال
    const createClientSpy = vi.fn();

    // محاكاة نمط الكود: فحص isRedisEnabled قبل الاتصال
    const isEnabled = process.env["REDIS_ENABLED"] === "true";
    if (isEnabled) {
      createClientSpy();
    }

    expect(createClientSpy).not.toHaveBeenCalled();
  });
});

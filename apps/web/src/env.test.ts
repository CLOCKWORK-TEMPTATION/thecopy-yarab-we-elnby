/**
 * اختبارات وحدة — Environment Variable Validation [UTP-ENV]
 *
 * يتحقق من:
 * - أن clientEnv و serverEnv معرّفان بعد التحقق
 * - أن getApiKey ترمي على جانب العميل (browser)
 * - أن isSecureContext تعيد true/false حسب البيئة
 * - أن getEnvironmentInfo تحتوي البيانات الأساسية
 * - أن revalidateEnvironment يعمل دون انهيار
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Tests ───

describe("env — client-side (jsdom)", () => {
  it("clientEnv معرّف بعد التحقق", async () => {
    const { clientEnv } = await import("./env");
    expect(clientEnv).toBeDefined();
    expect(typeof clientEnv).toBe("object");
  });

  it("serverEnv معرّف (فارغ في بيئة المتصفح)", async () => {
    const { serverEnv } = await import("./env");
    expect(serverEnv).toBeDefined();
    expect(Object.keys(serverEnv)).toHaveLength(0);
  });

  it("getApiKey ترمي على جانب العميل", async () => {
    const { getApiKey } = await import("./env");
    expect(() => getApiKey()).toThrow(
      "getApiKey() can only be called on the server side"
    );
  });

  it("isSecureContext تعيد false في jsdom (بدون isSecureContext)", async () => {
    const { isSecureContext } = await import("./env");
    // jsdom لا يعرف isSecureContext افتراضيًا
    expect(isSecureContext()).toBe(false);
  });

  it("getEnvironmentInfo تحتوي nodeEnv و appEnv و isProduction و timestamp", async () => {
    const { getEnvironmentInfo } = await import("./env");
    const info = getEnvironmentInfo();

    expect(info.nodeEnv).toBe("client");
    expect(info.appEnv).toBeDefined();
    expect(typeof info.isProduction).toBe("boolean");
    expect(info.timestamp).toBeDefined();

    // timestamp يجب أن يكون ISO string صالح
    expect(() => new Date(info.timestamp)).not.toThrow();
    expect(new Date(info.timestamp).toISOString()).toBe(info.timestamp);
  });

  it("revalidateEnvironment يعمل دون انهيار في jsdom", async () => {
    const { revalidateEnvironment } = await import("./env");
    expect(() => revalidateEnvironment()).not.toThrow();

    const result = revalidateEnvironment();
    expect(result).toHaveProperty("client");
    expect(result).toHaveProperty("server");
  });
});

describe("env — server-side (محاكاة)", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    vi.resetModules();
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
  });

  it("validateEnvironment تعيد server و client كاملين عند غياب window", async () => {
    // إزالة window لمحاكاة بيئة الخادم
    // @ts-expect-error — إزالة window مقصودة لمحاكاة بيئة الخادم
    globalThis.window = undefined;

    vi.resetModules();
    const { serverEnv, clientEnv, revalidateEnvironment } =
      await import("./env");

    expect(serverEnv).toBeDefined();
    expect(clientEnv).toBeDefined();

    const result = revalidateEnvironment();
    expect(result.server).toBeDefined();
    expect(result.client).toBeDefined();

    // serverEnv يجب أن يحتوي NODE_ENV
    expect(serverEnv.NODE_ENV).toBeDefined();
  });

  it("getApiKey لا ترمي على جانب الخادم", async () => {
    // @ts-expect-error — إزالة window مقصودة لمحاكاة بيئة الخادم
    globalThis.window = undefined;

    vi.resetModules();
    const { getApiKey } = await import("./env");

    // إذا لم تُعطَّل مفاتيح API، يجب أن تعيد سلسلة فارغة
    expect(() => getApiKey()).not.toThrow();
    expect(typeof getApiKey()).toBe("string");
  });
});

describe("env — edge cases & security", () => {
  it("لا يوجد متغيرات server secrets في clientEnv", async () => {
    const { clientEnv } = await import("./env");
    const clientKeys = Object.keys(clientEnv);

    const forbiddenPrefixes = [
      "GEMINI_API_KEY_STAGING",
      "GEMINI_API_KEY_PROD",
      "SENTRY_AUTH_TOKEN",
      "JWT_SECRET",
    ];

    for (const key of clientKeys) {
      for (const forbidden of forbiddenPrefixes) {
        expect(key).not.toBe(forbidden);
      }
    }
  });

  it("جميع مفاتيح clientEnv تبدأ بـ NEXT_PUBLIC_ أو هي حقول معروفة", async () => {
    const { clientEnv } = await import("./env");
    const knownNonPrefixed = ["NEXT_PUBLIC_APP_ENV", "NEXT_PUBLIC_ENVIRONMENT"];

    for (const key of Object.keys(clientEnv)) {
      const isKnown = knownNonPrefixed.includes(key);
      const isPublicPrefixed = key.startsWith("NEXT_PUBLIC_");
      expect(isKnown || isPublicPrefixed).toBe(true);
    }
  });

  it("revalidateEnvironment يعيد نفس البنية في كل استدعاء", async () => {
    const { revalidateEnvironment } = await import("./env");
    const first = revalidateEnvironment();
    const second = revalidateEnvironment();

    expect(typeof first).toBe("object");
    expect(typeof second).toBe("object");
    expect(Object.keys(first).sort()).toEqual(Object.keys(second).sort());
  });

  it("الفحص الأمني يرمي عند وجود server secrets في بيئة غير test", async () => {
    const env = process.env as Record<string, string | undefined>;
    const originalNodeEnv = env["NODE_ENV"];
    env["NODE_ENV"] = "development";
    env["GEMINI_API_KEY_STAGING"] = "fake-secret";

    vi.resetModules();
    const importPromise = import("./env");

    await expect(importPromise).rejects.toBeInstanceOf(Error);
    await expect(importPromise).rejects.toThrow(
      "Security violation: Server secrets exposed to client"
    );

    env["NODE_ENV"] = originalNodeEnv;
    delete env["GEMINI_API_KEY_STAGING"];
  });
});

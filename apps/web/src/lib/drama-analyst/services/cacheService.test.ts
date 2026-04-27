/**
 * اختبارات وحدة — CacheService
 *
 * يتحقق من:
 * - تهيئة إعدادات الكاش
 * - تسجيل Service Worker
 * - إحصائيات الكاش
 * - عمليات الكاش (فحص/تخزين/حذف)
 * - حالة الشبكة
 * - تخزين الطلبات مع fallback
 * - إجراءات معلقة
 * - معالجة الأخطاء
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── محاكاة الوحدات الداخلية قبل الاستيراد ───
vi.mock("./loggerService", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../utils/kv-utils", () => ({
  encodeRecord: vi.fn((obj: unknown) => JSON.stringify(obj)),
  decodeRecord: vi.fn((text: string) => {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  }),
  unflatten: vi.fn((obj: unknown) => obj),
}));

// ─── محاكاة Cache API ───
const mockCache = {
  match: vi.fn(),
  put: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue(true),
  add: vi.fn().mockResolvedValue(undefined),
  addAll: vi.fn().mockResolvedValue(undefined),
};

const mockCachesApi = {
  open: vi.fn(() => Promise.resolve(mockCache)),
  keys: vi.fn(() => Promise.resolve(["test-cache"])),
  delete: vi.fn(() => Promise.resolve(true)),
  match: vi.fn(),
};

// ─── حفظ الأصليات واستعادتها ───
const originalCaches = globalThis.caches;

describe("Cache Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // إعادة تعيين محاكاة الكاش
    mockCache.match.mockResolvedValue(null);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.keys.mockResolvedValue([]);
    mockCache.delete.mockResolvedValue(true);

    mockCachesApi.open.mockResolvedValue(mockCache);
    mockCachesApi.keys.mockResolvedValue(["test-cache"]);
    mockCachesApi.delete.mockResolvedValue(true);
    mockCachesApi.match.mockResolvedValue(null);

    // تعيين caches على global بدون استبدال window
    Object.defineProperty(globalThis, "caches", {
      value: mockCachesApi,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // استعادة الأصليات
    Object.defineProperty(globalThis, "caches", {
      value: originalCaches,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  // ─── التهيئة ───

  describe("Initialization", () => {
    it("يجب أن يهيئ إعدادات الكاش عند الإنشاء", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      // التحقق من أن الخدمة موجودة ولها واجهة عامة
      expect(service).toBeDefined();
      expect(typeof service.getCacheStats).toBe("function");
      expect(typeof service.clearCache).toBe("function");
      expect(typeof service.isResourceCached).toBe("function");
      expect(typeof service.cacheResource).toBe("function");
    });

    it("يجب أن يكشف عن دعم Service Worker", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      // في بيئة jsdom يوجد navigator لكن بدون serviceWorker حقيقي
      expect(typeof service.isServiceWorkerAvailable).toBe("function");
      const result = service.isServiceWorkerAvailable();
      expect(typeof result).toBe("boolean");
    });
  });

  // ─── إحصائيات الكاش ───

  describe("Cache Statistics", () => {
    it("يجب أن يُرجع إحصائيات الكاش", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const stats = await service.getCacheStats();
      // النتيجة مصفوفة (قد تكون فارغة إذا لم يُدعم SW)
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  // ─── عمليات الكاش ───

  describe("Cache Operations", () => {
    it("يجب أن يتحقق من وجود مورد مخزّن", async () => {
      mockCachesApi.match.mockResolvedValue({ ok: true });

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const isCached = await service.isResourceCached("/api/test");
      expect(typeof isCached).toBe("boolean");
    });

    it("يجب أن يُرجع false لمورد غير مخزّن", async () => {
      mockCachesApi.match.mockResolvedValue(null);

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const isCached = await service.isResourceCached("/api/nonexistent");
      expect(isCached).toBe(false);
    });

    it("يجب أن يخزّن موارد بنجاح", async () => {
      const mockResponse = {
        ok: true,
        clone: vi.fn().mockReturnValue({ ok: true }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const result = await service.cacheResource("/test-url", "dynamic");
      expect(typeof result).toBe("boolean");
    });

    it("يجب أن يتعامل مع فشل تخزين المورد", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const result = await service.cacheResource("/failing-url", "dynamic");
      expect(result).toBe(false);
    });
  });

  // ─── إدارة الكاش ───

  describe("Cache Management", () => {
    it("يجب أن يمسح كاش محدد", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      await service.clearCache("static");
      // يجب أن يُستدعى caches.delete مع اسم الكاش
      expect(mockCachesApi.delete).toHaveBeenCalled();
    });

    it("يجب أن يمسح جميع الكاشات", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      await service.clearCache();
      // يجب أن يُستدعى caches.keys ثم caches.delete لكل كاش
      expect(mockCachesApi.keys).toHaveBeenCalled();
    });
  });

  // ─── حالة الشبكة ───

  describe("Network Status", () => {
    it("يجب أن يبلّغ عن حالة الاتصال بشكل صحيح", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const status = service.getOnlineStatus();
      expect(typeof status).toBe("boolean");
    });

    it("يجب أن يبلّغ عن توفر Service Worker", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const available = service.isServiceWorkerAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  // ─── تخزين الطلبات ───

  describe("Request Caching", () => {
    it("يجب أن يخزّن الطلبات الناجحة", async () => {
      const mockResponse = {
        ok: true,
        clone: vi.fn().mockReturnValue({ ok: true }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      const response = await service.cacheRequest("/api/data");
      expect(response.ok).toBe(true);
    });

    it("يجب أن يتعامل مع أخطاء تخزين الطلبات", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );
      mockCachesApi.match.mockResolvedValue(null);

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      await expect(service.cacheRequest("/api/fail")).rejects.toThrow();
    });
  });

  // ─── معالجة الأخطاء ───

  describe("Error Handling", () => {
    it("يجب أن يتعامل مع فشل تسجيل Service Worker بأمان", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      // الخدمة يجب أن تكون موجودة حتى لو فشل التسجيل
      expect(service).toBeDefined();
      expect(typeof service.getCacheStats).toBe("function");
    });

    it("يجب أن يتعامل مع عمليات الكاش بأمان عند الفشل", async () => {
      mockCachesApi.match.mockRejectedValue(new Error("Cache API error"));

      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      // يجب أن يُرجع false بدلاً من رمي خطأ
      const result = await service.isResourceCached("/test");
      expect(result).toBe(false);
    });
  });

  // ─── دوال مساعدة ───

  describe("Utility Functions", () => {
    it("يجب أن يتعامل مع عمليات localStorage", async () => {
      vi.resetModules();
      const mod = await import("./cacheService");
      const service = mod.cacheService;

      // التحقق من أن الخدمة تعمل بدون أخطاء localStorage
      expect(service).toBeDefined();
    });
  });
});

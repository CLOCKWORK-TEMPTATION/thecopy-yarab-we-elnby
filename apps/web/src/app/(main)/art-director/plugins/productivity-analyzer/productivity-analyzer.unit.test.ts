/**
 * اختبار وحدة: ProductivityAnalyzer plugin — إصلاح A1
 *
 * يتحقق من:
 * - reportDelay يقبل الإدخال بدون taskId ويُخزّن التأخير
 * - analyzePerformance يُرجع delayHours محسوباً من التأخيرات المسجّلة
 * - القيمة تتغير فوراً بعد الإبلاغ دون الحاجة لإعادة تحميل
 *
 * قاعدة الفحوصات: يُحظر إضعاف هذا الملف أو تخفيف توقعاته.
 */
import { beforeEach, describe, expect, it } from "vitest";

// استيراد الـ plugin مباشرة بدون الحاجة لـ PluginManager
// نختبر السلوك الداخلي عبر الـ public interface
import { PerformanceProductivityAnalyzer as ProductivityAnalyzerPlugin } from "./index";

describe("A1 — ProductivityAnalyzer: reportDelay + delayHours", () => {
  let plugin: ProductivityAnalyzerPlugin;

  beforeEach(() => {
    plugin = new ProductivityAnalyzerPlugin();
    plugin.initialize();
  });

  // ─── T01: reportDelay بدون taskId ───────────────────────────────────────
  describe("T01: reportDelay يقبل الإدخال بدون taskId", () => {
    it("يُرجع success:true عند إرسال reason + hoursLost فقط", () => {
      const result = plugin.execute({
        type: "report-delay",
        data: {
          reason: "تأخر في توريد المعدات",
          hoursLost: 2.5,
          impact: "medium",
        },
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("يُرجع error عند غياب reason", () => {
      const result = plugin.execute({
        type: "report-delay",
        data: {
          hoursLost: 2.5,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("يُرجع error عند غياب hoursLost", () => {
      const result = plugin.execute({
        type: "report-delay",
        data: {
          reason: "سبب التأخير",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("يقبل taskId إن أُرسل (التوافق مع الطلبات القديمة)", () => {
      const result = plugin.execute({
        type: "report-delay",
        data: {
          taskId: "task-123",
          reason: "تأخر اختبار",
          hoursLost: 1,
        },
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── T02: delayHours يتحدث بعد الإبلاغ ─────────────────────────────────
  describe("T02: delayHours = مجموع كل التأخيرات المسجّلة", () => {
    it("delayHours = 0 قبل أي إبلاغ", () => {
      const result = plugin.execute({ type: "analyze", data: {} });

      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data["delayHours"]).toBe(0);
    });

    it("delayHours = 2.5 بعد إبلاغ واحد بـ 2.5 ساعة", () => {
      plugin.execute({
        type: "report-delay",
        data: { reason: "تأخر", hoursLost: 2.5 },
      });

      const result = plugin.execute({ type: "analyze", data: {} });
      const data = result.data!;

      expect(data["delayHours"]).toBe(2.5);
    });

    it("delayHours = مجموع إبلاغين: 2.5 + 1 = 3.5", () => {
      plugin.execute({
        type: "report-delay",
        data: { reason: "تأخر أول", hoursLost: 2.5 },
      });
      plugin.execute({
        type: "report-delay",
        data: { reason: "تأخر ثانٍ", hoursLost: 1 },
      });

      const result = plugin.execute({ type: "analyze", data: {} });
      const data = result.data!;

      expect(data["delayHours"]).toBe(3.5);
    });

    it("delayHours يتحدث فورياً بعد كل إبلاغ (بدون إعادة تهيئة)", () => {
      // لقطة 1: قبل الإبلاغ
      const before = plugin.execute({ type: "analyze", data: {} });
      const beforeData = before.data!;
      expect(beforeData["delayHours"]).toBe(0);

      // إبلاغ
      plugin.execute({
        type: "report-delay",
        data: { reason: "تأخر مفاجئ", hoursLost: 2.5 },
      });

      // لقطة 2: بعد الإبلاغ مباشرة — نفس الـ instance
      const after = plugin.execute({ type: "analyze", data: {} });
      const afterData = after.data!;
      expect(afterData["delayHours"]).toBe(2.5);
    });
  });

  // ─── T03: شكل الاستجابة يطابق ProductivityAnalysis ──────────────────────
  describe("T03: استجابة analyze تطابق شكل ProductivityAnalysis", () => {
    it("الاستجابة تحتوي على الحقول المطلوبة", () => {
      const result = plugin.execute({ type: "analyze", data: {} });
      const data = result.data!;

      expect(typeof data["delayHours"]).toBe("number");
      expect(typeof data["totalHours"]).toBe("number");
      expect(typeof data["taskCount"]).toBe("number");
      expect(typeof data["completionRate"]).toBe("number");
      expect(data).toHaveProperty("period");
      expect(data).toHaveProperty("department");
    });

    it("completionRate بين 0 و 100", () => {
      const result = plugin.execute({ type: "analyze", data: {} });
      const data = result.data!;
      const rate = data["completionRate"] as number;

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });
});

/**
 * اختبار أمني: snapshot يرفض تسريب أخطاء تقنية في DOM
 *
 * M1.3 (B2): يتحقق من أن رسائل الخطأ المعروضة للمستخدم
 * لا تحتوي على: DOCTYPE / JSON.parse / stack / Error:
 *
 * قاعدة الفحوصات: يُحظر إضعاف هذه الاختبارات أو تخفيف regex patterns.
 */
import { describe, expect, it } from "vitest";

// ─── الأنماط المحظورة في أي نص يصل للمستخدم ────────────────────────────────
const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /<!DOCTYPE/i,   label: "DOCTYPE — صفحة HTML خام" },
  { pattern: /JSON\.parse/i, label: "JSON.parse — خطأ JavaScript خام" },
  { pattern: /\bstack\b/i,   label: "stack — stack trace مكشوف" },
  { pattern: /\bError:/,     label: "Error: — خطأ JavaScript خام" },
  { pattern: /Cannot (GET|POST)/i, label: "Cannot GET/POST — رسالة Express خام" },
  { pattern: /SyntaxError/i, label: "SyntaxError — خطأ تحليل JSON مكشوف" },
  { pattern: /at Object\./,  label: "at Object. — stack frame مكشوف" },
  { pattern: /at Function\./, label: "at Function. — stack frame مكشوف" },
  { pattern: /node_modules/,  label: "node_modules — مسار ملف مكشوف" },
];

// ─── رسائل الخطأ المعتمدة (القائمة البيضاء) ─────────────────────────────────
const APPROVED_MESSAGES: string[] = [
  "تعذّر المعالجة، حاول لاحقاً",
  "حدث خطأ أثناء التحليل",
  "بيانات التحليل غير صحيحة، راجع النص ثم حاول مرة أخرى.",
  "انتهت صلاحية جلسة التحليل، أعد فتح الصفحة وحاول مرة أخرى.",
  "جلسة التحليل غير متاحة لهذا المتصفح.",
  "خدمة التحليل غير متاحة الآن، حاول مرة أخرى بعد لحظات.",
  "استغرق طلب التحليل وقتاً أطول من المتوقع.",
  "حالة التحليل الحالية لا تسمح بتنفيذ هذا الإجراء.",
  "النص المدخل أكبر من الحد المسموح.",
  "تم الوصول إلى حد الطلبات مؤقتاً، انتظر قليلاً ثم حاول مرة أخرى.",
  "حدث خطأ داخلي أثناء التحليل.",
  "خدمة التحليل غير متاحة الآن.",
  "خدمة التحليل مشغولة الآن.",
  "انتهت مهلة الاتصال بخدمة التحليل.",
  "تعذر تنفيذ طلب التحليل.",
  "تعذر الاتصال بخدمة التحليل. تحقق من الشبكة وحاول مرة أخرى.",
];

// ─── دالة المساعدة: تتحقق من نظافة النص ────────────────────────────────────
function assertCleanUserMessage(text: string, context?: string): void {
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    expect(
      pattern.test(text),
      `[${context ?? "message"}] يحتوي على "${label}" المحظور: "${text.slice(0, 120)}"`
    ).toBe(false);
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe("M1.3 (B2) — Snapshot أمني: رسائل الخطأ للمستخدم نظيفة", () => {

  describe("القائمة البيضاء المعتمدة: كل رسالة نظيفة", () => {
    for (const message of APPROVED_MESSAGES) {
      it(`✓ "${message.slice(0, 50)}..."`, () => {
        expect.hasAssertions();
        assertCleanUserMessage(message, "approved-message");
      });
    }
  });

  describe("رفض الأنماط المحظورة: snapshot test", () => {
    it("رفض DOCTYPE في DOM", () => {
      const maliciousMessage = "<!DOCTYPE html><html><body>Error</body></html>";
      expect(FORBIDDEN_PATTERNS[0]!.pattern.test(maliciousMessage)).toBe(true);
      // التأكد أن دالة التحقق ترفضه
      expect(() => assertCleanUserMessage(maliciousMessage)).toThrow();
    });

    it("رفض JSON.parse في رسالة الخطأ", () => {
      const leaked = "Unexpected token < in JSON at position 0 — JSON.parse error";
      expect(FORBIDDEN_PATTERNS[1]!.pattern.test(leaked)).toBe(true);
    });

    it("رفض stack trace مكشوف", () => {
      const leaked = "Error: فشل\nstack:\n    at Object.handler (server.js:42:5)";
      expect(FORBIDDEN_PATTERNS[2]!.pattern.test(leaked)).toBe(true);
      expect(FORBIDDEN_PATTERNS[3]!.pattern.test(leaked)).toBe(true);
    });

    it("رفض Cannot POST من Express", () => {
      const leaked = "Cannot POST /api/analysis/start";
      expect(FORBIDDEN_PATTERNS[4]!.pattern.test(leaked)).toBe(true);
    });

    it("رفض SyntaxError", () => {
      const leaked = "SyntaxError: Unexpected token < in JSON at position 0";
      expect(FORBIDDEN_PATTERNS[5]!.pattern.test(leaked)).toBe(true);
    });

    it("رفض stack frames", () => {
      const leaked = "    at Object.runMiddleware (express/lib/router/index.js:284:7)";
      expect(leaked).toMatch(FORBIDDEN_PATTERNS[6]!.pattern);
    });

    it("رفض مسارات node_modules", () => {
      const leaked = "/usr/local/node_modules/express/lib/application.js:220";
      expect(leaked).toMatch(FORBIDDEN_PATTERNS[8]!.pattern);
    });
  });

  describe("رسائل traceId: مقبولة لأنها لا تكشف تفاصيل تقنية", () => {
    it("رسالة مع traceId بدون تفاصيل تقنية — مقبولة", () => {
      expect.hasAssertions();
      const message = "تعذّر المعالجة، حاول لاحقاً (TR-abc123-def456)";
      assertCleanUserMessage(message, "traceId-message");
    });

    it("traceId UUID فقط — مقبول", () => {
      expect.hasAssertions();
      const traceId = "550e8400-e29b-41d4-a716-446655440000";
      assertCleanUserMessage(traceId, "uuid-traceId");
    });
  });

  describe("i18n: كل رسالة معتمدة يجب أن تكون بالعربية", () => {
    it("كل الرسائل المعتمدة تحتوي على حروف عربية", () => {
      const arabicPattern = /[؀-ۿ]/;
      for (const message of APPROVED_MESSAGES) {
        expect(
          arabicPattern.test(message),
          `الرسالة غير عربية: "${message}"`
        ).toBe(true);
      }
    });
  });
});

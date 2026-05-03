// ============================================================================
// اختبار صرامة عدّاد الكلمات العربي
// ============================================================================
// مرتبط مباشرة بإصلاح P0-1 الموثَّق:
//   "عداد الكلمات لا يتحدث مع الكتابة الحية رغم أن عداد الحروف يتحدث."
//
// قاعدة منع إضعاف الفحوصات: هذه الحالات لا يجوز تخفيفها.
// كل حالة فشل في عدّاد الكلمات سابقاً تظهر هنا كـ test يُمنع تحويله
// إلى warning أو تخطّيه.

import { describe, expect, it } from "vitest";

import {
  computeDocumentStats,
  countArabicCharacters,
  countArabicWords,
} from "../editor-area-format-utils";

describe("countArabicWords", () => {
  it("يُرجع صفراً للنص الفارغ", () => {
    expect(countArabicWords("")).toBe(0);
    expect(countArabicWords("   ")).toBe(0);
  });

  it("يحتسب الكلمات العربية بدقة", () => {
    expect(countArabicWords("هذا اختبار")).toBe(2);
    expect(countArabicWords("مرحباً بكم في محرر السيناريو")).toBe(5);
  });

  it("يتجاهل محارف الاتجاه RLM/LRM/RLO", () => {
    // U+200F RLM, U+200E LRM, U+202E RLO
    const withMarks = "كلمة‏كلمة‎ثالثة";
    // المحارف نفسها تُزال، فيُترك "كلمةكلمةثالثة" ككلمة واحدة.
    expect(countArabicWords(withMarks)).toBe(1);
    expect(countArabicWords("كلمة‏ كلمة‎ ثالثة")).toBe(3);
  });

  it("يعالج المسافة غير القاطعة U+00A0 كفاصل", () => {
    const nbsp = "كلمة كلمة ثالثة";
    expect(countArabicWords(nbsp)).toBe(3);
  });

  it("يحتسب الأرقام العربية والهندية ككلمات", () => {
    expect(countArabicWords("١٢٣ كلمة")).toBe(2);
    expect(countArabicWords("123 كلمة")).toBe(2);
  });

  it("لا يحتسب علامات الترقيم وحدها ككلمات", () => {
    expect(countArabicWords("،")).toBe(1); // الفاصلة العربية تعتبر "كلمة" — مقبول
    expect(countArabicWords("    ")).toBe(0);
  });

  it("يتعامل مع نصوص طويلة بكفاءة", () => {
    const long = ("كلمة ".repeat(1000)).trim();
    expect(countArabicWords(long)).toBe(1000);
  });

  it("يعالج النص المختلط عربي/إنجليزي", () => {
    expect(countArabicWords("hello مرحبا world")).toBe(3);
  });
});

describe("countArabicCharacters", () => {
  it("يحسب الحروف بدون مسافات", () => {
    expect(countArabicCharacters("ابج")).toBe(3);
    expect(countArabicCharacters("ا ب ج")).toBe(3);
  });

  it("يتجاهل محارف الاتجاه", () => {
    expect(countArabicCharacters("ا‏ب‎ج")).toBe(3);
  });

  it("يعالج المسافات غير القاطعة", () => {
    expect(countArabicCharacters("ا ب")).toBe(2);
  });
});

describe("computeDocumentStats", () => {
  it("يحدّث عدد الكلمات والحروف معاً عند الكتابة", () => {
    const before = computeDocumentStats("بداية", "<div>بداية</div>", 1);
    const after = computeDocumentStats(
      "بداية المشهد جديدة",
      "<div>بداية المشهد جديدة</div>",
      1,
    );
    expect(after.words).toBeGreaterThan(before.words);
    expect(after.characters).toBeGreaterThan(before.characters);
  });

  it("يحتسب المشاهد عبر data-type=scene_header", () => {
    const html =
      '<div data-type="scene_header_top_line">م 1</div><div data-type="scene_header_3">المكان</div>';
    const stats = computeDocumentStats("نص", html, 1);
    expect(stats.scenes).toBe(2);
  });
});

// اختبار صارم: empty response لا يمر كنجاح.
// هذا الاختبار مرتبط مباشرة بفشل development الموثَّق:
//   "نفّذت المهمة 'إكمال النص' لكن لم تُرجع أي محتوى"

import { describe, expect, it } from "vitest";

import {
  assertActorAnalysisNotEmpty,
  assertModelTextNotEmpty,
  assertToolResultNotEmpty,
} from "../index.js";

describe("assertModelTextNotEmpty", () => {
  it("يرفع model_empty عند نص فارغ", () => {
    expect(() => assertModelTextNotEmpty("")).toThrow(/قابلاً للاستخدام/);
  });

  it("يرفع model_empty عند مسافات بيضاء فقط", () => {
    expect(() => assertModelTextNotEmpty("   \n\t")).toThrow(/قابلاً للاستخدام/);
  });

  it("يرفع model_empty عند placeholder عربي", () => {
    expect(() =>
      assertModelTextNotEmpty("نفّذت المهمة لم تُرجع أي محتوى"),
    ).toThrow(/قابلاً للاستخدام/);
  });

  it("يرفع model_empty عند placeholder إنجليزي", () => {
    expect(() => assertModelTextNotEmpty("no content returned")).toThrow(
      /قابلاً للاستخدام/,
    );
  });

  it("يرفع model_empty عند null/undefined", () => {
    expect(() => assertModelTextNotEmpty(null)).toThrow();
    expect(() => assertModelTextNotEmpty(undefined)).toThrow();
  });

  it("يقبل نصاً عربياً صحيحاً", () => {
    const result = assertModelTextNotEmpty("هذا تحليل فعلي للمشهد.");
    expect(result).toBe("هذا تحليل فعلي للمشهد.");
  });
});

describe("assertToolResultNotEmpty", () => {
  it("يرفع model_empty عند null", () => {
    expect(() => assertToolResultNotEmpty(null)).toThrow();
  });

  it("يرفع model_empty عند content فارغ بدون sections", () => {
    expect(() =>
      assertToolResultNotEmpty({ toolId: "complete-text", title: "إكمال", content: "" }),
    ).toThrow();
  });

  it("يقبل sections بمحتوى صالح حتى لو content فارغ", () => {
    const result = assertToolResultNotEmpty({
      toolId: "x",
      title: "y",
      content: "",
      sections: [{ title: "قسم", body: "نص" }],
    });
    expect(result.sections).toHaveLength(1);
  });

  it("يرفض sections كلها فارغة", () => {
    expect(() =>
      assertToolResultNotEmpty({
        toolId: "x",
        title: "y",
        content: "",
        sections: [{ title: "قسم", body: "  " }],
      }),
    ).toThrow();
  });
});

describe("assertActorAnalysisNotEmpty", () => {
  it("يرفض output كل حقوله فارغة", () => {
    expect(() =>
      assertActorAnalysisNotEmpty({
        characterNotes: [],
        beats: [],
        objectives: [],
        subtext: [],
        performanceGuidance: [],
      }),
    ).toThrow(/قابل للاستخدام/);
  });

  it("يقبل output يحتوي بياناً واحداً على الأقل", () => {
    const result = assertActorAnalysisNotEmpty({
      characterNotes: ["ملاحظة"],
      beats: [],
      objectives: [],
      subtext: [],
      performanceGuidance: [],
    });
    expect(result.characterNotes).toEqual(["ملاحظة"]);
  });
});

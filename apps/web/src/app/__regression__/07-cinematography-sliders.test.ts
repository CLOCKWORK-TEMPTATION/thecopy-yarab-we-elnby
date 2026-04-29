/**
 * شبكة انحدار: cinematography — المنزلقات الحرجة تستجيب
 *
 * يتحقق من:
 * - Zod schemas تقبل القيم الصحيحة وترفض غيرها
 * - تحويل المرحلة ↔ التبويب يعمل في الاتجاهين
 * - دوال التحقق isValidTabValue و isValidVisualMood
 * - ScenePromptSchema و ColorTemperatureSchema و ShotAnalysisSchema
 */
import { describe, it, expect } from "vitest";

import {
  PRODUCTION_PHASES,
  TAB_VALUES,
  VISUAL_MOODS,
  VIEW_MODES,
  PhaseSchema,
  VisualMoodSchema,
  ViewModeSchema,
  ShotAnalysisSchema,
  CineStudioStateSchema,
  ColorHexSchema,
  TAB_VALUE_BY_PHASE,
  PHASE_BY_TAB,
  isValidTabValue,
  isValidVisualMood,
  validateScenePrompt,
  validateColorTemperature,
} from "@/app/(main)/cinematography-studio/types";

describe("شبكة انحدار: cinematography — الثوابت", () => {
  it("PRODUCTION_PHASES تحتوي pre و production و post", () => {
    expect(PRODUCTION_PHASES).toEqual(["pre", "production", "post"]);
  });

  it("TAB_VALUES تحتوي 3 قيم", () => {
    expect(TAB_VALUES).toHaveLength(3);
    expect(TAB_VALUES).toContain("pre-production");
    expect(TAB_VALUES).toContain("production");
    expect(TAB_VALUES).toContain("post-production");
  });

  it("VISUAL_MOODS تحتوي 4 أمزجة", () => {
    expect(VISUAL_MOODS).toEqual(["noir", "realistic", "surreal", "vintage"]);
  });

  it("VIEW_MODES تحتوي dashboard و phases", () => {
    expect(VIEW_MODES).toEqual(["dashboard", "phases"]);
  });
});

describe("شبكة انحدار: cinematography — خرائط التحويل", () => {
  it("TAB_VALUE_BY_PHASE يحوّل كل مرحلة لقيمة تبويب", () => {
    expect(TAB_VALUE_BY_PHASE.pre).toBe("pre-production");
    expect(TAB_VALUE_BY_PHASE.production).toBe("production");
    expect(TAB_VALUE_BY_PHASE.post).toBe("post-production");
  });

  it("PHASE_BY_TAB يحوّل كل تبويب لمرحلة", () => {
    expect(PHASE_BY_TAB["pre-production"]).toBe("pre");
    expect(PHASE_BY_TAB.production).toBe("production");
    expect(PHASE_BY_TAB["post-production"]).toBe("post");
  });

  it("التحويل ذهاباً وإياباً يعيد القيمة الأصلية", () => {
    for (const phase of PRODUCTION_PHASES) {
      const tab = TAB_VALUE_BY_PHASE[phase];
      const backToPhase = PHASE_BY_TAB[tab];
      expect(backToPhase).toBe(phase);
    }
  });
});

describe("شبكة انحدار: cinematography — دوال التحقق", () => {
  it("isValidTabValue تقبل القيم الصحيحة", () => {
    expect(isValidTabValue("pre-production")).toBe(true);
    expect(isValidTabValue("production")).toBe(true);
    expect(isValidTabValue("post-production")).toBe(true);
  });

  it("isValidTabValue ترفض القيم الخاطئة", () => {
    expect(isValidTabValue("invalid")).toBe(false);
    expect(isValidTabValue("")).toBe(false);
    expect(isValidTabValue("PRE-PRODUCTION")).toBe(false);
  });

  it("isValidVisualMood تقبل القيم الصحيحة", () => {
    for (const mood of VISUAL_MOODS) {
      expect(isValidVisualMood(mood)).toBe(true);
    }
  });

  it("isValidVisualMood ترفض القيم الخاطئة", () => {
    expect(isValidVisualMood("bright")).toBe(false);
    expect(isValidVisualMood("")).toBe(false);
  });
});

describe("شبكة انحدار: cinematography — Zod Schemas Basic", () => {
  it("PhaseSchema يقبل المراحل الصحيحة فقط", () => {
    expect(PhaseSchema.safeParse("pre").success).toBe(true);
    expect(PhaseSchema.safeParse("production").success).toBe(true);
    expect(PhaseSchema.safeParse("post").success).toBe(true);
    expect(PhaseSchema.safeParse("invalid").success).toBe(false);
  });

  it("VisualMoodSchema يقبل الأمزجة الصحيحة فقط", () => {
    expect(VisualMoodSchema.safeParse("noir").success).toBe(true);
    expect(VisualMoodSchema.safeParse("fantasy").success).toBe(false);
  });

  it("ViewModeSchema يقبل dashboard و phases فقط", () => {
    expect(ViewModeSchema.safeParse("dashboard").success).toBe(true);
    expect(ViewModeSchema.safeParse("phases").success).toBe(true);
    expect(ViewModeSchema.safeParse("list").success).toBe(false);
  });

  it("ColorHexSchema يقبل #RRGGBB فقط", () => {
    expect(ColorHexSchema.safeParse("#FF0000").success).toBe(true);
    expect(ColorHexSchema.safeParse("#abc123").success).toBe(true);
    expect(ColorHexSchema.safeParse("FF0000").success).toBe(false);
    expect(ColorHexSchema.safeParse("#GGG000").success).toBe(false);
  });
});

describe("شبكة انحدار: cinematography — Zod Schemas Advanced", () => {
  it("ScenePromptSchema يقبل prompt بين 10 و 1000 حرف", () => {
    const valid = validateScenePrompt({
      prompt: "وصف مشهد طويل بما يكفي للتحقق",
      darkness: 50,
      complexity: 30,
    });
    expect(valid.success).toBe(true);

    const tooShort = validateScenePrompt({
      prompt: "قصير",
      darkness: 50,
      complexity: 30,
    });
    expect(tooShort.success).toBe(false);
  });

  it("ScenePromptSchema يرفض darkness خارج 0-100", () => {
    const invalid = validateScenePrompt({
      prompt: "وصف مشهد طويل بما يكفي للتحقق",
      darkness: 150,
      complexity: 30,
    });
    expect(invalid.success).toBe(false);
  });

  it("ColorTemperatureSchema يقبل 2000-10000", () => {
    expect(validateColorTemperature(5500).success).toBe(true);
    expect(validateColorTemperature(2000).success).toBe(true);
    expect(validateColorTemperature(10000).success).toBe(true);
    expect(validateColorTemperature(1999).success).toBe(false);
    expect(validateColorTemperature(10001).success).toBe(false);
  });

  it("CineStudioStateSchema يقبل حالة صحيحة", () => {
    const valid = CineStudioStateSchema.safeParse({
      currentPhase: "pre",
      visualMood: "noir",
      activeTool: null,
      activeView: "dashboard",
    });
    expect(valid.success).toBe(true);
  });

  it("CineStudioStateSchema يرفض حالة بمرحلة خاطئة", () => {
    const invalid = CineStudioStateSchema.safeParse({
      currentPhase: "invalid-phase",
      visualMood: "noir",
      activeTool: null,
      activeView: "dashboard",
    });
    expect(invalid.success).toBe(false);
  });

  it("ShotAnalysisSchema يقبل تحليل صحيح", () => {
    const valid = ShotAnalysisSchema.safeParse({
      score: 85,
      dynamicRange: "high",
      grainLevel: "low",
      issues: ["exposure warning"],
      exposure: 70,
    });
    expect(valid.success).toBe(true);
  });

  it("ShotAnalysisSchema يرفض score > 100", () => {
    const invalid = ShotAnalysisSchema.safeParse({
      score: 150,
      dynamicRange: "high",
      grainLevel: "low",
      issues: [],
      exposure: 70,
    });
    expect(invalid.success).toBe(false);
  });
});

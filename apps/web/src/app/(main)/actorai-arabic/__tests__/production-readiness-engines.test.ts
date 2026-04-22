import { describe, expect, it } from "vitest";
import { SAMPLE_SCRIPT } from "../lib/constants";
import type { WebcamAnalysisFrameSample } from "../lib/studio-engines";
import {
  analyzeDemoScript,
  buildSceneRhythmAnalysis,
  buildWebcamAnalysisSummary,
  createDeterministicMemorizationMask,
  generateSelfTapeReview,
  scoreRecordedPerformance,
} from "../lib/studio-engines";

describe("createDeterministicMemorizationMask", () => {
  const text = "هذا نص عربي قصير يصلح لاختبار الحذف الحتمي بين الكلمات";

  it("ينتج نفس الإخفاء في كل مرة لنفس النص والمستوى", () => {
    const first = createDeterministicMemorizationMask(text, 50);
    const second = createDeterministicMemorizationMask(text, 50);

    expect(first).toBe(second);
  });

  it("يزيد عدد الكلمات المحذوفة عند رفع مستوى الصعوبة", () => {
    const easy = createDeterministicMemorizationMask(text, 10);
    const hard = createDeterministicMemorizationMask(text, 90);

    const easyHidden = easy.match(/____/g)?.length ?? 0;
    const hardHidden = hard.match(/____/g)?.length ?? 0;

    expect(hardHidden).toBeGreaterThan(easyHidden);
  });
});

describe("analyzeDemoScript", () => {
  it("يحافظ على المخرجات المعروفة للنص التجريبي", () => {
    const result = analyzeDemoScript(SAMPLE_SCRIPT, "stanislavsky");

    expect(result.objectives.main).toContain("ليلى");
    expect(result.coachingTips[0]).toContain("الصور البصرية");
    expect(result.emotionalArc).toHaveLength(3);
  });

  it("ينتج تحليلاً مشتقاً من النص الحقيقي لا تحليلاً ثابتاً", () => {
    const customScript = `المشهد الثاني - غرفة التحقيق

المحقق:
أريد الحقيقة الآن.

سليم:
لن أعترف بشيء قبل أن أرى المحامي.`;

    const result = analyzeDemoScript(customScript, "meisner");

    expect(result.objectives.main).toContain("الحقيقة");
    expect(result.obstacles.external.length).toBeGreaterThan(0);
    expect(result.coachingTips.some((tip) => tip.includes("مايسنر"))).toBe(
      true
    );
  });
});

describe("buildSceneRhythmAnalysis", () => {
  it("يعيد المخرجات المرجعية للنص التجريبي الحالي", () => {
    const result = buildSceneRhythmAnalysis(SAMPLE_SCRIPT);

    expect(result.rhythmScore).toBe(78);
    expect(result.monotonyAlerts[0]?.description).toContain("الإيقاع المتوسط");
  });

  it("يولّد تحليلاً حتمياً لنص جديد", () => {
    const customScript = `أنا هنا.
أنت هناك.
لماذا تصمت؟
تكلم الآن!`;

    const first = buildSceneRhythmAnalysis(customScript);
    const second = buildSceneRhythmAnalysis(customScript);

    expect(first).toEqual(second);
    expect(first.summary.length).toBeGreaterThan(0);
  });
});

describe("buildWebcamAnalysisSummary", () => {
  it("يولّد نتيجة حتمية من عينات الجلسة", () => {
    const samples: WebcamAnalysisFrameSample[] = [
      {
        timestamp: 0,
        centroidX: 0.48,
        centroidY: 0.46,
        motion: 0.22,
        focus: 0.78,
        brightness: 0.55,
      },
      {
        timestamp: 1000,
        centroidX: 0.5,
        centroidY: 0.47,
        motion: 0.25,
        focus: 0.8,
        brightness: 0.57,
      },
      {
        timestamp: 2000,
        centroidX: 0.52,
        centroidY: 0.48,
        motion: 0.28,
        focus: 0.76,
        brightness: 0.53,
      },
    ];

    const result = buildWebcamAnalysisSummary({
      analysisTime: 62,
      samples,
    });

    expect(result.eyeLine.direction).toBe("center");
    expect(result.blocking.spaceUsage).toBeGreaterThan(0);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });
});

describe("self tape review", () => {
  it("ينتج تقييماً حتمياً غير عشوائي للتسجيل", () => {
    const first = generateSelfTapeReview({
      durationSeconds: 95,
      scriptText: SAMPLE_SCRIPT,
      teleprompterSpeed: 52,
      includeTeleprompter: true,
    });
    const second = generateSelfTapeReview({
      durationSeconds: 95,
      scriptText: SAMPLE_SCRIPT,
      teleprompterSpeed: 52,
      includeTeleprompter: true,
    });

    expect(first).toEqual(second);
    expect(first.notes.length).toBeGreaterThan(0);
    expect(first.score).toBe(
      scoreRecordedPerformance(95, SAMPLE_SCRIPT.length)
    );
  });
});

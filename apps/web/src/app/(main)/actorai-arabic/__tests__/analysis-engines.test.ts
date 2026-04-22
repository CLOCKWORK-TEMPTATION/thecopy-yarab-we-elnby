import { describe, expect, it, vi } from "vitest";
import {
  analyzeSceneRhythmText,
  analyzeScriptText,
  buildPartnerResponse,
} from "../lib/script-analysis";
import {
  buildExportFileName,
  buildTakeInsights,
  pickSupportedMimeType,
} from "../lib/self-tape";
import { summarizeWebcamSamples } from "../lib/webcam-analysis";
import { SAMPLE_SCRIPT } from "../lib/constants";

describe("محركات التحليل المحلية", () => {
  it("يحلل النص بشكل حتمي ويولد أهدافاً وعقبات ونصائح", () => {
    const analysis = analyzeScriptText(SAMPLE_SCRIPT, "stanislavsky");

    expect(analysis.objectives.main.length).toBeGreaterThan(10);
    expect(analysis.objectives.beats.length).toBeGreaterThanOrEqual(2);
    expect(analysis.obstacles.internal.length).toBeGreaterThan(0);
    expect(analysis.coachingTips.length).toBeGreaterThanOrEqual(3);
  });

  it("يبني رد شريك مشهد متماسكاً وغير عشوائي", () => {
    const first = buildPartnerResponse({
      scriptText: SAMPLE_SCRIPT,
      history: [{ role: "ai", text: "ابدأ من فضلك" }],
      userInput: "أنا خائف لكنني متمسك بك",
    });

    const second = buildPartnerResponse({
      scriptText: SAMPLE_SCRIPT,
      history: [{ role: "ai", text: "ابدأ من فضلك" }],
      userInput: "أنا خائف لكنني متمسك بك",
    });

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(10);
  });

  it("يولد تحليلاً إيقاعياً يعتمد على النص الفعلي", () => {
    const analysis = analyzeSceneRhythmText(SAMPLE_SCRIPT);

    expect(analysis.rhythmMap.length).toBeGreaterThanOrEqual(3);
    expect(analysis.rhythmScore).toBeGreaterThan(0);
    expect(analysis.summary.length).toBeGreaterThan(20);
  });
});

describe("التحليل البصري المحلي", () => {
  it("يستنتج اتجاه النظر والرمش واستخدام المساحة من عينات الجلسة", () => {
    const result = summarizeWebcamSamples(
      [
        {
          timestamp: 0,
          motionX: 0.48,
          motionY: 0.61,
          movementEnergy: 0.22,
          upperFaceBrightness: 0.78,
          centerBrightness: 0.74,
          coverage: 0.34,
        },
        {
          timestamp: 2000,
          motionX: 0.5,
          motionY: 0.66,
          movementEnergy: 0.25,
          upperFaceBrightness: 0.42,
          centerBrightness: 0.71,
          coverage: 0.38,
        },
        {
          timestamp: 4000,
          motionX: 0.52,
          motionY: 0.68,
          movementEnergy: 0.27,
          upperFaceBrightness: 0.79,
          centerBrightness: 0.75,
          coverage: 0.4,
        },
      ],
      6
    );

    expect(result.eyeLine.direction).toBe("down");
    expect(result.blinkRate.rate).toBeGreaterThan(0);
    expect(result.blocking.spaceUsage).toBeGreaterThan(0);
    expect(result.overallScore).toBeGreaterThan(0);
  });
});

describe("أدوات السيلف تيب", () => {
  it("تختار أول تنسيق مدعوم للتسجيل", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: vi.fn(
        (mime: string) => mime === "video/webm;codecs=vp9"
      ),
    });

    const mimeType = pickSupportedMimeType([
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm",
    ]);

    expect(mimeType).toBe("video/webm;codecs=vp9");
  });

  it("يبني اسم ملف تصدير نظيفاً وقابلاً للاستخدام", () => {
    expect(
      buildExportFileName({
        actorName: "سارة علي",
        projectName: "مشهد الاختبار",
        roleName: "ليلى",
        takeName: "Take 1",
        extension: "webm",
      })
    ).toBe("sara-ali-mshhd-alakhtbar-lila-take-1.webm");
  });

  it("يولد ملاحظات وتقييماً حتميين من بيانات التسجيل", () => {
    const insights = buildTakeInsights({
      durationSeconds: 95,
      scriptText: SAMPLE_SCRIPT,
      teleprompterUsed: true,
      hadRetake: false,
    });

    expect(insights.score).toBeGreaterThan(0);
    expect(insights.notes.length).toBeGreaterThanOrEqual(2);
    expect(insights.notes[0]?.content.length).toBeGreaterThan(10);
  });
});

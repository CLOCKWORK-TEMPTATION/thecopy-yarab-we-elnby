import { clamp } from "./studio-engines-text-utils";

export interface SelfTapeReviewInput {
  durationSeconds: number;
  scriptText: string;
  teleprompterSpeed: number;
  includeTeleprompter: boolean;
}

export interface SelfTapeReviewNote {
  type: "emotion" | "delivery" | "timing" | "movement" | "improvement";
  content: string;
  severity: "positive" | "neutral" | "needs_work";
}

export interface SelfTapeReview {
  score: number;
  notes: SelfTapeReviewNote[];
}

export function scoreRecordedPerformance(
  durationSeconds: number,
  textLength = 0
): number {
  const clampedDuration = clamp(durationSeconds, 15, 600);
  const paceScore = 100 - Math.abs(clampedDuration - 110) * 0.32;
  const textBonus = clamp(Math.round(textLength / 90), 0, 8);
  return clamp(Math.round(paceScore + textBonus), 62, 95);
}

export function generateSelfTapeReview(
  input: SelfTapeReviewInput
): SelfTapeReview {
  const {
    durationSeconds,
    scriptText,
    teleprompterSpeed,
    includeTeleprompter,
  } = input;
  const score = scoreRecordedPerformance(durationSeconds, scriptText.length);
  const notes: SelfTapeReviewNote[] = [];

  if (durationSeconds < 45) {
    notes.push({
      type: "timing",
      content: "المدة قصيرة نسبياً؛ امنح الجمل الرئيسية وقتاً أوضح للتنفس.",
      severity: "needs_work",
    });
  } else {
    notes.push({
      type: "timing",
      content: "الإيقاع العام متوازن ويمنح المشهد مساحة كافية للتصاعد.",
      severity: "positive",
    });
  }

  if (teleprompterSpeed > 65) {
    notes.push({
      type: "delivery",
      content: "سرعة التلقين مرتفعة وقد تدفع الإلقاء إلى الاستعجال.",
      severity: "needs_work",
    });
  } else if (includeTeleprompter) {
    notes.push({
      type: "delivery",
      content: "استخدام التلقين مضبوط ويساعد على ثبات الإيقاع دون شد ظاهر.",
      severity: "positive",
    });
  }

  notes.push({
    type: "emotion",
    content:
      scriptText.length > 220
        ? "النص طويل بما يكفي لاحتياج تلوين عاطفي أوضح بين المقاطع."
        : "الطاقة العاطفية مناسبة، ويمكن تعزيز التحول في الجملة الأخيرة.",
    severity: scriptText.length > 220 ? "neutral" : "positive",
  });

  notes.push({
    type: "improvement",
    content:
      score >= 84
        ? "التسجيل قوي، ركّز الآن على تحسين التفاصيل الدقيقة لا الهيكل العام."
        : "أعد التسجيل مع وقفات أوضح وبداية أكثر ثقة لرفع التقييم العام.",
    severity: score >= 84 ? "positive" : "neutral",
  });

  return {
    score,
    notes,
  };
}

import type { TextAnalysis } from "@/app/(main)/arabic-creative-writing-studio/types";
import type { CalculatedTextStats } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";

export const QUALITY_LABELS: Record<
  keyof TextAnalysis["qualityMetrics"],
  string
> = {
  clarity: "الوضوح",
  creativity: "الإبداع",
  coherence: "التماسك",
  impact: "التأثير",
};

export const EMOTIONAL_TONE_LABELS: Record<
  TextAnalysis["emotionalTone"],
  string
> = {
  positive: "إيجابية",
  neutral: "محايدة",
  negative: "متوترة أو سلبية",
};

export function calculateTextStats(content: string): CalculatedTextStats {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;
  const paragraphCount = content
    .split("\n\n")
    .filter((part) => part.trim()).length;
  const sentenceCount = content
    .split(/[.!?؟]+/)
    .filter((part) => part.trim()).length;

  return {
    wordCount,
    characterCount,
    paragraphCount,
    sentenceCount,
    averageWordsPerSentence:
      sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
  };
}

export function getAverageQuality(analysis: TextAnalysis): number {
  const values = Object.values(analysis.qualityMetrics);
  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round(total / values.length);
}

export function buildAnalysisNarrative(analysis: TextAnalysis) {
  const rankedMetrics = Object.entries(analysis.qualityMetrics).sort(
    (left, right) => right[1] - left[1]
  ) as [keyof TextAnalysis["qualityMetrics"], number][];
  const strongestMetric =
    rankedMetrics[0] ?? (["clarity", analysis.qualityMetrics.clarity] as const);
  const weakestMetric =
    rankedMetrics[rankedMetrics.length - 1] ??
    (["clarity", analysis.qualityMetrics.clarity] as const);
  const averageQuality = getAverageQuality(analysis);

  if (averageQuality >= 85) {
    return {
      headline: "النص متماسك وجاهز لمراجعة نهائية خفيفة.",
      description: `أفضل نقطة فيه الآن هي ${QUALITY_LABELS[strongestMetric[0]]}، ومع ذلك يستحق ${QUALITY_LABELS[weakestMetric[0]]} مراجعة أخيرة قبل الاعتماد.`,
    };
  }

  if (averageQuality >= 70) {
    return {
      headline: "النص جيد، لكنه يحتاج صقلاً محدوداً قبل النسخة النهائية.",
      description: `التحليل يرى أن ${QUALITY_LABELS[strongestMetric[0]]} واضحة، بينما تحتاج ${QUALITY_LABELS[weakestMetric[0]]} إلى دفعة إضافية.`,
    };
  }

  if (averageQuality >= 55) {
    return {
      headline: "النص واعد، لكنه يحتاج مراجعة مركزة قبل المتابعة.",
      description: `ابدأ بتحسين ${QUALITY_LABELS[weakestMetric[0]]} أولاً، ثم راجع ${QUALITY_LABELS[strongestMetric[0]]} حتى لا تفقد نقطة القوة الحالية.`,
    };
  }

  return {
    headline: "التحليل يقترح إعادة صياغة أعمق قبل الاعتماد على هذه النسخة.",
    description: `أضعف نقطة حالياً هي ${QUALITY_LABELS[weakestMetric[0]]}. ابدأ بها ثم أعد تشغيل التحليل بعد مراجعة النص.`,
  };
}

export function formatWritingTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

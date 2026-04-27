import { clamp } from "./normalizers";

import type {
  CharacterProfile,
  DialogueMetrics,
  VoiceAnalysis,
} from "./types";

export function buildUncertaintyReport(
  characters: CharacterProfile[],
  dialogue: DialogueMetrics,
  voice: VoiceAnalysis
): {
  confidence: number;
  uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
    reducible: boolean;
  }[];
} {
  const uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
    reducible: boolean;
  }[] = [];

  const avgCharConfidence =
    characters.length > 0
      ? characters.reduce((sum, c) => sum + c.confidence, 0) / characters.length
      : 0.5;

  if (avgCharConfidence < 0.7) {
    uncertainties.push({
      type: "epistemic",
      aspect: "تحليل الشخصيات",
      note: "مستوى الثقة في تحليل بعض الشخصيات منخفض نسبياً",
      reducible: true,
    });
  }

  if (dialogue.distinctiveness < 6) {
    uncertainties.push({
      type: "aleatoric",
      aspect: "تميز الحوار",
      note: "أصوات الشخصيات قد تكون غير متميزة بشكل كافٍ",
      reducible: false,
    });
  }

  if (voice.overlapIssues.length > 0) {
    uncertainties.push({
      type: "epistemic",
      aspect: "تداخل الأصوات",
      note: `تم اكتشاف ${voice.overlapIssues.length} حالات تداخل بين أصوات الشخصيات`,
      reducible: true,
    });
  }

  const overallConfidence = clamp(
    avgCharConfidence * 0.5 +
      (dialogue.distinctiveness / 10) * 0.3 +
      (voice.overallDistinctiveness / 10) * 0.2,
    0,
    1
  );

  return {
    confidence: Math.round(overallConfidence * 100) / 100,
    uncertainties,
  };
}

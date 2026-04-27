import type { Station1Output } from "../station1-text-analysis";
import type { Station2Context } from "./types";

export function buildContextFromStation1(
  s1Output: Station1Output,
  fullText: string
): Station2Context {
  const relationshipSummary = "علاقات الشخصيات الرئيسية";
  const conflictSummary = "الصراعات الأساسية في النص";

  return {
    majorCharacters: s1Output.majorCharacters,
    relationshipSummary: relationshipSummary || "لم يتم تحديد علاقات رئيسية.",
    narrativeTone: s1Output.narrativeStyleAnalysis.overallTone,
    fullText,
    logline: s1Output.logline,
    conflictSummary: conflictSummary || "لم يتم تحديد صراعات واضحة.",
    dialogueQuality: s1Output.dialogueAnalysis.efficiency,
  };
}

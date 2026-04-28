import {
  CONVERSATIONAL_MARKERS_RE,
  VOCATIVE_RE,
} from "./arabic-patterns";
import {
  hasEmbeddedNarrativeActionInDialogue,
  hasHighConfidenceActionSignal,
  looksLikeVerbOrConjunction,
  type TextFeatures,
} from "./classification-text-features";

import type { SuspicionDetector } from "./classification-detector-types";
import type {
  ClassifiedLine,
  DetectorFinding,
  ElementType,
} from "./classification-types";

const BASMALA_REVERSE_RE = /بسم\s+الله\s+الرحمن\s+الرحيم/;

export const createContentTypeMismatchDetector = (): SuspicionDetector => ({
  id: "content-type-mismatch",

  detect(
    line: ClassifiedLine,
    features: TextFeatures,
    context: readonly ClassifiedLine[],
    linePosition: number
  ): DetectorFinding | null {
    if (features.isEmpty) return null;

    const type = line.assignedType;

    if (type === "character") {
      if (!features.endsWithColon) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 92,
          reason:
            'مصنّف "character" لكن بدون نقطتين (:) — قاعدة حديدية من الـ schema',
          suggestedType: features.hasActionIndicators
            ? "action"
            : features.wordCount >= 4
              ? "dialogue"
              : null,
        };
      }

      if (features.wordCount > 5) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 80,
          reason: `مصنّف "character" لكنه ${features.wordCount} كلمات - طويل جداً لاسم شخصية`,
          suggestedType: features.hasActionIndicators ? "action" : "dialogue",
        };
      }

      if (/[.!?؟]$/.test(features.normalized)) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 75,
          reason: 'مصنّف "character" لكنه ينتهي بعلامة ترقيم جملة',
          suggestedType: "dialogue",
        };
      }

      if (
        features.endsWithColon &&
        features.wordCount <= 5 &&
        looksLikeVerbOrConjunction(features.normalized)
      ) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 88,
          reason:
            'مصنّف "character" لكن النص فيه فعل أو حرف عطف — مش شكل اسم شخصية',
          suggestedType: features.hasActionIndicators ? "action" : "dialogue",
        };
      }
    }

    if (type === "dialogue") {
      if (hasEmbeddedNarrativeActionInDialogue(features.normalized)) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 96,
          reason:
            'مصنّف "dialogue" لكن السطر حوار مختلط بوصف/حدث سردي داخل نفس الجملة',
          suggestedType: "action",
        };
      }

      if (hasHighConfidenceActionSignal(features.normalized)) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 82,
          reason: 'مصنّف "dialogue" لكنه يحتوي مؤشرات وصف مشهد',
          suggestedType: "action",
        };
      }

      if (features.isParenthetical) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 88,
          reason: 'مصنّف "dialogue" لكنه محاط بأقواس بالكامل → إرشاد مسرحي',
          suggestedType: "parenthetical",
        };
      }
    }

    if (type === "action" && features.wordCount >= 8) {
      const hscene_header_3ialogueSignals =
        VOCATIVE_RE.test(features.normalized) ||
        CONVERSATIONAL_MARKERS_RE.test(features.normalized);
      if (
        hscene_header_3ialogueSignals &&
        hasEmbeddedNarrativeActionInDialogue(features.normalized)
      ) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 96,
          reason:
            'مصنّف "action" لكن يحتوي مؤشرات حوار مع وصف سردي مدمج → حوار مختلط بوصف',
          suggestedType: "dialogue",
        };
      }
    }

    if (
      type === "action" &&
      features.endsWithColon &&
      features.wordCount <= 6
    ) {
      return {
        detectorId: "content-type-mismatch",
        suspicionScore: 78,
        reason: 'مصنّف "action" لكنه ينتهي بنقطتين وقصير → أرجح اسم شخصية',
        suggestedType: "character",
      };
    }

    if (type === "parenthetical") {
      if (
        !features.isParenthetical &&
        !features.normalized.includes("(") &&
        !features.normalized.includes("（")
      ) {
        return {
          detectorId: "content-type-mismatch",
          suspicionScore: 72,
          reason: 'مصنّف "parenthetical" لكن لا يحتوي أقواس',
          suggestedType: "dialogue",
        };
      }
    }

    if (type === "transition" && features.wordCount > 6) {
      return {
        detectorId: "content-type-mismatch",
        suspicionScore: 70,
        reason: `مصنّف "transition" لكنه ${features.wordCount} كلمات - طويل جداً للانتقال`,
        suggestedType: "action",
      };
    }

    if (
      type === "action" &&
      linePosition > 0 &&
      context[linePosition - 1]?.assignedType === "character" &&
      !hasHighConfidenceActionSignal(features.normalized)
    ) {
      return {
        detectorId: "content-type-mismatch",
        suspicionScore: 85,
        reason:
          'مصنّف "action" بعد "character" لكن بدون مؤشرات وصف قوية → أرجح حوار',
        suggestedType: "dialogue",
      };
    }

    if (type !== "basmala" && BASMALA_REVERSE_RE.test(features.normalized)) {
      return {
        detectorId: "content-type-mismatch",
        suspicionScore: 95,
        reason: `مصنّف "${type}" لكن النص يطابق نمط البسملة`,
        suggestedType: "basmala" as ElementType,
      };
    }

    if (
      type === "basmala" &&
      (features.normalized.includes(":") || features.normalized.includes("："))
    ) {
      return {
        detectorId: "content-type-mismatch",
        suspicionScore: 94,
        reason:
          'مصنّف "basmala" لكن السطر فيه delimiter حواري (:) — أرجح character + dialogue',
        suggestedType: "dialogue",
      };
    }

    if (type === "basmala" && features.wordCount > 6) {
      return {
        detectorId: "content-type-mismatch",
        suspicionScore: 85,
        reason: `مصنّف "basmala" لكنه ${features.wordCount} كلمات — أطول من البسملة المعتادة`,
        suggestedType: null,
      };
    }

    return null;
  },
});

import {
  SCENE_HEADER3_KNOWN_PLACES_RE,
  SCENE_LOCATION_RE,
  SCENE_NUMBER_EXACT_RE,
  SCENE_TIME_RE,
  TRANSITION_RE,
} from "./arabic-patterns";
import {
  CLASSIFICATION_SEQUENCE_VIOLATION_SEVERITY,
  CLASSIFICATION_VALID_SEQUENCES,
  suggestTypeFromClassificationSequence,
} from "./classification-sequence-rules";
import {
  extractTextFeatures,
  hasStrongNarrativeActionSignal,
  isLikelyCharacterFragment,
  normalizeNameFragment,
  type TextFeatures,
} from "./classification-text-features";

import type {
  ClassifiedLine,
  DetectorFinding,
  ElementType,
} from "./classification-types";
import type { SuspicionDetector } from "./classification-detector-types";

export type { SuspicionDetector } from "./classification-detector-types";
export { createContentTypeMismatchDetector } from "./classification-content-detector";

const TYPE_STATISTICS: ReadonlyMap<
  ElementType,
  { minWords: number; maxWords: number }
> = new Map([
  ["character", { minWords: 1, maxWords: 4 }],
  ["parenthetical", { minWords: 1, maxWords: 12 }],
  ["transition", { minWords: 1, maxWords: 5 }],
  ["dialogue", { minWords: 1, maxWords: 140 }],
  ["action", { minWords: 2, maxWords: 240 }],
  ["scene_header_1", { minWords: 1, maxWords: 3 }],
  ["scene_header_2", { minWords: 1, maxWords: 5 }],
  ["scene_header_3", { minWords: 2, maxWords: 15 }],
  ["basmala", { minWords: 1, maxWords: 6 }],
]);

export const createSequenceViolationDetector = (): SuspicionDetector => ({
  id: "sequence-violation",

  detect(
    line: ClassifiedLine,
    features: TextFeatures,
    context: readonly ClassifiedLine[],
    linePosition: number
  ): DetectorFinding | null {
    if (linePosition === 0) return null;

    const prevLine = context[linePosition - 1];
    if (!prevLine) return null;

    const prevType = prevLine.assignedType;
    const currentType = line.assignedType;

    const allowedNext = CLASSIFICATION_VALID_SEQUENCES.get(prevType);
    if (!allowedNext) return null;
    if (allowedNext.has(currentType)) return null;

    const violationKey = `${prevType}→${currentType}`;
    const severity =
      CLASSIFICATION_SEQUENCE_VIOLATION_SEVERITY.get(violationKey) ?? 65;

    const suggestedType = suggestTypeFromClassificationSequence(prevType, {
      wordCount: features.wordCount,
      startsWithDash: features.startsWithDash,
      isParenthetical: features.isParenthetical,
      hasActionIndicators: features.hasActionIndicators,
      hasPunctuation: features.hasPunctuation,
      endsWithColon: features.endsWithColon,
    });

    return {
      detectorId: "sequence-violation",
      suspicionScore: severity,
      reason: `انتهاك تسلسل: "${currentType}" بعد "${prevType}" غير متوقع`,
      suggestedType,
    };
  },
});

export const createSourceHintMismatchDetector = (): SuspicionDetector => ({
  id: "source-hint-mismatch",

  detect(line: ClassifiedLine): DetectorFinding | null {
    if (!line.sourceHintType) return null;
    if (line.assignedType === line.sourceHintType) return null;

    return {
      detectorId: "source-hint-mismatch",
      suspicionScore: 93,
      reason: `تصنيف "${line.assignedType}" لا يطابق تلميح المصدر "${line.sourceHintType}"`,
      suggestedType: line.sourceHintType,
    };
  },
});

export const createSplitCharacterFragmentDetector = (): SuspicionDetector => ({
  id: "split-character-fragment",

  detect(
    line: ClassifiedLine,
    features: TextFeatures,
    context: readonly ClassifiedLine[],
    linePosition: number
  ): DetectorFinding | null {
    if (features.isEmpty) return null;
    if (line.assignedType !== "action") return null;
    if (features.wordCount > 2) return null;

    const currentText = normalizeNameFragment(line.text);
    if (
      !isLikelyCharacterFragment(currentText, {
        minChars: 2,
        maxChars: 14,
        maxWords: 2,
      })
    ) {
      return null;
    }

    if (hasStrongNarrativeActionSignal(features.normalized)) return null;

    const nextLine = context[linePosition + 1];
    if (nextLine?.assignedType !== "character") return null;

    const nextFeatures = extractTextFeatures(nextLine.text);
    if (!nextFeatures.endsWithColon) return null;

    const nextText = normalizeNameFragment(nextLine.text);
    if (
      !isLikelyCharacterFragment(nextText, {
        minChars: 1,
        maxChars: 4,
        maxWords: 1,
      })
    ) {
      return null;
    }

    const mergedDirect = `${currentText}${nextText}`;
    const mergedWithSpace = `${currentText} ${nextText}`;

    const mergedLooksLikeName =
      isLikelyCharacterFragment(mergedDirect, {
        minChars: 3,
        maxChars: 32,
        maxWords: 3,
      }) ||
      isLikelyCharacterFragment(mergedWithSpace, {
        minChars: 3,
        maxChars: 32,
        maxWords: 3,
      });

    if (!mergedLooksLikeName) return null;

    return {
      detectorId: "split-character-fragment",
      suspicionScore: 92,
      reason: `اشتباه تجزئة اسم شخصية بين سطرين: "${currentText}" + "${nextText}"`,
      suggestedType: null,
    };
  },
});

export const createStatisticalAnomalyDetector = (): SuspicionDetector => ({
  id: "statistical-anomaly",

  detect(line: ClassifiedLine, features: TextFeatures): DetectorFinding | null {
    if (features.isEmpty) return null;

    const stats = TYPE_STATISTICS.get(line.assignedType);
    if (!stats) return null;

    if (features.wordCount > stats.maxWords) {
      const excess = features.wordCount - stats.maxWords;
      const score = Math.min(60 + excess * 3, 90);
      return {
        detectorId: "statistical-anomaly",
        suspicionScore: score,
        reason: `"${line.assignedType}" بطول ${features.wordCount} كلمة يتجاوز الحد الأقصى الطبيعي (${stats.maxWords})`,
        suggestedType: null,
      };
    }

    if (line.assignedType === "action" && features.wordCount < stats.minWords) {
      return {
        detectorId: "statistical-anomaly",
        suspicionScore: 55,
        reason: '"action" بكلمة واحدة فقط - قصير جداً لوصف مشهد',
        suggestedType: "character",
      };
    }

    return null;
  },
});

export const createConfidenceDropDetector = (): SuspicionDetector => ({
  id: "confidence-drop",

  detect(line: ClassifiedLine): DetectorFinding | null {
    if (
      line.classificationMethod === "regex" &&
      line.originalConfidence >= 90
    ) {
      return null;
    }

    if (
      line.classificationMethod === "fallback" &&
      line.originalConfidence < 60
    ) {
      return {
        detectorId: "confidence-drop",
        suspicionScore: 50,
        reason: `تصنيف بطريقة fallback بثقة ${line.originalConfidence}% فقط`,
        suggestedType: null,
      };
    }

    if (line.originalConfidence < 45) {
      return {
        detectorId: "confidence-drop",
        suspicionScore: 55,
        reason: `ثقة التصنيف الأصلي منخفضة جداً: ${line.originalConfidence}%`,
        suggestedType: null,
      };
    }

    return null;
  },
});

export const createReversePatternMismatchDetector = (): SuspicionDetector => ({
  id: "reverse-pattern-mismatch",

  detect(line: ClassifiedLine, features: TextFeatures): DetectorFinding | null {
    if (features.isEmpty) return null;

    const type = line.assignedType;
    const normalized = features.normalized;

    if (
      type !== "scene_header_1" &&
      type !== "scene_header_2" &&
      type !== "scene_header_3" &&
      type !== "basmala" &&
      SCENE_NUMBER_EXACT_RE.test(normalized)
    ) {
      return {
        detectorId: "reverse-pattern-mismatch",
        suspicionScore: 95,
        reason: `مصنّف "${type}" لكن النص يطابق نمط رقم المشهد (scene_header_1)`,
        suggestedType: null,
      };
    }

    if (
      type !== "scene_header_1" &&
      type !== "scene_header_2" &&
      type !== "scene_header_3" &&
      type !== "basmala" &&
      SCENE_TIME_RE.test(normalized) &&
      SCENE_LOCATION_RE.test(normalized) &&
      features.wordCount <= 5
    ) {
      return {
        detectorId: "reverse-pattern-mismatch",
        suspicionScore: 90,
        reason: `مصنّف "${type}" لكن النص يطابق نمط زمن/مكان المشهد (scene_header_2)`,
        suggestedType: null,
      };
    }

    if (
      type !== "scene_header_3" &&
      type !== "scene_header_1" &&
      type !== "scene_header_2" &&
      type !== "basmala" &&
      type !== "transition" &&
      SCENE_HEADER3_KNOWN_PLACES_RE.test(normalized) &&
      features.wordCount <= 8 &&
      !features.hasActionIndicators
    ) {
      return {
        detectorId: "reverse-pattern-mismatch",
        suspicionScore: 80,
        reason: `مصنّف "${type}" لكن النص يطابق نمط موقع تفصيلي (scene_header_3)`,
        suggestedType: "scene_header_3",
      };
    }

    if (type !== "transition" && TRANSITION_RE.test(normalized)) {
      return {
        detectorId: "reverse-pattern-mismatch",
        suspicionScore: 90,
        reason: `مصنّف "${type}" لكن النص يطابق نمط انتقال (transition)`,
        suggestedType: "transition" as ElementType,
      };
    }

    return null;
  },
});

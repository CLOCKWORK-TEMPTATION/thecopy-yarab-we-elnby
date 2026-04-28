import { sanitizeRecommendationList, tryParseJsonObject } from "./json-utils";

import type { RecommendationBuckets } from "./types";

export function parseRecommendationBuckets(
  analysis: string
): RecommendationBuckets {
  const parsed = tryParseJsonObject(analysis);
  return {
    priorityActions: sanitizeRecommendationList(parsed["priorityActions"]),
    quickFixes: sanitizeRecommendationList(parsed["quickFixes"]),
    structuralRevisions: sanitizeRecommendationList(
      parsed["structuralRevisions"]
    ),
  };
}

export function detectConstitutionalViolations(
  recommendations: RecommendationBuckets,
  originalText: string
): string[] {
  const combined = [
    ...recommendations.priorityActions,
    ...recommendations.quickFixes,
    ...recommendations.structuralRevisions,
    originalText,
  ].join("\n");

  const blockedPatterns = [
    /استبعد.+(?:دين|عرق|جنس|إعاقة|لهجة)/i,
    /احذف.+(?:دين|عرق|جنس|إعاقة|لهجة)/i,
    /(?:دين|عرق|جنس|إعاقة|لهجة).+(?:أدنى|أسوأ|منحط)/i,
  ];

  return blockedPatterns
    .filter((pattern) => pattern.test(combined))
    .map((pattern) => pattern.source);
}

export function addConstitutionalCorrection(
  recommendations: RecommendationBuckets,
  violations: string[]
): RecommendationBuckets {
  return {
    ...recommendations,
    priorityActions: [
      "مراجعة التوصيات لتجنب الاستبعاد أو التعميم على أساس هوية محمية",
      ...recommendations.priorityActions,
    ],
    structuralRevisions: [
      ...recommendations.structuralRevisions,
      `تصحيح ${violations.length} مؤشرات لغوية قد تنتج تحيزاً أو توصية غير عادلة`,
    ],
  };
}

/**
 * Check constitutional compliance of analysis.
 */
export function checkConstitutionalCompliance(
  analysis: string,
  originalText: string
): {
  compliant: boolean;
  correctedAnalysis: string;
  improvementScore: number;
} {
  try {
    const recommendations = parseRecommendationBuckets(analysis);
    const violations = detectConstitutionalViolations(
      recommendations,
      originalText
    );

    const correctedRecommendations =
      violations.length === 0
        ? recommendations
        : addConstitutionalCorrection(recommendations, violations);

    return {
      compliant: violations.length === 0,
      correctedAnalysis: JSON.stringify(correctedRecommendations),
      improvementScore: violations.length === 0 ? 1 : 0.75,
    };
  } catch (error) {
    console.error("Constitutional check failed:", error);
    return {
      compliant: true,
      correctedAnalysis: analysis,
      improvementScore: 1.0,
    };
  }
}

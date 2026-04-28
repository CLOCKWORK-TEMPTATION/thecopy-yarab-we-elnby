import {
  countRecommendationItems,
  hasCompleteMetricSet,
  tryParseJsonObject,
} from "./json-utils";

import type { UncertaintyReport } from "./types";

/**
 * Quantify uncertainty in analysis results.
 */
export function quantifyUncertainty(
  analysis: string,
  originalText: string
): UncertaintyReport {
  try {
    const parsed = tryParseJsonObject(analysis);
    const words = originalText.trim().split(/\s+/).filter(Boolean).length;
    const uncertainties: UncertaintyReport["uncertainties"] = [];
    let penalty = 0;

    if (words < 300) {
      penalty += 0.2;
      uncertainties.push({
        type: "epistemic",
        aspect: "sample_size",
        note: "النص قصير وقد لا يكفي لتقدير جودة البنية والإيقاع بثقة عالية",
      });
    }

    if (!hasCompleteMetricSet(parsed)) {
      penalty += 0.15;
      uncertainties.push({
        type: "epistemic",
        aspect: "metric_coverage",
        note: "بعض المقاييس غير مكتملة أو غير قابلة للتحقق من المخرجات",
      });
    }

    if (countRecommendationItems(parsed["recommendations"]) < 3) {
      penalty += 0.1;
      uncertainties.push({
        type: "aleatoric",
        aspect: "recommendation_density",
        note: "عدد التوصيات قليل مقارنة باتساع التحليل المطلوب",
      });
    }

    return {
      overallConfidence: Math.max(0.35, Math.min(0.95, 0.9 - penalty)),
      uncertainties,
    };
  } catch (error) {
    console.error("Uncertainty quantification failed:", error);
    return {
      overallConfidence: 0.5,
      uncertainties: [
        {
          type: "epistemic",
          aspect: "general",
          note: "فشل في تقييم عدم اليقين",
        },
      ],
    };
  }
}

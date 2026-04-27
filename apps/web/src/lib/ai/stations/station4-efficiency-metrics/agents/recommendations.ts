import { toText } from "../../../gemini-core";
import { GeminiModel, GeminiService } from "../../gemini-service";
import { defaultRecommendations } from "../defaults";
import { parseRecommendations } from "../parsers";
import type {
  EfficiencyMetrics,
  ProducibilityAnalysis,
  QualityAssessment,
  RhythmAnalysis,
} from "../types";

// Recommendations Generator
export class RecommendationsGenerator {
  constructor(private geminiService: GeminiService) {}

  async generate(
    metrics: EfficiencyMetrics,
    quality: QualityAssessment,
    producibility: ProducibilityAnalysis,
    rhythm: RhythmAnalysis
  ): Promise<{
    priorityActions: string[];
    quickFixes: string[];
    structuralRevisions: string[];
  }> {
    const prompt = `
    بناءً على التحليلات التالية، قم بتوليد توصيات محددة وعملية لتحسين النص:

    مقاييس الكفاءة:
    ${JSON.stringify(metrics, null, 2)}

    تقييم الجودة:
    ${JSON.stringify(quality, null, 2)}

    تحليل الإنتاج:
    ${JSON.stringify(producibility, null, 2)}

    تحليل الإيقاع:
    ${JSON.stringify(rhythm, null, 2)}

    قدم التوصيات في ثلاث فئات:
    1. إجراءات الأولوية (إجراءات عاجلة وعالية التأثير)
    2. إصلاحات سريعة (تغييرات بسيطة وسريعة التنفيذ)
    3. مراجعات هيكلية (تغييرات أكبر قد تتطلب إعادة كتابة)

    قدم النتائج بتنسيق JSON:
    {
      "priorityActions": ["إجراء 1", "إجراء 2"],
      "quickFixes": ["إصلاح 1", "إصلاح 2"],
      "structuralRevisions": ["مراجعة 1", "مراجعة 2"]
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.4,
    });

    try {
      return parseRecommendations(toText(result.content));
    } catch (e) {
      console.error("Failed to parse recommendations:", e);
      return defaultRecommendations;
    }
  }
}

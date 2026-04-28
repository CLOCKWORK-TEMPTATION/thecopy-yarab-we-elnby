import { toText } from "../../../gemini-core";
import { GeminiModel, GeminiService } from "../../gemini-service";
import { defaultProducibility } from "../defaults";
import { parseProducibility } from "../parsers";

import type { Station3Output } from "../../station3-network-builder";
import type { ProducibilityAnalysis } from "../types";

// Producibility Analyzer Agent
export class ProducibilityAnalyzer {
  constructor(private geminiService: GeminiService) {}

  async evaluate(
    text: string,
    network: Station3Output["conflictNetwork"]
  ): Promise<ProducibilityAnalysis> {
    const prompt = `
    قم بتقييم إمكانية إنتاج النص التالي بناءً على شبكة الصراعات والشخصيات.

    النص:
    ${text.substring(0, 3000)}

    شبكة الصراعات:
    ${JSON.stringify(network, null, 2)}

    قم بتقييم:
    1. الجدوى التقنية (0-10)
    2. تقدير الميزانية (low/medium/high/very_high)
    3. تحديات الإنتاج (حدد 3-5 تحديات رئيسية مع وصف وشدة)
    4. متطلبات المواقع (حدد المواقع المطلوبة)
    5. هل هناك حاجة لمؤثرات خاصة؟
    6. حجم الطاقم التمثيلي

    قدم النتائج بتنسيق JSON:
    {
      "technicalFeasibility": 7,
      "budgetEstimate": "medium",
      "productionChallenges": [
        {
          "type": "location",
          "description": "مواقع تاريخية صعبة الوصول",
          "severity": "medium"
        }
      ],
      "locationRequirements": ["قصر تاريخي", "مدينة قديمة"],
      "specialEffectsNeeded": true,
      "castSize": 12
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
    });

    try {
      return parseProducibility(toText(result.content));
    } catch (e) {
      console.error("Failed to parse producibility analysis:", e);
      return defaultProducibility;
    }
  }
}

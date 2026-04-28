import { toText } from "../../../gemini-core";
import { GeminiModel, GeminiService } from "../../gemini-service";
import { defaultLiteraryQuality } from "../defaults";
import { parseLiteraryQuality } from "../parsers";

import type { Station3Output } from "../../station3-network-builder";
import type { LiteraryQualityAssessment } from "../types";

// Literary Quality Analyzer Agent
export class LiteraryQualityAnalyzer {
  constructor(private geminiService: GeminiService) {}

  async assess(
    text: string,
    previousAnalysis: Station3Output
  ): Promise<LiteraryQualityAssessment> {
    const prompt = `
    قم بتقييم الجودة الأدبية للنص التالي بناءً على التحليل السابق للشبكة الدرامية.

    النص:
    ${text.substring(0, 3000)}

    تحليل الشبكة:
    ${JSON.stringify(previousAnalysis.networkAnalysis, null, 2)}

    قم بتقييم الجودة في المجالات التالية (من 0 إلى 100):
    1. الجودة النثرية (أسلوب الكتابة، اللغة، الوصف)
    2. جودة الهيكل (بداية، وسط، نهاية)
    3. جودة تطوير الشخصيات
    4. جودة الحوار
    5. العمق الموضوعي

    قدم النتائج بتنسيق JSON:
    {
      "overallQuality": 85,
      "proseQuality": 80,
      "structureQuality": 85,
      "characterDevelopmentQuality": 90,
      "dialogueQuality": 75,
      "thematicDepth": 85
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
    });

    try {
      return parseLiteraryQuality(toText(result.content));
    } catch (e) {
      console.error("Failed to parse literary quality assessment:", e);
      return defaultLiteraryQuality;
    }
  }
}

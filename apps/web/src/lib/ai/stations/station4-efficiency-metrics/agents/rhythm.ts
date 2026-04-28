import { toText } from "../../../gemini-core";
import { GeminiModel, GeminiService } from "../../gemini-service";
import { defaultRhythm } from "../defaults";
import { parseRhythm } from "../parsers";

import type { RhythmAnalysis } from "../types";

// Rhythm Mapping Agent
export class RhythmMappingAgent {
  constructor(private geminiService: GeminiService) {}

  async analyze(text: string): Promise<RhythmAnalysis> {
    const prompt = `
    قم بتحليل إيقاع النص التالي وتحديد وتيرة المشاهد والتوتر.

    النص:
    ${text.substring(0, 4000)}

    قم بتحليل:
    1. الإيقاع العام (very_slow/slow/medium/fast/very_fast)
    2. تباين الإيقاع (0-10)
    3. أطوال المشاهد (قائمة بالأرقام)
    4. تحليل الأفعال (متوسط الإيقاع والتوتر لكل فعل)
    5. توصيات لتحسين الإيقاع

    قدم النتائج بتنسيق JSON:
    {
      "overallPace": "medium",
      "paceVariation": 6,
      "sceneLengths": [5, 8, 12, 6, 15],
      "actBreakdown": [
        {
          "act": 1,
          "averagePace": "medium",
          "tensionProgression": [3, 5, 7, 4]
        }
      ],
      "recommendations": ["زيادة التوتر في الفعل الثاني", "تقصير المشاهد الطويلة"]
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
    });

    try {
      return parseRhythm(toText(result.content));
    } catch (e) {
      console.error("Failed to parse rhythm analysis:", e);
      return defaultRhythm;
    }
  }
}

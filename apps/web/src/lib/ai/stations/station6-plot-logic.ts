/**
 * @fileoverview Plot predictions logic for Station 6.
 * Extracted from station6-diagnostics-treatment.ts to keep file ≤ 600 lines.
 */


import {
  asArray,
  asJsonRecord,
  asNumber,
} from "./station6-json-helpers";
import { buildPlotPredictionPrompt } from "./station6-prompts";

import type { GeminiService } from "./gemini-service";
import type {
  DiagnosticsReport,
  PlotDevelopment,
  PlotPath,
  PlotPoint,
  PlotPredictions,
  PreviousStationsOutput,
} from "./station6-types";

export class PlotLogic {
  constructor(private geminiService: GeminiService) {}

  async predictPlotTrajectoryWithAlternatives(
    text: string,
    _previousStationsOutput: PreviousStationsOutput,
    diagnosticsReport: DiagnosticsReport,
    createAnalysisSummary: (output: PreviousStationsOutput) => string
  ): Promise<PlotPredictions> {
    const contextSummary = createAnalysisSummary(_previousStationsOutput);
    const prompt = buildPlotPredictionPrompt(
      text,
      contextSummary,
      diagnosticsReport
    );

    try {
      const response = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.4,
        maxTokens: 6144,
      });

      const jsonText = /\{[\s\S]*\}/.exec(response.content)?.[0] ?? null;
      if (!jsonText) {
        throw new Error("No valid JSON found in response");
      }

      const parsed: unknown = JSON.parse(jsonText);
      return this.validateAndEnrichPlotPredictions(parsed);
    } catch (error) {
      console.error("[Station 6] Plot predictions parsing error:", error);
      return this.generateFallbackPlotPredictions();
    }
  }

  validateAndEnrichPlotPredictions(data: unknown): PlotPredictions {
    const record = asJsonRecord(data);

    return {
      currentTrajectory: asArray<PlotPoint>(record.currentTrajectory).slice(
        0,
        10
      ),
      trajectoryConfidence: Math.min(
        Math.max(asNumber(record.trajectoryConfidence, 0.5), 0),
        1
      ),
      likelyDevelopments: asArray<PlotDevelopment>(
        record.likelyDevelopments
      ).slice(0, 8),
      alternativePaths: asArray<PlotPath>(record.alternativePaths).slice(0, 5),
      criticalDecisionPoints: asArray<
        PlotPredictions["criticalDecisionPoints"][number]
      >(record.criticalDecisionPoints).slice(0, 8),
      narrativeMomentum: Math.min(
        Math.max(asNumber(record.narrativeMomentum, 5), 0),
        10
      ),
      predictabilityScore: Math.min(
        Math.max(asNumber(record.predictabilityScore, 5), 0),
        10
      ),
    };
  }

  generateFallbackPlotPredictions(): PlotPredictions {
    return {
      currentTrajectory: [
        {
          timestamp: "الآن",
          description: "الوضع الحالي كما هو",
          importance: 5,
          confidence: 0.8,
        },
        {
          timestamp: "قريباً",
          description: "تطور الصراعات الحالية",
          importance: 7,
          confidence: 0.6,
        },
      ],
      trajectoryConfidence: 0.5,
      likelyDevelopments: [
        {
          description: "تصاعد الصراع الرئيسي",
          probability: 0.7,
          confidence: 0.6,
          contributingFactors: [{ factor: "شخصيات", weight: 0.8 }],
          potentialIssues: [
            { issue: "تكرار", severity: 4, mitigation: "تنويع الأساليب" },
          ],
          narrativePayoff: 7,
        },
      ],
      alternativePaths: [
        {
          name: "مسار بديل",
          description: "خيار مختلف للقصة",
          probability: 0.3,
          divergencePoint: "نقطة تحول محتملة",
          advantages: [{ aspect: "جدة", benefit: "مفاجأة للجمهور", impact: 8 }],
          disadvantages: [
            { aspect: "توافق", drawback: "يتطلب تغييرات كبيرة", severity: 7 },
          ],
          keyMoments: [
            {
              moment: "حدث رئيسي",
              significance: "تحول",
              timing: "منتصف القصة",
            },
          ],
          requiredSetup: ["إعداد مسبق"],
          compatibilityScore: 5,
        },
      ],
      criticalDecisionPoints: [
        {
          point: "قرار مصيري",
          importance: 8,
          options: ["خيار أ", "خيار ب"],
          implications: "تأثير كبير على مسار القصة",
        },
      ],
      narrativeMomentum: 5,
      predictabilityScore: 5,
    };
  }
}

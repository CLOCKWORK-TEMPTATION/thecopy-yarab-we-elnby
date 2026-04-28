import { createStructuredAnalysisSummary } from "./analysis-summary";
import { asArray, asJsonRecord, asNumber, firstJsonObject } from "./utils";

import type {
  PlotPredictions,
  JsonRecord,
  DiagnosticsReport,
  PlotPoint,
  PlotDevelopment,
  PlotPath,
} from "./types";
import type { GeminiService } from "../gemini-service";

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

export class PlotPredictor {
  constructor(private geminiService: GeminiService) {}

  /**
   * Predict plot trajectory with detailed alternatives
   */
  async predictPlotTrajectoryWithAlternatives(
    text: string,
    previousStationsOutput: PreviousStationsOutput,
    diagnosticsReport: DiagnosticsReport
  ): Promise<PlotPredictions> {
    const contextSummary = createStructuredAnalysisSummary(
      previousStationsOutput
    );

    const prompt = `
بناءً على النص والتحليلات والتشخيص، توقع مسار الحبكة المحتمل والمسارات البديلة.

**السياق:**
${contextSummary}

**التشخيص:**
- درجة الصحة: ${diagnosticsReport.overallHealthScore}/100
- القضايا الحرجة: ${diagnosticsReport.criticalIssues.length}
- الفرص المتاحة: ${diagnosticsReport.opportunities.length}

**النص (عينة):**
${text.substring(0, 3000)}

**المطلوب: توقعات شاملة للحبكة بصيغة JSON:**

1. **المسار الحالي (currentTrajectory):**
   - مجموعة من النقاط الحبكية الرئيسية
   - كل نقطة: {timestamp, description, importance (0-10), confidence (0-1)}

2. **ثقة المسار (trajectoryConfidence):** 0-1

3. **التطورات المحتملة (likelyDevelopments):**
   - description: وصف التطور
   - probability: 0-1
   - confidence: 0-1
   - contributingFactors: [{factor, weight (0-1)}]
   - potentialIssues: [{issue, severity (0-10), mitigation}]
   - narrativePayoff: 0-10

4. **المسارات البديلة (alternativePaths):**
   - name: اسم المسار
   - description: وصف
   - probability: 0-1
   - divergencePoint: نقطة الانحراف
   - advantages: [{aspect, benefit, impact (0-10)}]
   - disadvantages: [{aspect, drawback, severity (0-10)}]
   - keyMoments: [{moment, significance, timing}]
   - requiredSetup: متطلبات الإعداد
   - compatibilityScore: 0-10

5. **نقاط القرار الحاسمة (criticalDecisionPoints):**
   - point: وصف النقطة
   - importance: 0-10
   - options: الخيارات المتاحة
   - implications: انعكاسات القرار

6. **مؤشرات السرد:**
   - narrativeMomentum: 0-10
   - predictabilityScore: 0-10

**ملاحظات:**
- ركز على التطورات المنطقية بناءً على ما سبق
- حدد نقاط الانحراف الرئيسية بوضوح
- قيم توافق المسارات البديلة مع النص الحالي

قدم الرد بصيغة JSON نظيفة:
`;

    try {
      const response = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.4,
        maxTokens: 6144,
      });

      const jsonText = firstJsonObject(response.content);
      if (!jsonText) {
        throw new Error("No valid JSON found in response");
      }

      const parsed: unknown = JSON.parse(jsonText);
      return this.validateAndEnrichPlotPredictions(parsed);
    } catch (error) {
      console.error("[Station 6] Plot predictions parsing error:", error);
      return this.generateFallbackPlotPredictions(previousStationsOutput);
    }
  }

  /**
   * Validate and enrich plot predictions
   */
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

  /**
   * Generate fallback plot predictions
   */
  generateFallbackPlotPredictions(
    _previousStationsOutput: PreviousStationsOutput
  ): PlotPredictions {
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

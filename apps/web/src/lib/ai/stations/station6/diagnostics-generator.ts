import type {
  DiagnosticsReport,
  JsonRecord,
  DiagnosticIssue,
} from "./types";
import type { GeminiService } from "../gemini-service";
import { asArray, asJsonRecord, asJsonNumber, asString, firstJsonObject } from "./utils";
import { createStructuredAnalysisSummary } from "./analysis-summary";

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

export class DiagnosticsGenerator {
  constructor(private geminiService: GeminiService) {}

  /**
   * Generate comprehensive diagnostics report with detailed scoring
   */
  async generateComprehensiveDiagnostics(
    text: string,
    previousStationsOutput: PreviousStationsOutput
  ): Promise<DiagnosticsReport> {
    const analysisSummary = createStructuredAnalysisSummary(
      previousStationsOutput
    );

    const prompt = `
قم بتحليل تشخيصي شامل ومتعمق للنص بناءً على التحليلات السابقة.

**السياق:**
${analysisSummary}

**النص (عينة):**
${text.substring(0, 4000)}

**المطلوب: تقرير تشخيصي شامل بصيغة JSON يتضمن:**

1. **درجة الصحة الإجمالية والتفصيلية:**
   - overallHealthScore: رقم من 0-100
   - healthBreakdown: تفصيل لـ characterDevelopment, plotCoherence, structuralIntegrity, dialogueQuality, thematicDepth

2. **القضايا الحرجة (criticalIssues):**
   - مشاكل تؤثر بشكل جوهري على جودة العمل
   - كل قضية تحتوي: type, category, description, location, impact (0-10), suggestion, affectedElements[], priority (1-10)

3. **التحذيرات (warnings):**
   - مشاكل مهمة لكن غير حرجة
   - نفس البنية أعلاه

4. **الاقتراحات (suggestions):**
   - تحسينات ممكنة
   - نفس البنية أعلاه

5. **الشخصيات المعزولة (isolatedCharacters):**
   - name, isolationScore (0-10), currentConnections[], missedOpportunities[], integrationSuggestions[]

6. **الصراعات المتروكة (abandonedConflicts):**
   - id, description, involvedCharacters[], introducedAt, abandonedAt, setupInvestment (0-10), resolutionStrategies[]

7. **المشاكل الهيكلية (structuralIssues):**
   - type, description, location, severity (0-10), cascadingEffects[], fixStrategy{}

8. **مناطق الخطر (riskAreas):**
   - description, probability (0-1), impact (0-10), category, indicators[], mitigation{}

9. **الفرص (opportunities):**
   - description, potential (0-10), category, currentState, exploitation{}, expectedBenefit

10. **ملخص تنفيذي (summary):**
    - نص موجز (150-200 كلمة) يلخص الوضع الصحي العام

**ملاحظات مهمة:**
- كن دقيقاً في تحديد المواقع (أسماء الفصول، أرقام الصفحات، أسماء الشخصيات)
- قدم اقتراحات قابلة للتنفيذ وليست عامة
- رتب القضايا حسب الأولوية والتأثير
- تجنب التكرار بين الفئات المختلفة

قدم الرد بصيغة JSON نظيفة دون أي نص إضافي:
`;

    try {
      const response = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.3,
        maxTokens: 6144,
      });

      const jsonText = firstJsonObject(response.content);
      if (!jsonText) {
        throw new Error("No valid JSON found in response");
      }

      const parsed: unknown = JSON.parse(jsonText);

      // Validate and ensure all required fields exist
      return this.validateAndEnrichDiagnostics(parsed);
    } catch (error) {
      console.error("[Station 6] Diagnostics parsing error:", error);
      return this.generateFallbackDiagnostics(previousStationsOutput);
    }
  }

  /**
   * Validate and enrich diagnostics data
   */
  validateAndEnrichDiagnostics(data: unknown): DiagnosticsReport {
    const record = asJsonRecord(data);
    const healthBreakdown = asJsonRecord(record.healthBreakdown);

    return {
      overallHealthScore: asJsonNumber(record.overallHealthScore, 50),
      healthBreakdown: {
        characterDevelopment: asJsonNumber(
          healthBreakdown.characterDevelopment,
          50
        ),
        plotCoherence: asJsonNumber(healthBreakdown.plotCoherence, 50),
        structuralIntegrity: asJsonNumber(
          healthBreakdown.structuralIntegrity,
          50
        ),
        dialogueQuality: asJsonNumber(healthBreakdown.dialogueQuality, 50),
        thematicDepth: asJsonNumber(healthBreakdown.thematicDepth, 50),
      },
      criticalIssues: asArray<DiagnosticIssue>(record.criticalIssues).slice(
        0,
        10
      ),
      warnings: asArray<DiagnosticIssue>(record.warnings).slice(0, 15),
      suggestions: asArray<DiagnosticIssue>(record.suggestions).slice(0, 20),
      isolatedCharacters: asArray(record.isolatedCharacters).slice(0, 5),
      abandonedConflicts: asArray(record.abandonedConflicts).slice(0, 8),
      structuralIssues: asArray(record.structuralIssues).slice(0, 10),
      riskAreas: asArray(record.riskAreas).slice(0, 8),
      opportunities: asArray(record.opportunities).slice(0, 10),
      summary: asString(record.summary, "تحليل تشخيصي غير متوفر"),
    };
  }

  /**
   * Generate fallback diagnostics if main analysis fails
   */
  generateFallbackDiagnostics(
    previousStationsOutput: PreviousStationsOutput
  ): DiagnosticsReport {
    const station4 = asJsonRecord(previousStationsOutput.station4);
    const efficiencyMetrics = asJsonRecord(station4.efficiencyMetrics);
    const efficiencyScore = asJsonRecord(efficiencyMetrics.overallEfficiencyScore, 50);

    return {
      overallHealthScore: Math.min(100, efficiencyScore),
      healthBreakdown: {
        characterDevelopment: Math.min(100, efficiencyScore),
        plotCoherence: Math.min(100, efficiencyScore),
        structuralIntegrity: Math.min(100, efficiencyScore),
        dialogueQuality: Math.min(100, efficiencyScore),
        thematicDepth: Math.min(100, efficiencyScore),
      },
      criticalIssues: [],
      warnings: [],
      suggestions: [],
      isolatedCharacters: [],
      abandonedConflicts: [],
      structuralIssues: [],
      riskAreas: [],
      opportunities: [],
      summary:
        "فشل التحليل التشخيصي التفصيلي. تم استخدام بيانات أساسية من المحطات السابقة.",
    };
  }
}
import type { DebateResult, DiagnosticsReport, JsonRecord } from "./types";
import type { GeminiService } from "../gemini-service";
import type { MultiAgentDebateSystem } from "../constitutional/multi-agent-debate";

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

export class DebateConductor {
  constructor(
    private geminiService: GeminiService,
    private debateSystem: MultiAgentDebateSystem
  ) {}

  /**
   * Conduct validation debate on diagnostics findings
   */
  async conductValidationDebate(
    text: string,
    _previousStationsOutput: PreviousStationsOutput,
    diagnosticsReport: DiagnosticsReport
  ): Promise<DebateResult> {
    const debateContext = `
**التقرير التشخيصي:**
- درجة الصحة الإجمالية: ${diagnosticsReport.overallHealthScore}/100
- عدد القضايا الحرجة: ${diagnosticsReport.criticalIssues.length}
- عدد التحذيرات: ${diagnosticsReport.warnings.length}
- عدد الشخصيات المعزولة: ${diagnosticsReport.isolatedCharacters.length}
- عدد الصراعات المتروكة: ${diagnosticsReport.abandonedConflicts.length}

**أهم القضايا الحرجة:**
${diagnosticsReport.criticalIssues
  .slice(0, 5)
  .map(
    (issue) =>
      `- ${issue.category}: ${issue.description} (التأثير: ${issue.impact}/10)`
  )
  .join("\n")}

**الملخص:**
${diagnosticsReport.summary}
`;

    try {
      return await this.debateSystem.conductDebate(
        text.substring(0, 3000),
        debateContext,
        {
          analysisType: "diagnostics-validation",
        },
        3
      );
    } catch (error) {
      console.error("[Station 6] Debate error:", error);
      // Return minimal debate result
      return {
        participants: [],
        rounds: [],
        verdict: {
          consensusAreas: [],
          disputedAreas: [],
          finalVerdict: {
            overallAssessment: "فشل النقاش متعدد الوكلاء",
            strengths: [],
            weaknesses: [],
            recommendations: [],
            confidence: 0.3,
          },
        },
        debateDynamics: {
          rounds: 0,
          convergenceScore: 0,
          controversialTopics: [],
        },
      };
    }
  }
}
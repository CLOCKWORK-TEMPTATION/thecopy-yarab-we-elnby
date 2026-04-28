/**
 * @fileoverview Uncertainty quantification logic for Station 6.
 * Extracted from station6-diagnostics-treatment.ts to keep file ≤ 600 lines.
 */

import type {
  DiagnosticsReport,
  PlotPredictions,
  TreatmentPlan,
  UncertaintyReport,
} from "./station6-types";
import type { DebateResult } from "../constitutional/multi-agent-debate";
import type { UncertaintyQuantificationEngine } from "../constitutional/uncertainty-quantification";

interface AnalysesBundle {
  diagnosticsReport: DiagnosticsReport;
  debateResults: DebateResult;
  treatmentPlan: TreatmentPlan;
  plotPredictions: PlotPredictions;
}

export class UncertaintyLogic {
  constructor(private uncertaintyEngine: UncertaintyQuantificationEngine) {}

  async quantifyComprehensiveUncertainty(
    analyses: AnalysesBundle
  ): Promise<UncertaintyReport> {
    const combinedAnalysis = `
**التقرير التشخيصي:**
${JSON.stringify(analyses.diagnosticsReport, null, 2).substring(0, 1000)}

**نتائج النقاش:**
${JSON.stringify(analyses.debateResults.verdict, null, 2).substring(0, 800)}

**خطة العلاج:**
${JSON.stringify(analyses.treatmentPlan, null, 2).substring(0, 800)}

**توقعات الحبكة:**
${JSON.stringify(analyses.plotPredictions, null, 2).substring(0, 800)}
`;

    try {
      const metrics = await this.uncertaintyEngine.quantify(combinedAnalysis, {
        originalText: "",
        analysisType: "comprehensive-diagnostics",
        previousResults: analyses,
      });

      return {
        overallConfidence: metrics.confidence,
        uncertainties: metrics.sources.map((source) => ({
          type: metrics.type,
          aspect: source.aspect,
          note: source.reason,
        })),
      };
    } catch (error) {
      console.error("[Station 6] Uncertainty quantification error:", error);
      return {
        overallConfidence: 0.5,
        uncertainties: [
          {
            type: "epistemic",
            aspect: "فشل التحليل",
            note: "خطأ في معالجة البيانات",
          },
        ],
      };
    }
  }
}

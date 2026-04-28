import type {
  UncertaintyReport,
  DiagnosticsReport,
  DebateResult,
  TreatmentPlan,
  PlotPredictions,
} from "./types";
import type { UncertaintyQuantificationEngine } from "../constitutional/uncertainty-quantification";

export class UncertaintyQuantifier {
  constructor(private uncertaintyEngine: UncertaintyQuantificationEngine) {}

  /**
   * Quantify uncertainty across all analyses
   */
  async quantifyComprehensiveUncertainty(analyses: {
    diagnosticsReport: DiagnosticsReport;
    debateResults: DebateResult;
    treatmentPlan: TreatmentPlan;
    plotPredictions: PlotPredictions;
  }): Promise<UncertaintyReport> {
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

      // Map UncertaintyMetrics to UncertaintyReport format
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

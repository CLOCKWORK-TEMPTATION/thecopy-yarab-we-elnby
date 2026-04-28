/**
 * @fileoverview Station 6: Diagnostics & Treatment — main façade class.
 *
 * Heavy implementation split into:
 *   - station6-types.ts              (types, interfaces)
 *   - station6-json-helpers.ts      (JSON parsing helpers)
 *   - station6-prompts.ts           (prompt builders)
 *   - station6-diagnostics-logic.ts (diagnostics generation logic)
 *   - station6-treatment-logic.ts   (treatment plan logic)
 *   - station6-plot-logic.ts        (plot predictions logic)
 *   - station6-uncertainty-logic.ts (uncertainty quantification logic)
 */

import {
  MultiAgentDebateSystem,
  type DebateResult,
} from "../constitutional/multi-agent-debate";
import { getUncertaintyQuantificationEngine } from "../constitutional/uncertainty-quantification";
import { GeminiService } from "./gemini-service";

export type {
  AbandonedConflict,
  DiagnosticIssue,
  DiagnosticsReport,
  IsolatedCharacter,
  JsonRecord,
  Opportunity,
  PlotDevelopment,
  PlotPath,
  PlotPoint,
  PlotPredictions,
  PreviousStationsOutput,
  Recommendation,
  RiskArea,
  Station6Output,
  StationMetadata,
  StructuralIssue,
  TreatmentPlan,
  UncertaintyReport,
} from "./station6-types";

import { DiagnosticsLogic } from "./station6-diagnostics-logic";
import {
  asArray,
  asJsonRecord,
  asNumber,
  asString,
} from "./station6-json-helpers";
import { PlotLogic } from "./station6-plot-logic";
import { TreatmentLogic } from "./station6-treatment-logic";
import { UncertaintyLogic } from "./station6-uncertainty-logic";

import type {
  DiagnosticsReport,
  PreviousStationsOutput,
  Station6Output,
  StationMetadata,
} from "./station6-types";

export class Station6Diagnostics {
  private debateSystem: MultiAgentDebateSystem;
  private diagnosticsLogic: DiagnosticsLogic;
  private treatmentLogic: TreatmentLogic;
  private plotLogic: PlotLogic;
  private uncertaintyLogic: UncertaintyLogic;

  constructor(private geminiService: GeminiService) {
    this.debateSystem = new MultiAgentDebateSystem(geminiService);
    this.diagnosticsLogic = new DiagnosticsLogic(geminiService);
    this.treatmentLogic = new TreatmentLogic(geminiService);
    this.plotLogic = new PlotLogic(geminiService);
    const uncertaintyEngine = getUncertaintyQuantificationEngine(geminiService);
    this.uncertaintyLogic = new UncertaintyLogic(uncertaintyEngine);
  }

  async execute(
    text: string,
    previousStationsOutput: PreviousStationsOutput
  ): Promise<Station6Output> {
    console.warn("[Station 6] Starting comprehensive diagnostics");

    const startTime = Date.now();

    try {
      const diagnosticsReport =
        await this.diagnosticsLogic.generateComprehensiveDiagnostics(
          text,
          previousStationsOutput,
          (output) => this.createStructuredAnalysisSummary(output)
        );

      const debateResults = await this.conductValidationDebate(
        text,
        diagnosticsReport
      );

      const treatmentPlan =
        await this.treatmentLogic.generateDetailedTreatmentPlan(
          diagnosticsReport,
          debateResults
        );

      const plotPredictions =
        await this.plotLogic.predictPlotTrajectoryWithAlternatives(
          text,
          previousStationsOutput,
          diagnosticsReport,
          (output) => this.createStructuredAnalysisSummary(output)
        );

      const uncertaintyReport =
        await this.uncertaintyLogic.quantifyComprehensiveUncertainty({
          diagnosticsReport,
          debateResults,
          treatmentPlan,
          plotPredictions,
        });

      const metadata: StationMetadata = {
        analysisTimestamp: new Date(),
        status: "Success",
        agentsUsed: [
          "DiagnosticsAnalyzer",
          "HealthScorer",
          "IssueDetector",
          "MultiAgentDebateSystem",
          "TreatmentPlanner",
          "RoadmapGenerator",
          "PlotPredictor",
          "PathAnalyzer",
          "UncertaintyQuantifier",
        ],
        executionTime: Date.now() - startTime,
      };

      console.warn(
        `[Station 6] Analysis completed in ${metadata.executionTime}ms`
      );

      return {
        diagnosticsReport,
        debateResults,
        treatmentPlan,
        plotPredictions,
        uncertaintyReport,
        metadata,
      };
    } catch (error) {
      console.error("[Station 6] Execution error:", error);
      throw new Error(
        `Station 6 execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async conductValidationDebate(
    text: string,
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
        { analysisType: "diagnostics-validation" },
        3
      );
    } catch (error) {
      console.error("[Station 6] Debate error:", error);
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

  private createStructuredAnalysisSummary(
    previousStationsOutput: PreviousStationsOutput
  ): string {
    const station1 = asJsonRecord(previousStationsOutput.station1);
    const station2 = asJsonRecord(previousStationsOutput.station2);
    const station3 = asJsonRecord(previousStationsOutput.station3);
    const station4 = asJsonRecord(previousStationsOutput.station4);
    const station5 = asJsonRecord(previousStationsOutput.station5);
    const station1MajorCharacters = asArray<unknown>(station1.majorCharacters);
    const station2HybridGenre = asJsonRecord(station2.hybridGenre);
    const station2Themes = asJsonRecord(station2.themes);
    const station2PrimaryThemes = asArray<unknown>(station2Themes.primary);
    const station3NetworkAnalysis = asJsonRecord(station3.networkAnalysis);
    const station3ConflictAnalysis = asJsonRecord(station3.conflictAnalysis);
    const station3MainConflict = asJsonRecord(
      station3ConflictAnalysis.mainConflict
    );
    const station4EfficiencyMetrics = asJsonRecord(station4.efficiencyMetrics);
    const station5SymbolicAnalysis = asJsonRecord(station5.symbolicAnalysis);
    const station5TensionAnalysis = asJsonRecord(station5.tensionAnalysis);

    return `
**محطة 1 - التحليل الأساسي:**
- الشخصيات الرئيسية: ${station1MajorCharacters.length}
- ملخص القصة: ${asString(station1.logline, "غير متوفر")}

**محطة 2 - التحليل المفاهيمي:**
- النوع: ${asString(station2HybridGenre.primary, "غير محدد")}
- المواضيع الرئيسية: ${station2PrimaryThemes.length}

**محطة 3 - شبكة الصراعات:**
- كثافة الشبكة: ${asNumber(station3NetworkAnalysis.density, 0)}
- الصراعات الرئيسية: ${asString(station3MainConflict.description, "غير محدد")}

**محطة 4 - مقاييس الكفاءة:**
- درجة الكفاءة الإجمالية: ${asNumber(station4EfficiencyMetrics.overallEfficiencyScore, 0)}

**محطة 5 - التحليل الديناميكي والرمزي:**
- عمق التحليل الرمزي: ${asNumber(station5SymbolicAnalysis.depthScore, 0)}
- توتر السرد: ${asNumber(station5TensionAnalysis.overallTension, 0)}
`;
  }
}

import { MultiAgentDebateSystem } from "../constitutional/multi-agent-debate";
import { getUncertaintyQuantificationEngine } from "../constitutional/uncertainty-quantification";

import { DebateConductor } from "./debate-conductor";
import { DiagnosticsGenerator } from "./diagnostics-generator";
import { PlotPredictor } from "./plot-predictor";
import { TreatmentPlanner } from "./treatment-planner";
import { UncertaintyQuantifier } from "./uncertainty-quantifier";

import type { Station6Output } from "./types";

export class Station6Diagnostics {
  private diagnosticsGenerator: DiagnosticsGenerator;
  private debateConductor: DebateConductor;
  private treatmentPlanner: TreatmentPlanner;
  private plotPredictor: PlotPredictor;
  private uncertaintyQuantifier: UncertaintyQuantifier;

  constructor(private geminiService: GeminiService) {
    this.diagnosticsGenerator = new DiagnosticsGenerator(geminiService);
    this.debateConductor = new DebateConductor(
      geminiService,
      new MultiAgentDebateSystem(geminiService)
    );
    this.treatmentPlanner = new TreatmentPlanner(geminiService);
    this.plotPredictor = new PlotPredictor(geminiService);
    this.uncertaintyQuantifier = new UncertaintyQuantifier(
      getUncertaintyQuantificationEngine(geminiService)
    );
  }

  /**
   * Execute comprehensive diagnostics and treatment analysis
   */
  async execute(
    text: string,
    previousStationsOutput: PreviousStationsOutput
  ): Promise<Station6Output> {
    console.warn("[Station 6] Starting comprehensive diagnostics");

    const startTime = Date.now();

    try {
      // Generate comprehensive diagnostics report
      const diagnosticsReport =
        await this.diagnosticsGenerator.generateComprehensiveDiagnostics(
          text,
          previousStationsOutput
        );

      // Conduct multi-agent debate for critical validation
      const debateResults = await this.debateConductor.conductValidationDebate(
        text,
        previousStationsOutput,
        diagnosticsReport
      );

      // Generate detailed treatment plan
      const treatmentPlan =
        await this.treatmentPlanner.generateDetailedTreatmentPlan(
          diagnosticsReport,
          debateResults,
          previousStationsOutput
        );

      // Predict plot trajectory with alternatives
      const plotPredictions =
        await this.plotPredictor.predictPlotTrajectoryWithAlternatives(
          text,
          previousStationsOutput,
          diagnosticsReport
        );

      // Quantify uncertainty across all analyses
      const uncertaintyReport =
        await this.uncertaintyQuantifier.quantifyComprehensiveUncertainty({
          diagnosticsReport,
          debateResults,
          treatmentPlan,
          plotPredictions,
        });

      const metadata = {
        analysisTimestamp: new Date(),
        status: "Success" as const,
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
}

// Re-export types for external use
export type {
  DiagnosticIssue,
  IsolatedCharacter,
  AbandonedConflict,
  StructuralIssue,
  Recommendation,
  PlotDevelopment,
  PlotPath,
  RiskArea,
  Opportunity,
  PlotPoint,
  DiagnosticsReport,
  TreatmentPlan,
  PlotPredictions,
  StationMetadata,
  UncertaintyReport,
  Station6Output,
} from "./types";

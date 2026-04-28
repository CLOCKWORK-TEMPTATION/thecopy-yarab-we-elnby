import {
  DebateResult,
  getMultiAgentDebateSystem,
  MultiAgentDebateSystem,
} from "../../constitutional/multi-agent-debate";
import { checkConstitutionalCompliance } from "../../constitutional/principles";
import {
  getUncertaintyQuantificationEngine,
  UncertaintyQuantificationEngine,
} from "../../constitutional/uncertainty-quantification";
import {
  BaseStation,
  type StationConfig,
} from "../../core/pipeline/base-station";
import { GeminiService } from "../gemini-service";

import { AdvancedDialogueAnalysisEngine } from "./advanced-dialogue-analysis-engine";
import { DynamicAnalysisEngine } from "./dynamic-analysis-engine";
import { StylisticAnalysisEngine } from "./stylistic-analysis-engine";
import { SymbolicAnalysisEngine } from "./symbolic-analysis-engine";
import { TensionAnalysisEngine } from "./tension-analysis-engine";
import {
  Station5Input,
  Station5Output,
  DynamicAnalysis,
  UncertaintyReport,
  StationMetadata,
} from "./types";
import { VisualCinematicAnalysisEngine } from "./visual-cinematic-analysis-engine";

export class Station5DynamicSymbolicStylistic extends BaseStation<
  Station5Input,
  Station5Output
> {
  private dynamicEngine: DynamicAnalysisEngine;
  private symbolicEngine: SymbolicAnalysisEngine;
  private stylisticEngine: StylisticAnalysisEngine;
  private tensionEngine: TensionAnalysisEngine;
  private dialogueEngine: AdvancedDialogueAnalysisEngine;
  private visualEngine: VisualCinematicAnalysisEngine;
  private debateSystem: MultiAgentDebateSystem;
  private uncertaintyQuantificationEngine: UncertaintyQuantificationEngine;

  constructor(
    config: StationConfig<Station5Input, Station5Output>,
    geminiService: GeminiService
  ) {
    super(config, geminiService);
    this.dynamicEngine = new DynamicAnalysisEngine();
    this.symbolicEngine = new SymbolicAnalysisEngine(geminiService);
    this.stylisticEngine = new StylisticAnalysisEngine(geminiService);
    this.tensionEngine = new TensionAnalysisEngine(geminiService);
    this.dialogueEngine = new AdvancedDialogueAnalysisEngine(geminiService);
    this.visualEngine = new VisualCinematicAnalysisEngine(geminiService);
    this.debateSystem = getMultiAgentDebateSystem(geminiService);
    this.uncertaintyQuantificationEngine =
      getUncertaintyQuantificationEngine(geminiService);
  }

  protected async process(input: Station5Input): Promise<Station5Output> {
    const startTime = Date.now();
    const options = input.options ?? {};
    const agentsUsed: string[] = [];

    // Dynamic Analysis
    const eventTimeline = await this.dynamicEngine.constructEventTimeline(
      input.conflictNetwork
    );
    agentsUsed.push("DynamicAnalysisEngine");

    const networkEvolution = await this.dynamicEngine.analyzeNetworkEvolution(
      input.conflictNetwork,
      eventTimeline
    );

    const characterDevelopment =
      await this.dynamicEngine.trackCharacterDevelopment(
        input.conflictNetwork,
        eventTimeline
      );

    const conflictProgression =
      await this.dynamicEngine.trackConflictProgression(
        input.conflictNetwork,
        eventTimeline
      );

    const dynamicAnalysis: DynamicAnalysis = {
      eventTimeline,
      networkEvolution,
      characterDevelopment,
      conflictProgression,
    };

    // Symbolic Analysis
    const symbolicAnalysis = await this.symbolicEngine.analyzeSymbols(
      input.fullText
    );
    agentsUsed.push("SymbolicAnalysisEngine");

    // Stylistic Analysis
    const stylisticAnalysis = await this.stylisticEngine.analyzeStyle(
      input.fullText
    );
    agentsUsed.push("StylisticAnalysisEngine");

    // Tension Analysis
    const tensionAnalysis = await this.tensionEngine.analyzeTension(
      input.fullText,
      input.conflictNetwork
    );
    agentsUsed.push("TensionAnalysisEngine");

    // Advanced Dialogue Analysis
    const advancedDialogueAnalysis = await this.dialogueEngine.analyzeDialogue(
      input.fullText,
      input.conflictNetwork.characters
    );
    agentsUsed.push("AdvancedDialogueAnalysisEngine");

    // Visual & Cinematic Analysis
    const visualCinematicAnalysis =
      await this.visualEngine.analyzeVisualCinematic(input.fullText);
    agentsUsed.push("VisualCinematicAnalysisEngine");

    // Uncertainty Quantification
    let uncertaintyReport: UncertaintyReport = {
      overallConfidence: 0.8,
      uncertainties: [],
    };

    if (options.enableUncertaintyQuantification) {
      const analysisText = JSON.stringify({
        dynamicAnalysis,
        symbolicAnalysis,
        stylisticAnalysis,
        tensionAnalysis,
        advancedDialogueAnalysis,
        visualCinematicAnalysis,
      });

      const uncertaintyMetrics =
        await this.uncertaintyQuantificationEngine.quantify(analysisText, {
          originalText: input.fullText,
          analysisType: "Dynamic, Symbolic, and Stylistic Analysis",
        });

      uncertaintyReport = {
        overallConfidence: uncertaintyMetrics.confidence,
        uncertainties: uncertaintyMetrics.sources.map((source) => ({
          type: uncertaintyMetrics.type,
          aspect: source.aspect,
          note: source.reason,
        })),
      };

      agentsUsed.push("UncertaintyQuantificationEngine");
    }

    // Multi-Agent Debate
    let debateResults: DebateResult | undefined;

    if (options.enableMultiAgentDebate) {
      const analysisText = JSON.stringify({
        dynamicAnalysis,
        symbolicAnalysis,
        stylisticAnalysis,
        tensionAnalysis,
        advancedDialogueAnalysis,
        visualCinematicAnalysis,
      });

      debateResults = await this.debateSystem.conductDebate(
        input.fullText,
        analysisText,
        {
          analysisType: "Dynamic, Symbolic, and Stylistic Analysis",
        }
      );

      agentsUsed.push("MultiAgentDebateSystem");
    }

    // Constitutional AI Check
    let constitutionalViolations = 0;

    if (options.enableConstitutionalAI) {
      const analysisText = JSON.stringify({
        dynamicAnalysis,
        symbolicAnalysis,
        stylisticAnalysis,
        tensionAnalysis,
        advancedDialogueAnalysis,
        visualCinematicAnalysis,
      });

      const constitutionalCheck = checkConstitutionalCompliance(
        analysisText,
        input.fullText,
        this.geminiService
      );

      constitutionalViolations = constitutionalCheck.violations.length;

      agentsUsed.push("ConstitutionalAI");
    }

    const analysisTime = Date.now() - startTime;

    // Build metadata object conditionally
    const metadata: StationMetadata = {
      analysisTimestamp: new Date(),
      status: "Success",
      agentsUsed,
      executionTime: analysisTime,
    };

    if (constitutionalViolations > 0) {
      metadata.constitutionalViolations = constitutionalViolations;
    }

    if (debateResults) {
      metadata.debateResults = debateResults;
    }

    return {
      dynamicAnalysis,
      symbolicAnalysis,
      stylisticAnalysis,
      tensionAnalysis,
      advancedDialogueAnalysis,
      visualCinematicAnalysis,
      uncertaintyReport,
      metadata,
    };
  }

  protected extractRequiredData(input: Station5Input): Record<string, unknown> {
    return {
      charactersCount: input.conflictNetwork.characters.size,
      conflictsCount: input.conflictNetwork.conflicts?.size ?? 0,
      station4Score:
        input.station4Output.efficiencyMetrics.overallEfficiencyScore,
      fullTextLength: input.fullText.length,
      options: input.options,
    };
  }

  protected getErrorFallback(): Station5Output {
    return {
      dynamicAnalysis: {
        eventTimeline: [],
        networkEvolution: {
          overallGrowthRate: 0,
          complexityProgression: [],
          densityProgression: [],
          criticalTransitionPoints: [],
          stabilityMetrics: {
            structuralStability: 0,
            characterStability: 0,
            conflictStability: 0,
          },
        },
        characterDevelopment: new Map(),
        conflictProgression: new Map(),
      },
      symbolicAnalysis: {
        keySymbols: [],
        recurringMotifs: [],
        centralThemesHintedBySymbols: [],
        symbolicNetworks: [],
        depthScore: 0,
        consistencyScore: 0,
      },
      stylisticAnalysis: {
        toneAssessment: {
          primaryTone: "Unknown",
          secondaryTones: [],
          toneConsistency: 0,
          explanation: "Analysis failed",
        },
        languageComplexity: {
          level: "moderate",
          readabilityScore: 5,
          vocabularyRichness: 5,
        },
        pacingAnalysis: {
          overallPacing: "balanced",
          pacingVariation: 5,
          sceneLengthDistribution: [],
        },
        descriptiveRichness: {
          visualDetailLevel: 5,
          sensoryEngagement: 5,
          atmosphericQuality: 5,
        },
      },
      tensionAnalysis: {
        tensionCurve: [],
        peaks: [],
        valleys: [],
        recommendations: {
          addTension: [],
          reduceTension: [],
          redistributeTension: [],
        },
      },
      advancedDialogueAnalysis: {
        subtext: [],
        powerDynamics: [],
        emotionalBeats: [],
        advancedMetrics: {
          subtextDepth: 0,
          emotionalRange: 0,
          characterVoiceConsistency: new Map(),
        },
      },
      visualCinematicAnalysis: {
        visualDensity: 0,
        cinematicPotential: 0,
        keyVisualMoments: [],
        colorPalette: [],
        visualMotifs: [],
        cinematographyNotes: [],
      },
      uncertaintyReport: {
        overallConfidence: 0,
        uncertainties: [],
      },
      metadata: {
        analysisTimestamp: new Date(),
        status: "Failed",
        agentsUsed: [],
        executionTime: 0,
      },
    };
  }
}

export type { Station5Input, Station5Output };

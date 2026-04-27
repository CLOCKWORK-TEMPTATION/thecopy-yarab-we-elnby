import {
  DebateResult,
  getMultiAgentDebateSystem,
  MultiAgentDebateSystem,
} from "../constitutional/multi-agent-debate";
import { checkConstitutionalCompliance } from "../constitutional/principles";
import {
  getUncertaintyQuantificationEngine,
  UncertaintyQuantificationEngine,
} from "../constitutional/uncertainty-quantification";
import {
  ConflictNetwork,
  Conflict,
  NetworkSnapshot,
} from "../core/models/base-entities";
import { BaseStation, type StationConfig } from "../core/pipeline/base-station";

import { GeminiService, GeminiModel } from "./gemini-service";
import { Station4Output } from "./station4-efficiency-metrics";

// Define ConflictPhase enum for conflict progression tracking
enum ConflictPhaseEnum {
  LATENT = "latent",
  EMERGING = "emerging",
  ESCALATING = "escalating",
  CLIMAX = "climax",
  DEESCALATING = "deescalating",
  RESOLUTION = "resolution",
  AFTERMATH = "aftermath",
}

// Extend Conflict interface to include phase property
interface ConflictWithPhase extends Conflict {
  phase?: ConflictPhaseEnum | string;
}

// Safe substring helper
const safeSub = (text: string, start: number, end: number): string => {
  if (!text) return "";
  return text.substring(start, Math.min(end, text.length));
};

const safeGet = <T>(array: T[], index: number): T | undefined => {
  if (index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
};

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function asJsonRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scaledTimestamp(value: unknown): Date {
  return new Date(asNumber(value, 0) * 100000000);
}

// Station 5 Interfaces
export interface Station5Input {
  conflictNetwork: ConflictNetwork;
  station4Output: Station4Output;
  fullText: string;
  options?: {
    enableConstitutionalAI?: boolean;
    enableUncertaintyQuantification?: boolean;
    enableMultiAgentDebate?: boolean;
    temperature?: number;
  };
}

export interface Station5Output {
  dynamicAnalysis: DynamicAnalysis;
  symbolicAnalysis: SymbolicAnalysis;
  stylisticAnalysis: StylisticAnalysis;
  tensionAnalysis: TensionAnalysis;
  advancedDialogueAnalysis: AdvancedDialogueAnalysis;
  visualCinematicAnalysis: VisualCinematicAnalysis;
  uncertaintyReport: UncertaintyReport;
  metadata: StationMetadata;
}

interface DynamicAnalysis {
  eventTimeline: TimelineEvent[];
  networkEvolution: EvolutionAnalysis;
  characterDevelopment: Map<string, CharacterEvolution>;
  conflictProgression: Map<string, ConflictProgression>;
}

interface TimelineEvent {
  timestamp: Date;
  eventType:
    | "character_introduced"
    | "relationship_formed"
    | "conflict_emerged"
    | "conflict_escalated"
    | "conflict_resolved"
    | "character_transformed"
    | "network_snapshot"
    | "other";
  description: string;
  involvedEntities: {
    characters?: string[];
    relationships?: string[];
    conflicts?: string[];
  };
  significance: number; // 1-10
  narrativePhase:
    | "setup"
    | "rising_action"
    | "climax"
    | "falling_action"
    | "resolution";
}

interface EvolutionAnalysis {
  overallGrowthRate: number;
  complexityProgression: number[];
  densityProgression: number[];
  criticalTransitionPoints: {
    timestamp: Date;
    description: string;
    impactScore: number;
  }[];
  stabilityMetrics: {
    structuralStability: number;
    characterStability: number;
    conflictStability: number;
  };
}

interface CharacterEvolution {
  characterId: string;
  characterName: string;
  developmentStages: {
    timestamp: Date;
    stage: string;
    traits: string[];
    relationships: string[];
    conflicts: string[];
  }[];
  arcType: "positive" | "negative" | "flat" | "complex";
  transformationScore: number;
  keyMoments: {
    timestamp: Date;
    event: string;
    impact: string;
  }[];
}

interface ConflictProgression {
  conflictId: string;
  conflictName: string;
  phaseTransitions: {
    timestamp: Date;
    fromPhase: ConflictPhaseEnum | string;
    toPhase: ConflictPhaseEnum | string;
    catalyst: string;
  }[];
  intensityProgression: number[];
  resolutionProbability: number;
  stagnationRisk: number;
}

interface SymbolicAnalysis {
  keySymbols: Symbol[];
  recurringMotifs: Motif[];
  centralThemesHintedBySymbols: string[];
  symbolicNetworks: {
    primarySymbol: string;
    relatedSymbols: string[];
    thematicConnection: string;
  }[];
  depthScore: number;
  consistencyScore: number;
}

interface Symbol {
  symbol: string;
  interpretation: string;
  frequency: number;
  contextualMeanings: string[];
}

interface Motif {
  motif: string;
  occurrences: number;
  narrativeFunction: string;
}

interface StylisticAnalysis {
  toneAssessment: ToneAssessment;
  languageComplexity: LanguageMetrics;
  pacingAnalysis: PacingAnalysis;
  descriptiveRichness: DescriptiveMetrics;
}

interface ToneAssessment {
  primaryTone: string;
  secondaryTones: string[];
  toneConsistency: number;
  explanation: string;
}

interface LanguageMetrics {
  level: "simple" | "moderate" | "complex" | "highly_complex";
  readabilityScore: number;
  vocabularyRichness: number;
}

interface PacingAnalysis {
  overallPacing: "very_slow" | "slow" | "balanced" | "fast" | "very_fast";
  pacingVariation: number;
  sceneLengthDistribution: number[];
}

interface DescriptiveMetrics {
  visualDetailLevel: number;
  sensoryEngagement: number;
  atmosphericQuality: number;
}

interface TensionAnalysis {
  tensionCurve: number[];
  peaks: TensionPeak[];
  valleys: TensionValley[];
  recommendations: {
    addTension: Location[];
    reduceTension: Location[];
    redistributeTension: string[];
  };
}

interface TensionPeak {
  timestamp: Date;
  intensity: number;
  description: string;
  contributingFactors: string[];
}

interface TensionValley {
  timestamp: Date;
  intensity: number;
  description: string;
  contributingFactors: string[];
}

interface Location {
  timestamp: Date;
  description: string;
  currentIntensity: number;
  suggestedIntensity: number;
}

interface AdvancedDialogueAnalysis {
  subtext: SubtextAnalysis[];
  powerDynamics: PowerDynamic[];
  emotionalBeats: EmotionalBeat[];
  advancedMetrics: {
    subtextDepth: number;
    emotionalRange: number;
    characterVoiceConsistency: Map<string, number>;
  };
}

interface SubtextAnalysis {
  location: string;
  explicitText: string;
  impliedMeaning: string;
  confidence: number;
}

interface PowerDynamic {
  characters: string[];
  relationshipType: string;
  powerBalance: number; // -1 to 1, negative means first character has less power
  evolution: {
    timestamp: Date;
    balance: number;
    catalyst: string;
  }[];
}

interface EmotionalBeat {
  timestamp: Date;
  emotion: string;
  intensity: number;
  characters: string[];
  trigger: string;
}

interface VisualCinematicAnalysis {
  visualDensity: number;
  cinematicPotential: number;
  keyVisualMoments: VisualMoment[];
  colorPalette: string[];
  visualMotifs: Motif[];
  cinematographyNotes: string[];
}

interface VisualMoment {
  timestamp: Date;
  description: string;
  visualType:
    | "wide_shot"
    | "medium_shot"
    | "close_up"
    | "extreme_close_up"
    | "establishing";
  emotionalImpact: number;
  symbolicElements: string[];
}

interface UncertaintyReport {
  overallConfidence: number;
  uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }[];
}

interface StationMetadata {
  analysisTimestamp: Date;
  status: "Success" | "Partial" | "Failed";
  agentsUsed: string[];
  executionTime: number;
  constitutionalViolations?: number;
  debateResults?: DebateResult;
}

/**
 * Dynamic Analysis Engine
 */
class DynamicAnalysisEngine {
  constructEventTimeline(network: ConflictNetwork): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // Process network snapshots
    const snapshots = network.snapshots ?? [];
    for (const snapshot of snapshots) {
      events.push({
        timestamp: snapshot.timestamp,
        eventType: "network_snapshot",
        description: `Network snapshot: ${snapshot.characters.length} characters, ${snapshot.relationships.length} relationships, ${snapshot.conflicts.length} conflicts`,
        involvedEntities: {},
        significance: 5,
        narrativePhase: this.inferNarrativePhase(snapshot.timestamp, snapshots),
      });
    }

    // Process conflicts
    const conflicts: Map<string, ConflictWithPhase> =
      network.conflicts ?? new Map<string, ConflictWithPhase>();
    for (const conflict of Array.from(conflicts.values())) {
      const legacyTimestamp = (
        conflict as ConflictWithPhase & {
          timestamp?: Date | Date[];
        }
      ).timestamp;

      const rawTimestamps = legacyTimestamp ?? conflict.timestamps;
      const timestamps = Array.isArray(rawTimestamps)
        ? rawTimestamps
        : rawTimestamps
          ? [rawTimestamps]
          : [];

      for (const timestamp of timestamps) {
        if (!timestamp) {
          continue;
        }

        events.push({
          timestamp,
          eventType: "conflict_emerged",
          description: `Conflict emerged: ${conflict.name}`,
          involvedEntities: {
            characters: conflict.involvedCharacters ?? [],
            conflicts: [conflict.id],
          },
          significance: conflict.strength ?? 5,
          narrativePhase: this.inferNarrativePhase(timestamp, snapshots),
        });
      }
    }

    // Process character introductions
    for (const [charId, character] of Array.from(
      network.characters.entries()
    )) {
      const timestamp = new Date();

      events.push({
        timestamp,
        eventType: "character_introduced",
        description: `Character introduced: ${character.name}`,
        involvedEntities: {
          characters: [charId],
        },
        significance: 5,
        narrativePhase: this.inferNarrativePhase(timestamp, snapshots),
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return Promise.resolve(events);
  }

  private inferNarrativePhase(
    timestamp: Date,
    snapshots: NetworkSnapshot[]
  ): "setup" | "rising_action" | "climax" | "falling_action" | "resolution" {
    if (!timestamp || !snapshots || snapshots.length === 0) {
      return "setup";
    }

    const firstSnapshot = safeGet(snapshots, 0);
    const lastSnapshot = safeGet(snapshots, snapshots.length - 1);

    if (!firstSnapshot?.timestamp || !lastSnapshot?.timestamp) {
      return "setup";
    }

    const firstTime = firstSnapshot.timestamp.getTime();
    const lastTime = lastSnapshot.timestamp.getTime();
    const totalDuration = lastTime - firstTime;

    if (totalDuration === 0) {
      return "setup";
    }

    const position = (timestamp.getTime() - firstTime) / totalDuration;

    if (position < 0.2) return "setup";
    if (position < 0.5) return "rising_action";
    if (position < 0.7) return "climax";
    if (position < 0.9) return "falling_action";
    return "resolution";
  }

  analyzeNetworkEvolution(
    network: ConflictNetwork,
    _timeline: TimelineEvent[]
  ): Promise<EvolutionAnalysis> {
    const complexityProgression: number[] = [];
    const densityProgression: number[] = [];
    const transitionPoints: {
      timestamp: Date;
      description: string;
      impactScore: number;
    }[] = [];

    const snapshots = network.snapshots ?? [];
    for (const snapshot of snapshots) {
      // Use snapshot data
      const numChars = snapshot.characters.length;
      const numRels = snapshot.relationships.length;
      const numConflicts = snapshot.conflicts.length;

      const complexity = numChars + numRels + numConflicts;
      complexityProgression.push(complexity);

      const maxPossibleRels = (numChars * (numChars - 1)) / 2;
      const density = maxPossibleRels > 0 ? numRels / maxPossibleRels : 0;
      densityProgression.push(density);
    }

    for (let i = 1; i < complexityProgression.length; i++) {
      const current = complexityProgression[i];
      const previous = complexityProgression[i - 1];
      const snapshot = snapshots[i];

      if (!current || !previous || !snapshot) continue;

      const change = Math.abs(current - previous);

      if (change > 5) {
        transitionPoints.push({
          timestamp: snapshot.timestamp,
          description: `Significant network change: ${snapshot.characters.length} characters, ${snapshot.relationships.length} relationships`,
          impactScore: change,
        });
      }
    }

    const lastComplexity =
      complexityProgression[complexityProgression.length - 1];
    const firstComplexity = complexityProgression[0];
    const overallGrowthRate =
      complexityProgression.length > 1 && lastComplexity && firstComplexity
        ? (lastComplexity - firstComplexity) / complexityProgression.length
        : 0;

    const stabilityMetrics = this.calculateStabilityMetrics(
      complexityProgression,
      densityProgression
    );

    return Promise.resolve({
      overallGrowthRate,
      complexityProgression,
      densityProgression,
      criticalTransitionPoints: transitionPoints,
      stabilityMetrics,
    });
  }

  private calculateStabilityMetrics(
    complexityProgression: number[],
    densityProgression: number[]
  ): {
    structuralStability: number;
    characterStability: number;
    conflictStability: number;
  } {
    const complexityVariance = this.calculateVariance(complexityProgression);
    const densityVariance = this.calculateVariance(densityProgression);

    const structuralStability = 1 / (1 + complexityVariance);

    return {
      structuralStability,
      characterStability: 1 / (1 + densityVariance),
      conflictStability: structuralStability,
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length <= 1) {
      return 0;
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  trackCharacterDevelopment(
    network: ConflictNetwork,
    timeline: TimelineEvent[]
  ): Promise<Map<string, CharacterEvolution>> {
    const evolutionMap = new Map<string, CharacterEvolution>();

    for (const [charId, character] of Array.from(
      network.characters.entries()
    )) {
      const developmentStages: CharacterEvolution["developmentStages"] = [];
      const keyMoments: CharacterEvolution["keyMoments"] = [];

      // Create a single development stage from current state
      const relationships: string[] = [];
      const characterConflicts: string[] = [];

      for (const [relId, rel] of Array.from(network.relationships.entries())) {
        if (rel.source === charId || rel.target === charId) {
          relationships.push(relId);
        }
      }

      const conflicts: Map<string, ConflictWithPhase> =
        network.conflicts ?? new Map<string, ConflictWithPhase>();
      for (const [confId, conf] of Array.from(conflicts.entries())) {
        if (conf.involvedCharacters?.includes(charId)) {
          characterConflicts.push(confId);
        }
      }

      developmentStages.push({
        timestamp: new Date(),
        stage: "Current state",
        traits: [],
        relationships,
        conflicts: characterConflicts,
      });

      for (const event of timeline) {
        if (event.involvedEntities.characters?.includes(charId)) {
          keyMoments.push({
            timestamp: event.timestamp,
            event: event.description,
            impact: `Significance: ${event.significance}/10`,
          });
        }
      }

      const arcType = this.determineArcType(developmentStages);

      const transformationScore =
        this.calculateTransformationScore(developmentStages);

      evolutionMap.set(charId, {
        characterId: charId,
        characterName: character.name,
        developmentStages,
        arcType,
        transformationScore,
        keyMoments,
      });
    }

    return Promise.resolve(evolutionMap);
  }

  private determineArcType(
    stages: CharacterEvolution["developmentStages"]
  ): "positive" | "negative" | "flat" | "complex" {
    if (stages.length < 2) return "flat";

    const firstStage = safeGet(stages, 0);
    const lastStage = safeGet(stages, stages.length - 1);

    if (!firstStage || !lastStage) {
      return "flat";
    }

    const conflictChange =
      lastStage.conflicts.length - firstStage.conflicts.length;
    const relationshipChange =
      lastStage.relationships.length - firstStage.relationships.length;

    const totalChange = conflictChange + relationshipChange;

    if (totalChange > 2) return "positive";
    if (totalChange < -2) return "negative";
    if (Math.abs(totalChange) > 4) return "complex";
    return "flat";
  }

  private calculateTransformationScore(
    stages: CharacterEvolution["developmentStages"]
  ): number {
    if (stages.length < 2) return 0;

    let totalChange = 0;

    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i - 1];
      const curr = stages[i];

      if (!prev || !curr) continue;

      const conflictChange = Math.abs(
        curr.conflicts.length - prev.conflicts.length
      );
      const relationshipChange = Math.abs(
        curr.relationships.length - prev.relationships.length
      );

      totalChange += conflictChange + relationshipChange;
    }

    return Math.min(10, totalChange / stages.length);
  }

  trackConflictProgression(
    network: ConflictNetwork,
    _timeline: TimelineEvent[]
  ): Promise<Map<string, ConflictProgression>> {
    const progressionMap = new Map<string, ConflictProgression>();

    const conflicts: Map<string, ConflictWithPhase> =
      network.conflicts ?? new Map<string, ConflictWithPhase>();
    for (const [confId, conflict] of Array.from(conflicts.entries())) {
      const phaseTransitions: ConflictProgression["phaseTransitions"] = [];
      const intensityProgression: number[] = [];

      // Use current conflict state
      intensityProgression.push(conflict.strength ?? 5);

      const resolutionProbability = this.calculateResolutionProbability(
        conflict,
        phaseTransitions
      );

      const stagnationRisk = this.calculateStagnationRisk(
        intensityProgression,
        phaseTransitions
      );

      progressionMap.set(confId, {
        conflictId: confId,
        conflictName: conflict.name,
        phaseTransitions,
        intensityProgression,
        resolutionProbability,
        stagnationRisk,
      });
    }

    return Promise.resolve(progressionMap);
  }

  private calculateResolutionProbability(
    conflict: Conflict,
    transitions: ConflictProgression["phaseTransitions"]
  ): number {
    let probability = 0.5;

    const conflictWithPhase = conflict as ConflictWithPhase;
    if (
      conflictWithPhase.phase === ConflictPhaseEnum.RESOLUTION ||
      conflictWithPhase.phase === "resolution"
    ) {
      probability = 0.95;
    } else if (
      conflictWithPhase.phase === ConflictPhaseEnum.DEESCALATING ||
      conflictWithPhase.phase === "deescalating"
    ) {
      probability = 0.75;
    } else if (
      conflictWithPhase.phase === ConflictPhaseEnum.AFTERMATH ||
      conflictWithPhase.phase === "aftermath"
    ) {
      probability = 1.0;
    } else if (
      conflictWithPhase.phase === ConflictPhaseEnum.CLIMAX ||
      conflictWithPhase.phase === "climax"
    ) {
      probability = 0.6;
    } else if (
      conflictWithPhase.phase === ConflictPhaseEnum.LATENT ||
      conflictWithPhase.phase === "latent"
    ) {
      probability = 0.2;
    }

    const transitionBonus = Math.min(0.3, transitions.length * 0.05);
    probability += transitionBonus;

    return Math.max(0, Math.min(1, probability));
  }

  private calculateStagnationRisk(
    intensityProgression: number[],
    transitions: ConflictProgression["phaseTransitions"]
  ): number {
    if (intensityProgression.length < 3) return 0.5;

    const variance = this.calculateVariance(intensityProgression);

    const transitionFactor =
      transitions.length === 0 ? 0.8 : transitions.length < 2 ? 0.5 : 0.2;

    const varianceFactor = variance < 1 ? 0.7 : variance < 3 ? 0.4 : 0.1;

    const risk = (transitionFactor + varianceFactor) / 2;

    return Math.max(0, Math.min(1, risk));
  }
}

/**
 * Symbolic Analysis Engine
 */
class SymbolicAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeSymbols(fullText: string): Promise<SymbolicAnalysis> {
    const prompt = `
    Based on the provided narrative text, analyze and identify the following:

    1.  **key_symbols**: A list of 3-5 recurring or symbolically significant objects, places, or items. For each, provide:
        - "symbol": The name of the symbol.
        - "interpretation": A brief interpretation of its potential meaning.
        - "frequency": An estimated number of appearances.
        - "contextual_meanings": A list of different meanings in various contexts.

    2.  **recurring_motifs**: A list of 2-3 recurring ideas, patterns, or situations (motifs). For each:
        - "motif": A description of the motif.
        - "occurrences": The number of times it appears.
        - "narrative_function": Its narrative purpose.

    3.  **central_themes_hinted_by_symbols**: A brief conclusion about the main themes suggested by these symbols and motifs (a list of strings).

    4.  **symbolic_networks**: A list of dictionaries, each containing:
        - "primary_symbol": The main symbol.
        - "related_symbols": A list of associated symbols.
        - "thematic_connection": The thematic link.

    5.  **depth_score**: A score (0-10) for the depth of symbolic usage.

    6.  **consistency_score**: A score (0-10) for the consistency of symbolic usage.

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.7,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));

      return {
        keySymbols: asArray<Symbol>(analysis.keySymbols),
        recurringMotifs: asArray<Motif>(analysis.recurring_motifs),
        centralThemesHintedBySymbols: asStringArray(
          analysis.central_themes_hinted_by_symbols
        ),
        symbolicNetworks: asArray<SymbolicAnalysis["symbolicNetworks"][number]>(
          analysis.symbolic_networks
        ),
        depthScore: asNumber(analysis.depth_score, 5),
        consistencyScore: asNumber(analysis.consistency_score, 5),
      };
    } catch (error) {
      console.error("Error in symbolic analysis:", error);
      return this.getDefaultSymbolicResults();
    }
  }

  private getDefaultSymbolicResults(): SymbolicAnalysis {
    return {
      keySymbols: [],
      recurringMotifs: [],
      centralThemesHintedBySymbols: [],
      symbolicNetworks: [],
      depthScore: 0,
      consistencyScore: 0,
    };
  }
}

/**
 * Stylistic Analysis Engine
 */
class StylisticAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeStyle(fullText: string): Promise<StylisticAnalysis> {
    const prompt = `
    Based on the provided narrative text, analyze and provide an assessment of the following stylistic elements:

    1.  **overall_tone_assessment**:
        - "primary_tone": The main tone.
        - "secondary_tones": A list of secondary tones.
        - "tone_consistency": A score (0-10) for tone consistency.
        - "explanation": A brief explanation.

    2.  **language_complexity**:
        - "level": The complexity level ("simple", "moderate", "complex", "highly_complex").
        - "readability_score": A score (0-10) for readability.
        - "vocabulary_richness": A score (0-10) for vocabulary richness.

    3.  **pacing_impression**:
        - "overall_pacing": The overall pacing ("very_slow", "slow", "balanced", "fast", "very_fast").
        - "pacing_variation": A score (0-10) for pacing variation.
        - "scene_length_distribution": An approximate list of scene lengths.

    4.  **descriptive_richness**:
        - "visual_detail_level": A score (0-10) for the level of visual detail.
        - "sensory_engagement": A score (0-10) for sensory engagement.
        - "atmospheric_quality": A score (0-10) for atmospheric quality.

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.6,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));
      const toneAssessment = asJsonRecord(analysis.overall_tone_assessment);
      const languageComplexity = asJsonRecord(analysis.language_complexity);
      const pacingImpression = asJsonRecord(analysis.pacing_impression);
      const descriptiveRichness = asJsonRecord(analysis.descriptive_richness);

      return {
        toneAssessment: {
          primaryTone:
            typeof toneAssessment.primary_tone === "string"
              ? toneAssessment.primary_tone
              : "Unknown",
          secondaryTones: asStringArray(toneAssessment.secondary_tones),
          toneConsistency: asNumber(toneAssessment.tone_consistency, 5),
          explanation:
            typeof toneAssessment.explanation === "string"
              ? toneAssessment.explanation
              : "Analysis failed",
        },
        languageComplexity: {
          level:
            languageComplexity.level === "simple" ||
            languageComplexity.level === "moderate" ||
            languageComplexity.level === "complex" ||
            languageComplexity.level === "highly_complex"
              ? languageComplexity.level
              : "moderate",
          readabilityScore: asNumber(languageComplexity.readability_score, 5),
          vocabularyRichness: asNumber(
            languageComplexity.vocabulary_richness,
            5
          ),
        },
        pacingAnalysis: {
          overallPacing:
            pacingImpression.overall_pacing === "very_slow" ||
            pacingImpression.overall_pacing === "slow" ||
            pacingImpression.overall_pacing === "balanced" ||
            pacingImpression.overall_pacing === "fast" ||
            pacingImpression.overall_pacing === "very_fast"
              ? pacingImpression.overall_pacing
              : "balanced",
          pacingVariation: asNumber(pacingImpression.pacing_variation, 5),
          sceneLengthDistribution: asArray<number>(
            pacingImpression.scene_length_distribution
          ),
        },
        descriptiveRichness: {
          visualDetailLevel: asNumber(
            descriptiveRichness.visual_detail_level,
            5
          ),
          sensoryEngagement: asNumber(
            descriptiveRichness.sensory_engagement,
            5
          ),
          atmosphericQuality: asNumber(
            descriptiveRichness.atmospheric_quality,
            5
          ),
        },
      };
    } catch (error) {
      console.error("Error in stylistic analysis:", error);
      return this.getDefaultStylisticResults();
    }
  }

  private getDefaultStylisticResults(): StylisticAnalysis {
    return {
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
    };
  }
}

/**
 * Tension Analysis Engine
 */
class TensionAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeTension(
    fullText: string,
    _network: ConflictNetwork
  ): Promise<TensionAnalysis> {
    const prompt = `
    Based on the provided narrative text and conflict network, analyze the tension curve throughout the story:

    1.  **tension_curve**: An array of numbers (0-10) representing tension levels at different points in the narrative.

    2.  **peaks**: A list of tension peaks, each with:
        - "timestamp": Approximate position in the story (0-1)
        - "intensity": Tension level (0-10)
        - "description": What causes this peak
        - "contributing_factors": Factors contributing to this peak

    3.  **valleys**: A list of tension valleys, each with:
        - "timestamp": Approximate position in the story (0-1)
        - "intensity": Tension level (0-10)
        - "description": What causes this valley
        - "contributing_factors": Factors contributing to this valley

    4.  **recommendations**: Suggestions for improving tension, with:
        - "add_tension": Locations where tension should be increased
        - "reduce_tension": Locations where tension should be decreased
        - "redistribute_tension": General suggestions for redistributing tension

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.6,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));
      const recommendations = asJsonRecord(analysis.recommendations);

      // Convert timestamp fractions to actual dates if needed
      const peaks = asArray<JsonRecord>(analysis.peaks).map((peak) => ({
        ...peak,
        timestamp: scaledTimestamp(peak.timestamp),
      })) as TensionPeak[];

      const valleys = asArray<JsonRecord>(analysis.valleys).map((valley) => ({
        ...valley,
        timestamp: scaledTimestamp(valley.timestamp),
      })) as TensionValley[];

      const addTension = asArray<JsonRecord>(recommendations.add_tension).map(
        (loc) => ({
          ...loc,
          timestamp: scaledTimestamp(loc.timestamp),
        })
      ) as Location[];

      const reduceTension = asArray<JsonRecord>(
        recommendations.reduce_tension
      ).map((loc) => ({
        ...loc,
        timestamp: scaledTimestamp(loc.timestamp),
      })) as Location[];

      return {
        tensionCurve: asArray<number>(analysis.tension_curve),
        peaks,
        valleys,
        recommendations: {
          addTension,
          reduceTension,
          redistributeTension: asStringArray(
            recommendations.redistribute_tension
          ),
        },
      };
    } catch (error) {
      console.error("Error in tension analysis:", error);
      return this.getDefaultTensionResults();
    }
  }

  private getDefaultTensionResults(): TensionAnalysis {
    return {
      tensionCurve: [],
      peaks: [],
      valleys: [],
      recommendations: {
        addTension: [],
        reduceTension: [],
        redistributeTension: [],
      },
    };
  }
}

/**
 * Advanced Dialogue Analysis Engine
 */
class AdvancedDialogueAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeDialogue(
    fullText: string,
    _characters: Map<string, unknown>
  ): Promise<AdvancedDialogueAnalysis> {
    const prompt = `
    Based on the provided narrative text and character information, analyze the dialogue in depth:

    1.  **subtext**: A list of subtextual moments, each with:
        - "location": Approximate position in the story
        - "explicit_text": What is actually said
        - "implied_meaning": What is meant but not said
        - "confidence": How confident you are in this interpretation (0-10)

    2.  **power_dynamics**: A list of power dynamics between characters, each with:
        - "characters": The characters involved
        - "relationship_type": Type of relationship
        - "power_balance": Power balance (-1 to 1)
        - "evolution": How this balance changes over time

    3.  **emotional_beats**: Key emotional moments in dialogue, each with:
        - "timestamp": Approximate position in the story
        - "emotion": The emotion expressed
        - "intensity": Intensity of the emotion (0-10)
        - "characters": Characters involved
        - "trigger": What triggers this emotion

    4.  **advanced_metrics**: Overall metrics including:
        - "subtext_depth": Depth of subtext (0-10)
        - "emotional_range": Range of emotions expressed (0-10)
        - "character_voice_consistency": How consistent each character's voice is

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.6,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));
      const advancedMetrics = asJsonRecord(analysis.advanced_metrics);

      // Convert timestamps to actual dates
      const emotionalBeats = asArray<JsonRecord>(analysis.emotional_beats).map(
        (beat) => ({
          ...beat,
          timestamp: scaledTimestamp(beat.timestamp),
        })
      ) as EmotionalBeat[];

      // Convert character voice consistency to a Map
      const characterVoiceConsistency = new Map<string, number>();
      const characterVoiceConsistencyData = asJsonRecord(
        advancedMetrics.character_voice_consistency
      );
      if (Object.keys(characterVoiceConsistencyData).length > 0) {
        for (const [char, consistency] of Object.entries(
          characterVoiceConsistencyData
        )) {
          characterVoiceConsistency.set(char, asNumber(consistency, 0));
        }
      }

      return {
        subtext: asArray<SubtextAnalysis>(analysis.subtext),
        powerDynamics: asArray<PowerDynamic>(analysis.power_dynamics),
        emotionalBeats,
        advancedMetrics: {
          subtextDepth: asNumber(advancedMetrics.subtext_depth, 5),
          emotionalRange: asNumber(advancedMetrics.emotional_range, 5),
          characterVoiceConsistency,
        },
      };
    } catch (error) {
      console.error("Error in advanced dialogue analysis:", error);
      return this.getDefaultDialogueResults();
    }
  }

  private getDefaultDialogueResults(): AdvancedDialogueAnalysis {
    return {
      subtext: [],
      powerDynamics: [],
      emotionalBeats: [],
      advancedMetrics: {
        subtextDepth: 0,
        emotionalRange: 0,
        characterVoiceConsistency: new Map(),
      },
    };
  }
}

/**
 * Visual & Cinematic Analysis Engine
 */
class VisualCinematicAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeVisualCinematic(
    fullText: string
  ): Promise<VisualCinematicAnalysis> {
    const prompt = `
    Based on the provided narrative text, analyze the visual and cinematic elements:

    1.  **visual_density**: How visually dense the narrative is (0-10)

    2.  **cinematic_potential**: How well the text would translate to film (0-10)

    3.  **key_visual_moments**: A list of key visual moments, each with:
        - "timestamp": Approximate position in the story
        - "description": What happens visually
        - "visual_type": Type of shot (wide_shot, medium_shot, close_up, etc.)
        - "emotional_impact": Emotional impact of this visual (0-10)
        - "symbolic_elements": Any symbolic elements in this visual

    4.  **color_palette": A list of dominant colors in the narrative

    5.  **visual_motifs**: A list of recurring visual motifs, each with:
        - "motif": Description of the motif
        - "occurrences": How many times it appears
        - "narrative_function": Its purpose in the story

    6.  **cinematography_notes": General notes on cinematography

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.6,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));

      // Convert timestamps to actual dates
      const keyVisualMoments = asArray<JsonRecord>(
        analysis.key_visual_moments
      ).map((moment) => ({
        ...moment,
        timestamp: scaledTimestamp(moment.timestamp),
      })) as VisualMoment[];

      return {
        visualDensity: asNumber(analysis.visual_density, 5),
        cinematicPotential: asNumber(analysis.cinematic_potential, 5),
        keyVisualMoments,
        colorPalette: asStringArray(analysis.color_palette),
        visualMotifs: asArray<Motif>(analysis.visual_motifs),
        cinematographyNotes: asStringArray(analysis.cinematography_notes),
      };
    } catch (error) {
      console.error("Error in visual cinematic analysis:", error);
      return this.getDefaultVisualResults();
    }
  }

  private getDefaultVisualResults(): VisualCinematicAnalysis {
    return {
      visualDensity: 0,
      cinematicPotential: 0,
      keyVisualMoments: [],
      colorPalette: [],
      visualMotifs: [],
      cinematographyNotes: [],
    };
  }
}

/**
 * Station 5: Dynamic, Symbolic, and Stylistic Analysis
 */
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

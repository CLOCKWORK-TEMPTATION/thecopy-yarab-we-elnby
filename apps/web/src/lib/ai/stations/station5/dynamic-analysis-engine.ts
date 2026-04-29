import {
  Conflict,
  ConflictNetwork,
  NetworkSnapshot,
} from "../../core/models/base-entities";

import {
  ConflictPhaseEnum,
  ConflictWithPhase,
  EvolutionAnalysis,
  CharacterEvolution,
  ConflictProgression,
  TimelineEvent,
} from "./types";
import { safeGet } from "./utils";

export class DynamicAnalysisEngine {
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
    for (const [conflictKey, conflict] of Array.from(conflicts.entries())) {
      const conflictId = conflict.id ?? conflictKey;
      const conflictName = conflict.name ?? conflictId;
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
          description: `Conflict emerged: ${conflictName}`,
          involvedEntities: {
            characters: conflict.involvedCharacters ?? [],
            conflicts: [conflictId],
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
        conflictName: conflict.name ?? confId,
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

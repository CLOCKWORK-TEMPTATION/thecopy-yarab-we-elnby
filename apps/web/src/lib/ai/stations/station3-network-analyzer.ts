/**
 * @fileoverview NetworkAnalyzer for Station 3.
 * Extracted from station3-network-builder.ts to keep each file ≤ 500 lines.
 */

import { GeminiService } from "./gemini-service";
import {
  ConflictSubject,
  ConflictScope,
  ConflictPhase,
  RelationshipNature,
} from "./station3-types";
import type {
  Character,
  CharacterArc,
  Conflict,
  ConflictNetwork,
  Relationship,
  Station3Context,
} from "./station3-types";

export class NetworkAnalyzer {
  constructor(geminiService: GeminiService) {
    void geminiService;
  }

  analyzeNetwork(
    network: ConflictNetwork,
    _context: Station3Context
  ): {
    density: number;
    complexity: number;
    balance: number;
    dynamicRange: number;
  } {
    const maxPossibleConnections =
      (network.characters.size * (network.characters.size - 1)) / 2;
    const actualConnections = network.relationships.size;
    const density =
      maxPossibleConnections > 0 ? actualConnections / maxPossibleConnections : 0;

    const avgConnectionsPerCharacter =
      network.characters.size > 0
        ? Array.from(network.relationships.values()).reduce((sum, rel) => {
            return (
              sum +
              (network.relationships.has(rel.source) ? 1 : 0) +
              (network.relationships.has(rel.target) ? 1 : 0)
            );
          }, 0) / network.characters.size
        : 0;

    const complexity = Math.min(avgConnectionsPerCharacter / 5, 1);

    const conflictDistribution = this.calculateConflictDistribution(network);
    const balance = 1 - this.calculateImbalance(conflictDistribution);

    const strengthValues = Array.from(network.relationships.values()).map(
      (rel) => rel.strength
    );
    const minStrength = Math.min(...strengthValues, 0);
    const maxStrength = Math.max(...strengthValues, 10);
    const dynamicRange = (maxStrength - minStrength) / 10;

    return {
      density: Math.round(density * 100) / 100,
      complexity: Math.round(complexity * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      dynamicRange: Math.round(dynamicRange * 100) / 100,
    };
  }

  private calculateConflictDistribution(network: ConflictNetwork): Map<string, number> {
    const distribution = new Map<string, number>();
    for (const character of network.characters.values()) {
      const conflictCount = Array.from(network.conflicts.values()).filter(
        (conflict) => conflict.involvedCharacters.includes(character.id)
      ).length;
      distribution.set(character.id, conflictCount);
    }
    return distribution;
  }

  private calculateImbalance(distribution: Map<string, number>): number {
    const values = Array.from(distribution.values());
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return Math.min(stdDev / mean, 1) || 0;
  }

  analyzeConflicts(
    network: ConflictNetwork,
    _context: Station3Context
  ): {
    mainConflict: Conflict;
    subConflicts: Conflict[];
    conflictTypes: Map<string, number>;
    intensityProgression: number[];
  } {
    const conflicts = Array.from(network.conflicts.values());

    const mainConflict = conflicts.reduce(
      (strongest, current) =>
        current.strength > strongest.strength ? current : strongest,
      conflicts[0] ?? this.createDefaultConflict()
    );

    const subConflicts = conflicts.filter((c) => c.id !== mainConflict.id);

    const conflictTypes = new Map<string, number>();
    for (const conflict of conflicts) {
      const typeName = conflict.subject.toString();
      conflictTypes.set(typeName, (conflictTypes.get(typeName) ?? 0) + 1);
    }

    const intensityProgression = conflicts.map((c) => c.strength / 10);

    return { mainConflict, subConflicts, conflictTypes, intensityProgression };
  }

  private createDefaultConflict(): Conflict {
    return {
      id: `conflict_default_${Date.now()}`,
      name: "صراع افتراضي",
      description: "صراع افتراضي للتحليل",
      involvedCharacters: [],
      subject: ConflictSubject.OTHER,
      scope: ConflictScope.PERSONAL,
      phase: ConflictPhase.EMERGING,
      strength: 5,
      relatedRelationships: [],
      pivotPoints: [],
      timestamps: [new Date()],
      metadata: { source: "Default_Analysis", inferenceTimestamp: new Date().toISOString() },
    };
  }

  generateCharacterArcs(
    network: ConflictNetwork,
    _context: Station3Context
  ): Map<string, CharacterArc> {
    const characterArcs = new Map<string, CharacterArc>();

    for (const character of network.characters.values()) {
      const conflicts = Array.from(network.conflicts.values()).filter(
        (c) => c.involvedCharacters.includes(character.id)
      );
      const relationships = Array.from(network.relationships.values()).filter(
        (r) => r.source === character.id || r.target === character.id
      );

      characterArcs.set(character.id, {
        characterId: character.id,
        characterName: character.name,
        arcType: this.inferArcType(character, conflicts, relationships),
        arcDescription: this.generateArcDescription(character, conflicts, relationships),
        keyMoments: this.extractKeyMoments(character, conflicts, relationships),
        transformation: this.describeTransformation(character, conflicts, relationships),
        confidence: this.calculateArcConfidence(character, conflicts, relationships),
      });
    }

    return characterArcs;
  }

  private inferArcType(
    _character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): "positive" | "negative" | "flat" | "transformational" | "fall" {
    const conflictStrength = conflicts.reduce((sum, c) => sum + c.strength, 0);
    const relationshipBalance = relationships.reduce(
      (sum, r) => sum + (r.nature === RelationshipNature.POSITIVE ? 1 : -1),
      0
    );

    if (conflictStrength > 10 && relationshipBalance < 0) return "fall";
    if (conflictStrength > 10 && relationshipBalance > 0) return "transformational";
    if (conflictStrength > 5) return relationshipBalance > 0 ? "positive" : "negative";
    return "flat";
  }

  private generateArcDescription(
    character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): string {
    const conflictNames = conflicts.map((c) => c.name).join("، ");
    const relationshipTypes = relationships.map((r) => r.type.toString()).join("، ");
    return `قوس ${character.name} يتضمن الصراعات: ${conflictNames} والعلاقات: ${relationshipTypes}`;
  }

  private extractKeyMoments(
    _character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): { timestamp: Date; description: string; impact: number }[] {
    const keyMoments: { timestamp: Date; description: string; impact: number }[] = [];

    for (const conflict of conflicts) {
      if (conflict.timestamps && conflict.timestamps.length > 0) {
        keyMoments.push({
          timestamp: conflict.timestamps[0] ?? new Date(),
          description: `بدء الصراع: ${conflict.name}`,
          impact: conflict.strength / 10,
        });
      }
    }

    for (const relationship of relationships) {
      keyMoments.push({
        timestamp: new Date(relationship.metadata.inferenceTimestamp),
        description: `تكوين علاقة: ${relationship.type.toString()}`,
        impact: relationship.strength / 10,
      });
    }

    return keyMoments.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  private describeTransformation(
    character: Character,
    _conflicts: Conflict[],
    relationships: Relationship[]
  ): string {
    const positiveRels = relationships.filter((r) => r.nature === RelationshipNature.POSITIVE).length;
    const negativeRels = relationships.filter((r) => r.nature === RelationshipNature.NEGATIVE).length;

    if (positiveRels > negativeRels)
      return `${character.name} يتحول نحو الأفضل من خلال العلاقات الإيجابية`;
    if (negativeRels > positiveRels)
      return `${character.name} يواجه تحديات تؤثر على مساره سلباً`;
    return `${character.name} يمر بتحولات معقدة بسبب الصراعات والعلاقات المتنوعة`;
  }

  private calculateArcConfidence(
    _character: Character,
    conflicts: Conflict[],
    relationships: Relationship[]
  ): number {
    const totalConnections = conflicts.length + relationships.length;
    if (totalConnections === 0) return 0.2;
    if (totalConnections < 3) return 0.5;
    if (totalConnections < 6) return 0.7;
    return 0.9;
  }

  identifyPivotPoints(
    network: ConflictNetwork,
    _context: Station3Context
  ): {
    timestamp: string;
    description: string;
    impact: number;
    affectedElements: string[];
  }[] {
    const pivotPoints: {
      timestamp: string;
      description: string;
      impact: number;
      affectedElements: string[];
    }[] = [];

    for (const conflict of network.conflicts.values()) {
      if (conflict.strength > 7) {
        const affectedCharacters = conflict.involvedCharacters.map((charId) => {
          const character = network.characters.get(charId);
          return character ? character.name : charId;
        });

        pivotPoints.push({
          timestamp: conflict.timestamps?.[0]?.toISOString() ?? new Date().toISOString(),
          description: `نقطة تحول: ${conflict.name}`,
          impact: conflict.strength / 10,
          affectedElements: affectedCharacters,
        });
      }
    }

    for (const relationship of network.relationships.values()) {
      if (relationship.strength > 7) {
        const sourceChar = network.characters.get(relationship.source);
        const targetChar = network.characters.get(relationship.target);

        pivotPoints.push({
          timestamp: relationship.metadata.inferenceTimestamp,
          description: `نقطة تحول: علاقة ${relationship.type.toString()}`,
          impact: relationship.strength / 10,
          affectedElements: [
            sourceChar ? sourceChar.name : relationship.source,
            targetChar ? targetChar.name : relationship.target,
          ].filter(Boolean),
        });
      }
    }

    return pivotPoints.sort((a, b) => b.impact - a.impact);
  }
}

/**
 * @fileoverview ConflictNetworkImpl and NetworkDiagnostics for Station 3.
 * Extracted from station3-network-builder.ts to keep each file ≤ 500 lines.
 */

import type {
  Character,
  Conflict,
  ConflictNetwork,
  DiagnosticReport,
  Relationship,
} from "./station3-types";

// ---------------------------------------------------------------------------
// ConflictNetworkImpl
// ---------------------------------------------------------------------------

export class ConflictNetworkImpl implements ConflictNetwork {
  public characters = new Map<string, Character>();
  public relationships = new Map<string, Relationship>();
  public conflicts = new Map<string, Conflict>();

  constructor(
    public id: string,
    public name: string
  ) {}

  addCharacter(character: Character): void {
    this.characters.set(character.id, character);
  }

  addRelationship(relationship: Relationship): void {
    this.relationships.set(relationship.id, relationship);
  }

  addConflict(conflict: Conflict): void {
    this.conflicts.set(conflict.id, conflict);
  }

  createSnapshot(_description: string): void {
    // Implementation for creating snapshots
  }
}

// ---------------------------------------------------------------------------
// NetworkDiagnostics
// ---------------------------------------------------------------------------

export class NetworkDiagnostics {
  constructor(network: ConflictNetwork) {
    void network;
  }

  runAllDiagnostics(): DiagnosticReport {
    return {
      overallHealthScore: 0.8,
      criticalityLevel: "medium",
      structuralIssues: [],
      isolatedCharacters: { totalIsolated: 0, characters: [] },
      abandonedConflicts: { totalAbandoned: 0, conflicts: [] },
      overloadedCharacters: { totalOverloaded: 0, characters: [] },
      weakConnections: { totalWeak: 0, connections: [] },
      redundancies: { totalRedundant: 0, items: [] },
    };
  }
}

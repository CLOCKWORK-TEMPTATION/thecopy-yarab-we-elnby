import type { ConflictNetwork } from "../core/models/base-entities";

import { findAbandonedConflicts } from "./network-diagnostics-abandonment";
import {
  calculateOverallHealth,
  determineCriticalityLevel,
} from "./network-diagnostics-health";
import { findIsolatedCharacters } from "./network-diagnostics-isolation";
import { findOverloadedCharacters } from "./network-diagnostics-overload";
import { findRedundancies } from "./network-diagnostics-redundancy";
import { analyzeStructuralIssues } from "./network-diagnostics-structural";
import { findWeakConnections } from "./network-diagnostics-weak";

export type {
  AbandonedConflictIssue,
  DiagnosticReport,
  IsolatedCharacterIssue,
  OverloadedCharacterIssue,
  RedundancyIssue,
  StructuralIssue,
  WeakConnectionIssue,
} from "./network-diagnostics-types";

import type { DiagnosticReport } from "./network-diagnostics-types";

export class NetworkDiagnostics {
  private network: ConflictNetwork;

  constructor(network: ConflictNetwork) {
    this.network = network;
  }

  runAllDiagnostics(): DiagnosticReport {
    const structuralIssues = analyzeStructuralIssues(this.network);
    const isolatedCharacters = findIsolatedCharacters(this.network);
    const abandonedConflicts = findAbandonedConflicts(this.network);
    const overloadedCharacters = findOverloadedCharacters(this.network);
    const weakConnections = findWeakConnections(this.network);
    const redundancies = findRedundancies(this.network);

    const overallHealthScore = calculateOverallHealth({
      structuralIssues,
      isolatedCharacters,
      abandonedConflicts,
      overloadedCharacters,
      weakConnections,
      redundancies,
    });

    return {
      overallHealthScore,
      criticalityLevel: determineCriticalityLevel(overallHealthScore),
      structuralIssues,
      isolatedCharacters,
      abandonedConflicts,
      overloadedCharacters,
      weakConnections,
      redundancies,
    };
  }
}

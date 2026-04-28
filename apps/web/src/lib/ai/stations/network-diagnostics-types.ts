/**
 * @fileoverview أنواع تقرير تشخيص شبكة الصراعات.
 */

export interface DiagnosticReport {
  overallHealthScore: number;
  criticalityLevel:
    | "healthy"
    | "minor_issues"
    | "moderate_issues"
    | "major_issues"
    | "critical";
  structuralIssues: StructuralIssue[];
  isolatedCharacters: {
    totalIsolated: number;
    characters: IsolatedCharacterIssue[];
  };
  abandonedConflicts: {
    totalAbandoned: number;
    conflicts: AbandonedConflictIssue[];
  };
  overloadedCharacters: {
    totalOverloaded: number;
    characters: OverloadedCharacterIssue[];
  };
  weakConnections: {
    totalWeak: number;
    connections: WeakConnectionIssue[];
  };
  redundancies: {
    totalRedundant: number;
    items: RedundancyIssue[];
  };
}

export interface StructuralIssue {
  type:
    | "disconnected_components"
    | "single_point_failure"
    | "circular_dependency";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedElements: string[];
}

export interface IsolatedCharacterIssue {
  characterName: string;
  characterId: string;
  isolationType:
    | "completely_isolated"
    | "weakly_connected"
    | "conflict_isolated";
  suggestedConnections: string[];
}

export interface AbandonedConflictIssue {
  conflictName: string;
  conflictId: string;
  issueType: "stuck_in_phase" | "no_progression" | "weak_involvement";
  daysInactive: number;
  suggestedActions: string[];
}

export interface OverloadedCharacterIssue {
  characterName: string;
  characterId: string;
  overloadType:
    | "too_many_conflicts"
    | "too_many_relationships"
    | "central_bottleneck";
  currentLoad: number;
  recommendedLoad: number;
  suggestedDistribution: string[];
}

export interface WeakConnectionIssue {
  connectionType: "relationship" | "conflict_involvement";
  elementId: string;
  weakness: string;
  strengthScore: number;
  improvementSuggestions: string[];
}

export interface RedundancyIssue {
  redundancyType:
    | "duplicate_relationships"
    | "similar_conflicts"
    | "overlapping_characters";
  affectedElements: string[];
  redundancyScore: number;
  consolidationSuggestion: string;
}

export interface DiagnosticIssueSummary {
  structuralIssues: StructuralIssue[];
  isolatedCharacters: DiagnosticReport["isolatedCharacters"];
  abandonedConflicts: DiagnosticReport["abandonedConflicts"];
  overloadedCharacters: DiagnosticReport["overloadedCharacters"];
  weakConnections: DiagnosticReport["weakConnections"];
  redundancies: DiagnosticReport["redundancies"];
}

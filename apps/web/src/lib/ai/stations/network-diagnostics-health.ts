/**
 * @fileoverview حساب درجة الصحة الإجمالية وتصنيف الحدّة لشبكة الصراعات.
 */

import type {
  DiagnosticIssueSummary,
  DiagnosticReport,
} from "./network-diagnostics-types";

export function calculateOverallHealth(issues: DiagnosticIssueSummary): number {
  let score = 100;

  score -= issues.structuralIssues.length * 15;
  score -= issues.isolatedCharacters.totalIsolated * 10;
  score -= issues.abandonedConflicts.totalAbandoned * 8;
  score -= issues.overloadedCharacters.totalOverloaded * 12;
  score -= issues.weakConnections.totalWeak * 5;
  score -= issues.redundancies.totalRedundant * 7;

  return Math.max(0, score);
}

export function determineCriticalityLevel(
  score: number
): DiagnosticReport["criticalityLevel"] {
  if (score >= 85) return "healthy";
  if (score >= 70) return "minor_issues";
  if (score >= 50) return "moderate_issues";
  if (score >= 30) return "major_issues";
  return "critical";
}

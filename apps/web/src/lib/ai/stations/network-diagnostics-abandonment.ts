/**
 * @fileoverview كشف الصراعات المهجورة في الشبكة.
 */

import {
  calculateDaysSinceLastUpdate,
  getConflictEntries,
} from "./network-diagnostics-helpers";

import type {
  AbandonedConflictIssue,
  DiagnosticReport,
} from "./network-diagnostics-types";
import type { Conflict, ConflictNetwork } from "../core/models/base-entities";

export function findAbandonedConflicts(
  network: ConflictNetwork
): DiagnosticReport["abandonedConflicts"] {
  const abandonedConflicts: AbandonedConflictIssue[] = [];

  if (!network.conflicts) return { totalAbandoned: 0, conflicts: [] };

  for (const [conflictId, conflict] of getConflictEntries(network)) {
    const daysSinceLastUpdate = calculateDaysSinceLastUpdate(conflict);

    if (daysSinceLastUpdate > 30) {
      abandonedConflicts.push({
        conflictName: conflict.name ?? conflictId,
        conflictId: conflict.id ?? conflictId,
        issueType: "stuck_in_phase",
        daysInactive: daysSinceLastUpdate,
        suggestedActions: suggestConflictActions(conflict),
      });
    } else if ((conflict.strength ?? 0) < 3) {
      abandonedConflicts.push({
        conflictName: conflict.name ?? conflictId,
        conflictId: conflict.id ?? conflictId,
        issueType: "weak_involvement",
        daysInactive: daysSinceLastUpdate,
        suggestedActions: suggestConflictActions(conflict),
      });
    }
  }

  return {
    totalAbandoned: abandonedConflicts.length,
    conflicts: abandonedConflicts,
  };
}

function suggestConflictActions(_conflict: Conflict): string[] {
  return [
    "تطوير الصراع إلى المرحلة التالية",
    "إضافة نقطة تحول جديدة",
    "زيادة مشاركة الشخصيات",
    "ربط الصراع بصراعات أخرى",
  ];
}

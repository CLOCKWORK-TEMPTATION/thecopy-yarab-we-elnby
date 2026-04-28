/**
 * @fileoverview كشف العلاقات والصراعات المكررة في الشبكة.
 */


import {
  getConflictEntries,
  getRelationships,
} from "./network-diagnostics-helpers";

import type {
  DiagnosticReport,
  RedundancyIssue,
} from "./network-diagnostics-types";
import type {
  Conflict,
  ConflictNetwork,
  Relationship,
} from "../core/models/base-entities";

export function findRedundancies(
  network: ConflictNetwork
): DiagnosticReport["redundancies"] {
  const redundancies: RedundancyIssue[] = [];

  const relationshipPairs = findDuplicateRelationships(network);
  for (const pair of relationshipPairs) {
    redundancies.push({
      redundancyType: "duplicate_relationships",
      affectedElements: pair,
      redundancyScore: 0.8,
      consolidationSuggestion: "دمج العلاقات المتشابهة في علاقة واحدة أقوى",
    });
  }

  const conflictGroups = findSimilarConflicts(network);
  for (const group of conflictGroups) {
    if (group.length > 1) {
      redundancies.push({
        redundancyType: "similar_conflicts",
        affectedElements: group,
        redundancyScore: 0.7,
        consolidationSuggestion:
          "دمج الصراعات المتشابهة في صراع واحد أكثر تعقيداً",
      });
    }
  }

  return {
    totalRedundant: redundancies.length,
    items: redundancies,
  };
}

function findDuplicateRelationships(network: ConflictNetwork): string[][] {
  const duplicates: string[][] = [];
  const allRelationships = getRelationships(network);

  for (let i = 0; i < allRelationships.length; i++) {
    for (let j = i + 1; j < allRelationships.length; j++) {
      const rel1 = allRelationships[i];
      const rel2 = allRelationships[j];

      if (!rel1 || !rel2) {
        continue;
      }

      if (areRelationshipsSimilar(rel1, rel2)) {
        duplicates.push([
          rel1.id ?? `${rel1.source}-${rel1.target}`,
          rel2.id ?? `${rel2.source}-${rel2.target}`,
        ]);
      }
    }
  }

  return duplicates;
}

function findSimilarConflicts(network: ConflictNetwork): string[][] {
  const groups: string[][] = [];
  if (!network.conflicts) return groups;
  const conflicts = getConflictEntries(network);
  const processed = new Set<string>();

  for (const [conflictId, conflict] of conflicts) {
    const id = conflict.id ?? conflictId;
    if (processed.has(id)) continue;

    const similarGroup = [id];
    processed.add(id);

    for (const [otherConflictId, otherConflict] of conflicts) {
      const otherId = otherConflict.id ?? otherConflictId;
      if (otherId !== id && !processed.has(otherId)) {
        if (areConflictsSimilar(conflict, otherConflict)) {
          similarGroup.push(otherId);
          processed.add(otherId);
        }
      }
    }

    if (similarGroup.length > 1) {
      groups.push(similarGroup);
    }
  }

  return groups;
}

function areRelationshipsSimilar(
  rel1: Relationship,
  rel2: Relationship
): boolean {
  return (
    rel1.type === rel2.type &&
    ((rel1.source === rel2.source && rel1.target === rel2.target) ||
      (rel1.source === rel2.target && rel1.target === rel2.source))
  );
}

function areConflictsSimilar(
  conflict1: Conflict,
  conflict2: Conflict
): boolean {
  return (
    conflict1.subject === conflict2.subject &&
    conflict1.scope === conflict2.scope &&
    hasOverlappingCharacters(
      conflict1.involvedCharacters ?? [],
      conflict2.involvedCharacters ?? []
    )
  );
}

function hasOverlappingCharacters(chars1: string[], chars2: string[]): boolean {
  return chars1.some((char) => chars2.includes(char));
}

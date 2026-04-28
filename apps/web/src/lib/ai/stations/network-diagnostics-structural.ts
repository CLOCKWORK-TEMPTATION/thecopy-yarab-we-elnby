/**
 * @fileoverview تحليل الأعطال البنيوية لشبكة الصراعات.
 */


import { getCharacterRelationships } from "./network-diagnostics-helpers";

import type { StructuralIssue } from "./network-diagnostics-types";
import type { ConflictNetwork } from "../core/models/base-entities";

export function analyzeStructuralIssues(
  network: ConflictNetwork
): StructuralIssue[] {
  const issues: StructuralIssue[] = [];

  const components = findConnectedComponents(network);
  if (components.length > 1) {
    issues.push({
      type: "disconnected_components",
      severity: "high",
      description: `الشبكة مقسمة إلى ${components.length} مكونات منفصلة`,
      affectedElements: components.flat(),
    });
  }

  const criticalNodes = findCriticalNodes(network);
  if (criticalNodes.length > 0) {
    issues.push({
      type: "single_point_failure",
      severity: "medium",
      description: "توجد شخصيات حرجة قد تؤدي إزالتها لانهيار الشبكة",
      affectedElements: criticalNodes,
    });
  }

  return issues;
}

function findConnectedComponents(network: ConflictNetwork): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const charId of network.characters.keys()) {
    if (!visited.has(charId)) {
      const component = dfsComponent(network, charId, visited);
      components.push(component);
    }
  }

  return components;
}

function dfsComponent(
  network: ConflictNetwork,
  startId: string,
  visited: Set<string>
): string[] {
  const component: string[] = [];
  const stack = [startId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    component.push(currentId);

    const relationships = getCharacterRelationships(network, currentId);
    for (const rel of relationships) {
      const otherId = rel.source === currentId ? rel.target : rel.source;
      if (!visited.has(otherId)) {
        stack.push(otherId);
      }
    }
  }

  return component;
}

function findCriticalNodes(network: ConflictNetwork): string[] {
  const criticalNodes: string[] = [];

  for (const charId of network.characters.keys()) {
    const relationships = getCharacterRelationships(network, charId);
    if (relationships.length >= 3) {
      criticalNodes.push(charId);
    }
  }

  return criticalNodes;
}

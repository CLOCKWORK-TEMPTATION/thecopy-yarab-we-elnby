/**
 * @fileoverview كشف الشخصيات المعزولة واقتراح ربطها بالشبكة.
 */

import type { ConflictNetwork } from "../core/models/base-entities";

import {
  getCharacterConflicts,
  getCharacterEntries,
  getCharacterRelationships,
  getConflictEntries,
} from "./network-diagnostics-helpers";
import type {
  DiagnosticReport,
  IsolatedCharacterIssue,
} from "./network-diagnostics-types";

export function findIsolatedCharacters(
  network: ConflictNetwork
): DiagnosticReport["isolatedCharacters"] {
  const isolatedChars: IsolatedCharacterIssue[] = [];

  for (const [characterId, character] of getCharacterEntries(network)) {
    const relationships = getCharacterRelationships(network, characterId);
    const conflicts = getCharacterConflicts(network, characterId);

    if (relationships.length === 0 && conflicts.length === 0) {
      isolatedChars.push({
        characterName: character.name,
        characterId,
        isolationType: "completely_isolated",
        suggestedConnections: suggestConnectionsForCharacter(
          network,
          characterId
        ),
      });
    } else if (relationships.length <= 1 && conflicts.length === 0) {
      isolatedChars.push({
        characterName: character.name,
        characterId,
        isolationType: "weakly_connected",
        suggestedConnections: suggestConnectionsForCharacter(
          network,
          characterId
        ),
      });
    } else if (relationships.length > 0 && conflicts.length === 0) {
      isolatedChars.push({
        characterName: character.name,
        characterId,
        isolationType: "conflict_isolated",
        suggestedConnections: suggestConflictInvolvement(network),
      });
    }
  }

  return {
    totalIsolated: isolatedChars.length,
    characters: isolatedChars,
  };
}

function suggestConnectionsForCharacter(
  network: ConflictNetwork,
  characterId: string
): string[] {
  const suggestions: string[] = [];
  const character = network.characters.get(characterId);

  if (character) {
    for (const [otherCharId, otherChar] of network.characters.entries()) {
      if (otherCharId !== characterId) {
        suggestions.push(`ربط مع الشخصية: ${otherChar.name}`);
        if (suggestions.length >= 3) break;
      }
    }
  }

  return suggestions;
}

function suggestConflictInvolvement(network: ConflictNetwork): string[] {
  const suggestions: string[] = [];
  if (!network.conflicts) return suggestions;
  const conflicts = getConflictEntries(network).map(([, conflict]) => conflict);

  for (const conflict of conflicts.slice(0, 2)) {
    suggestions.push(`إشراك في الصراع: ${conflict.name ?? "صراع غير معروف"}`);
  }

  return suggestions;
}

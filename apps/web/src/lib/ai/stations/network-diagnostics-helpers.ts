/**
 * @fileoverview محددات مساعدة للوصول إلى عناصر شبكة الصراعات.
 */

import type {
  Character,
  Conflict,
  ConflictNetwork,
  Relationship,
} from "../core/models/base-entities";

export function getCharacterEntries(
  network: ConflictNetwork
): [string, Character][] {
  return Array.from(network.characters.entries());
}

export function getRelationships(network: ConflictNetwork): Relationship[] {
  return Array.from(network.relationships.values());
}

export function getConflictEntries(
  network: ConflictNetwork
): [string, Conflict][] {
  if (!network.conflicts) return [];
  return Array.from(network.conflicts.entries());
}

export function getCharacterRelationships(
  network: ConflictNetwork,
  characterId: string
): Relationship[] {
  return getRelationships(network).filter(
    (rel) => rel.source === characterId || rel.target === characterId
  );
}

export function getCharacterConflicts(
  network: ConflictNetwork,
  characterId: string
): Conflict[] {
  return getConflictEntries(network)
    .map(([, conflict]) => conflict)
    .filter((conflict) => conflict.involvedCharacters?.includes(characterId));
}

export function calculateDaysSinceLastUpdate(conflict: Conflict): number {
  if (!conflict.timestamps || conflict.timestamps.length === 0) return 365;

  const lastUpdate = conflict.timestamps[conflict.timestamps.length - 1];
  if (!lastUpdate) return 365;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

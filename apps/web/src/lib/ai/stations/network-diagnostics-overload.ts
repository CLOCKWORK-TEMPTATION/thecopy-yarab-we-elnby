/**
 * @fileoverview كشف الشخصيات المُحمّلة فوق طاقتها واقتراح إعادة التوزيع.
 */

import type { ConflictNetwork } from "../core/models/base-entities";

import {
  getCharacterConflicts,
  getCharacterEntries,
  getCharacterRelationships,
} from "./network-diagnostics-helpers";
import type {
  DiagnosticReport,
  OverloadedCharacterIssue,
} from "./network-diagnostics-types";

export function findOverloadedCharacters(
  network: ConflictNetwork
): DiagnosticReport["overloadedCharacters"] {
  const overloadedChars: OverloadedCharacterIssue[] = [];

  for (const [characterId, character] of getCharacterEntries(network)) {
    const relationships = getCharacterRelationships(network, characterId);
    const conflicts = getCharacterConflicts(network, characterId);

    const totalLoad = relationships.length + conflicts.length * 2;

    if (totalLoad > 8) {
      overloadedChars.push({
        characterName: character.name,
        characterId,
        overloadType: "central_bottleneck",
        currentLoad: totalLoad,
        recommendedLoad: 6,
        suggestedDistribution: suggestLoadDistribution(),
      });
    }
  }

  return {
    totalOverloaded: overloadedChars.length,
    characters: overloadedChars,
  };
}

function suggestLoadDistribution(): string[] {
  return [
    "نقل بعض العلاقات لشخصيات أخرى",
    "تقسيم الصراعات الكبيرة",
    "إنشاء شخصيات مساعدة",
  ];
}

import { isEvidenceConfirmed } from "./context-memory-utils";
import { normalizeCharacterName } from "./text-utils";

import type { ClassifiedDraft } from "./classification-types";
import type {
  CharacterEvidence,
  ContextMemorySnapshot,
  EnhancedContextMemory,
} from "./context-memory-types";

export function buildContextMemorySnapshot({
  memory,
  runtimeRecords,
  confirmedCharacters,
  characterEvidence,
}: {
  memory: EnhancedContextMemory;
  runtimeRecords: ClassifiedDraft[];
  confirmedCharacters: Set<string>;
  characterEvidence: Map<string, CharacterEvidence>;
}): ContextMemorySnapshot {
  const frequency = buildCharacterFrequency(memory);
  const recentTypes = [...memory.data.lastClassifications];

  return {
    recentTypes,
    characterFrequency: frequency,
    confirmedCharacters: resolveConfirmedCharacters(
      confirmedCharacters,
      characterEvidence,
      frequency
    ),
    characterEvidence: new Map(characterEvidence),
    isInDialogueFlow: resolveDialogueFlow(recentTypes),
    lastCharacterName: resolveLastCharacterName(runtimeRecords),
    dialogueDepth: resolveDialogueDepth(recentTypes),
  };
}

function buildCharacterFrequency(memory: EnhancedContextMemory) {
  const frequency = new Map<string, number>();
  Object.entries(memory.data.characterDialogueMap).forEach(([name, count]) => {
    if (!Number.isFinite(count) || count <= 0) return;
    frequency.set(name, count);
  });
  return frequency;
}

function resolveDialogueFlow(recentTypes: readonly string[]) {
  const lastType = recentTypes.at(-1);
  return (
    lastType === "character" ||
    lastType === "dialogue" ||
    lastType === "parenthetical"
  );
}

function resolveLastCharacterName(runtimeRecords: readonly ClassifiedDraft[]) {
  for (let i = runtimeRecords.length - 1; i >= 0; i--) {
    const record = runtimeRecords[i];
    if (record?.type === "character") {
      return normalizeCharacterName(record.text);
    }
  }
  return null;
}

function resolveDialogueDepth(recentTypes: readonly string[]) {
  let dialogueDepth = 0;
  for (let i = recentTypes.length - 1; i >= 0; i--) {
    const type = recentTypes[i];
    if (type === "dialogue" || type === "parenthetical") {
      dialogueDepth++;
    } else if (type === "character") {
      dialogueDepth++;
      break;
    } else {
      break;
    }
  }
  return dialogueDepth;
}

function resolveConfirmedCharacters(
  confirmedCharacters: Set<string>,
  characterEvidence: Map<string, CharacterEvidence>,
  frequency: Map<string, number>
) {
  const resolved = new Set(confirmedCharacters);
  for (const [name, ev] of characterEvidence) {
    if (isEvidenceConfirmed(ev)) resolved.add(name);
  }
  for (const [name, count] of frequency) {
    const ev = characterEvidence.get(name);
    if (count >= 1 && ev && isEvidenceConfirmed(ev)) resolved.add(name);
  }
  return resolved;
}

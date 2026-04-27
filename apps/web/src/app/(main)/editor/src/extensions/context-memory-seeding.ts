import {
  parseInlineCharacterDialogue,
  isCandidateCharacterName,
} from "./character";
import {
  createEmptyEvidence,
  isValidMemoryCharacterName,
} from "./context-memory-utils";
import { normalizeCharacterName, isActionVerbStart } from "./text-utils";

import type { CharacterEvidence } from "./context-memory-types";

interface EvidenceRegistry {
  confirmedCharacters: Set<string>;
  characterEvidence: Map<string, CharacterEvidence>;
}

export function seedInlineCharacterEvidence(
  lines: string[],
  registry: EvidenceRegistry
): void {
  for (const line of lines) {
    const trimmed = (line ?? "").trim();
    if (!trimmed) continue;
    const parsed = parseInlineCharacterDialogue(trimmed);
    if (!parsed) continue;

    const normalizedName = normalizeCharacterName(parsed.characterName);
    if (!normalizedName || !isValidMemoryCharacterName(normalizedName)) {
      continue;
    }

    registry.confirmedCharacters.add(normalizedName);
    const ev =
      registry.characterEvidence.get(normalizedName) ?? createEmptyEvidence();
    ev.inlinePairCount++;
    ev.repeatCount++;
    registry.characterEvidence.set(normalizedName, ev);
  }
}

export function seedStandaloneCharacterEvidence(
  lines: string[],
  registry: EvidenceRegistry
): void {
  const candidates = collectStandaloneCandidates(lines);

  for (const [name, stats] of candidates) {
    if (stats.count < 2) continue;
    if (hasActionContamination(lines, name)) continue;

    registry.confirmedCharacters.add(name);
    const ev = registry.characterEvidence.get(name) ?? createEmptyEvidence();
    ev.standaloneHeaderCount += stats.count;
    ev.dialogueFollowerCount += stats.followerCount;
    ev.repeatCount += stats.count;
    registry.characterEvidence.set(name, ev);
  }
}

const DIALOGUE_FOLLOWER_RE = /[؟?!]|(?:\.{2,}|…)/;

function collectStandaloneCandidates(lines: string[]) {
  const candidates = new Map<
    string,
    { count: number; followerCount: number }
  >();

  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? "").trim();
    if (!trimmed || !/[:：]\s*$/.test(trimmed)) continue;

    const namePart = normalizeCharacterName(trimmed);
    if (!isStandaloneNameCandidate(namePart)) continue;

    const nextLine = (lines[i + 1] ?? "").trim();
    if (!isDialogueFollowerLine(nextLine)) continue;

    const entry = candidates.get(namePart) ?? { count: 0, followerCount: 0 };
    entry.count++;
    entry.followerCount++;
    candidates.set(namePart, entry);
  }

  return candidates;
}

function isStandaloneNameCandidate(namePart: string) {
  if (!namePart) return false;
  const tokens = namePart.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 3) return false;
  if (!isCandidateCharacterName(namePart)) return false;
  return !isActionVerbStart(namePart);
}

function isDialogueFollowerLine(nextLine: string) {
  if (!nextLine || /[:：]\s*$/.test(nextLine)) return false;
  const nextTokens = nextLine.split(/\s+/).filter(Boolean);
  return (
    DIALOGUE_FOLLOWER_RE.test(nextLine) ||
    (nextTokens.length >= 2 &&
      nextTokens.length <= 20 &&
      !isActionVerbStart(nextLine))
  );
}

function hasActionContamination(lines: string[], name: string) {
  return lines.some((line) => {
    const trimmed = (line ?? "").trim();
    if (!trimmed || /[:：]\s*$/.test(trimmed)) return false;
    const firstWord = trimmed.split(/\s+/)[0] ?? "";
    return (
      normalizeCharacterName(firstWord) === name &&
      isActionVerbStart(trimmed)
    );
  });
}

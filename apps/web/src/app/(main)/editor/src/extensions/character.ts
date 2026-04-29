import { Node, mergeAttributes } from "@tiptap/core";

import { collectActionEvidence } from "./action";
import {
  ARABIC_ONLY_WITH_NUMBERS_RE,
  CHARACTER_RE,
  CHARACTER_STOP_WORDS,
  CONVERSATIONAL_STARTS,
  INLINE_DIALOGUE_GLUE_RE,
  INLINE_DIALOGUE_RE,
  SCENE_NUMBER_EXACT_RE,
  SHORT_DIALOGUE_WORDS,
  TRANSITION_RE,
} from "./arabic-patterns";
import { hasDirectDialogueCues } from "./dialogue";
import { isParentheticalLine } from "./parenthetical";
import { buildProgressiveNodeAttributes } from "./shared-node-attrs";
import {
  hasActionVerbStructure,
  isActionCueLine,
  isActionVerbStart,
  matchesActionStartPattern,
  normalizeCharacterName,
  normalizeLine,
  stripLeadingBullets,
} from "./text-utils";

import type { ClassificationContext } from "./classification-types";

export interface ParsedInlineCharacterDialogue {
  characterName: string;
  dialogueText: string;
  cue?: string;
}

/**
 * يضمن أن اسم الشخصية ينتهي دائمًا بنقطتين.
 */
export const ensureCharacterTrailingColon = (value: string): string => {
  const normalized = normalizeCharacterName(stripLeadingBullets(value ?? ""));
  if (!normalized) return "";
  return `${normalized}:`;
};

// regex للضمائر العربية (فصحى + عامية) — بديل ديناميكي لـ NON_CHARACTER_SINGLE_TOKENS
const PRONOUN_RE =
  /^(?:أنا|انا|إنت|انت|أنت|أنتِ|إنتي|انتي|هو|هي|هم|هن|إحنا|احنا|نحن|أنتم|انتم)$/;

// regex للكلمات الوظيفية (حروف جر/عطف/نفي/استفهام/نداء) — بديل ديناميكي لـ NON_NAME_TOKENS
const FUNCTIONAL_WORD_RE =
  /^(?:و|ف|ب|ل|ك|من|في|فى|على|إلى|الى|عن|مع|هل|ما|لا|لم|لن|لو|إن|أن|ان|إذا|اذا|أين|اين|متى|كيف|لماذا|يا|يابا|يامّا)$/;

// regex لبدايات وظيفية مركّبة (و/ف + كلمة وظيفية): «وما»، «فلا»، «ولم»، «ولن»، ...
// هذه البدايات تدل على جملة حوارية وليست اسم شخصية.
const COMPOUND_FUNCTIONAL_START_RE =
  /^[وف](?:ما|لا|لم|لن|هل|إن|ان|أن|إذا|اذا|لو|من|في|فى|على|إلى|الى|عن|مع)$/;

// مجموعة بدايات الحوار — لرفض أسماء شخصيات تبدأ بكلمة كلامية
const CONVERSATIONAL_START_SET = new Set(CONVERSATIONAL_STARTS);

const isShortDialogueWord = (line: string): boolean => {
  const normalized = normalizeLine(line).toLowerCase();
  return SHORT_DIALOGUE_WORDS.includes(normalized);
};

// Helper functions to reduce complexity of isCandidateCharacterName
const hasInvalidCharacters = (candidate: string): boolean =>
  /[؟!,،"«»]/.test(candidate);

const hasInvalidTokens = (tokens: string[]): boolean => {
  if (tokens.length === 0 || tokens.length > 5) return true;
  if (tokens.some((token) => CHARACTER_STOP_WORDS.has(token))) return true;
  if (tokens.some((token) => PRONOUN_RE.test(token))) return true;
  return false;
};

const hasConversationalStart = (tokens: string[]): boolean => {
  if (tokens.length <= 1) return false;
  const firstToken = tokens[0];
  return firstToken ? CONVERSATIONAL_START_SET.has(firstToken) : false;
};

const hasFunctionalWords = (tokens: string[]): boolean =>
  tokens.some((token) => {
    const normalizedToken = normalizeLine(token);
    return FUNCTIONAL_WORD_RE.test(normalizedToken);
  });

const hasCompoundFunctionalStart = (tokens: string[]): boolean =>
  tokens.some((token) => {
    const normalizedToken = normalizeLine(token);
    return COMPOUND_FUNCTIONAL_START_RE.test(normalizedToken);
  });

const hasActionPatterns = (candidate: string): boolean =>
  isActionVerbStart(candidate) ||
  matchesActionStartPattern(candidate) ||
  hasActionVerbStructure(candidate);

const parseGlueInlineDialogue = (
  sanitized: string
): ParsedInlineCharacterDialogue | null => {
  const glueMatch = sanitized.match(INLINE_DIALOGUE_GLUE_RE);
  if (!glueMatch) return null;

  const [, rawCueText = "", rawCandidateName = "", rawDialogueText = ""] =
    glueMatch;
  const cueText = rawCueText.trim();
  const candidateName = normalizeCharacterName(rawCandidateName);
  const dialogueText = rawDialogueText.trim();

  if (
    cueText &&
    isActionCueLine(cueText) &&
    candidateName &&
    dialogueText &&
    isCandidateCharacterName(candidateName)
  ) {
    return { characterName: candidateName, dialogueText, cue: cueText };
  }

  return null;
};

const parseActionPrefixedInlineDialogue = (
  nameTokens: string[],
  dialogueText: string
): ParsedInlineCharacterDialogue | null => {
  const maxNameTokens = Math.min(3, nameTokens.length - 1);

  for (let k = 1; k <= maxNameTokens; k++) {
    const candidateName = normalizeCharacterName(
      nameTokens.slice(-k).join(" ")
    );
    const cueText = nameTokens.slice(0, -k).join(" ").trim();
    if (!cueText) continue;
    if (!isActionCueLine(cueText)) continue;
    if (!isCandidateCharacterName(candidateName)) continue;
    return { characterName: candidateName, dialogueText, cue: cueText };
  }

  return null;
};

export const isCandidateCharacterName = (value: string): boolean => {
  const candidate = normalizeCharacterName(value);
  if (!candidate) return false;
  if (!ARABIC_ONLY_WITH_NUMBERS_RE.test(candidate)) return false;
  if (isShortDialogueWord(candidate)) return false;
  if (hasInvalidCharacters(candidate)) return false;

  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (hasInvalidTokens(tokens)) return false;
  if (hasConversationalStart(tokens)) return false;
  if (hasFunctionalWords(tokens)) return false;
  if (hasCompoundFunctionalStart(tokens)) return false;
  if (hasActionPatterns(candidate)) return false;

  return CHARACTER_RE.test(`${candidate}:`);
};

export const parseInlineCharacterDialogue = (
  line: string
): ParsedInlineCharacterDialogue | null => {
  const trimmed = (line ?? "").trim();
  const sanitized = normalizeLine(stripLeadingBullets(trimmed));
  if (!sanitized) return null;

  const glueDialogue = parseGlueInlineDialogue(sanitized);
  if (glueDialogue) return glueDialogue;

  const inlineMatch = sanitized.match(INLINE_DIALOGUE_RE);
  if (!inlineMatch) return null;

  const rawNamePart = (inlineMatch[1] ?? "").trim();
  const dialogueText = (inlineMatch[2] ?? "").trim();
  if (!rawNamePart || !dialogueText) return null;

  const nameTokens = rawNamePart.split(/\s+/).filter(Boolean);
  if (nameTokens.length >= 2) {
    const actionPrefixedDialogue = parseActionPrefixedInlineDialogue(
      nameTokens,
      dialogueText
    );
    if (actionPrefixedDialogue) return actionPrefixedDialogue;
  }

  const normalizedName = normalizeCharacterName(rawNamePart);
  if (!isCandidateCharacterName(normalizedName)) return null;

  return { characterName: normalizedName, dialogueText };
};

// Helper to check if a line should be excluded from implicit character detection
const isExcludedImplicitLine = (
  trimmed: string,
  context: Partial<ClassificationContext>
): boolean => {
  if (!trimmed) return true;
  if (/[:：]/.test(trimmed)) return true;
  if (!context.isInDialogueBlock) return true;
  if (SCENE_NUMBER_EXACT_RE.test(trimmed)) return true;
  if (TRANSITION_RE.test(trimmed)) return true;
  if (isParentheticalLine(trimmed)) return true;
  return false;
};

// Check if dialogue text has speech cues
const hasSpeechCueIndicators = (dialogueText: string): boolean =>
  hasDirectDialogueCues(dialogueText) ||
  /[؟?!]/.test(dialogueText) ||
  /(?:\.{2,}|…)/.test(dialogueText);

// Check if action evidence indicates strong action patterns
const hasStrongActionEvidence = (dialogueText: string): boolean => {
  const actionEvidence = collectActionEvidence(dialogueText);
  return (
    actionEvidence.byDash ||
    actionEvidence.byPattern ||
    actionEvidence.byVerb ||
    actionEvidence.byStructure ||
    actionEvidence.byNarrativeSyntax ||
    actionEvidence.byPronounAction ||
    actionEvidence.byThenAction ||
    actionEvidence.byAudioNarrative
  );
};

export const parseImplicitCharacterDialogueWithoutColon = (
  line: string,
  context: Partial<ClassificationContext>,
  confirmedCharacters?: ReadonlySet<string>
): ParsedInlineCharacterDialogue | null => {
  const trimmed = (line ?? "").trim();
  if (isExcludedImplicitLine(trimmed, context)) return null;

  const normalized = normalizeLine(trimmed);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const maxNameTokens = Math.min(3, tokens.length - 1);
  for (let k = 1; k <= maxNameTokens; k++) {
    const candidateName = normalizeCharacterName(tokens.slice(0, k).join(" "));
    const dialogueText = tokens.slice(k).join(" ").trim();
    if (!candidateName || !dialogueText) continue;
    if (!isCandidateCharacterName(candidateName)) continue;

    // Guard: character must be in confirmed list
    if (!confirmedCharacters?.has(candidateName)) continue;

    if (!hasSpeechCueIndicators(dialogueText)) continue;
    if (hasStrongActionEvidence(dialogueText)) continue;

    return { characterName: candidateName, dialogueText };
  }

  return null;
};

// Helper to check if a line should be excluded from character detection
const isExcludedCharacterLine = (trimmed: string): boolean => {
  if (!trimmed) return true;
  if (!/[:：]\s*$/.test(trimmed)) return true;
  if (SCENE_NUMBER_EXACT_RE.test(trimmed)) return true;
  if (TRANSITION_RE.test(trimmed)) return true;
  if (isParentheticalLine(trimmed)) return true;
  return false;
};

export const isCharacterLine = (
  line: string,
  _context?: Partial<ClassificationContext>,
  _confirmedCharacters?: ReadonlySet<string>
): boolean => {
  const trimmed = normalizeLine(stripLeadingBullets((line ?? "").trim()));
  if (isExcludedCharacterLine(trimmed)) return false;

  const namePart = normalizeCharacterName(trimmed);
  if (!isCandidateCharacterName(namePart)) return false;

  const nameTokens = namePart.split(/\s+/).filter(Boolean);
  if (nameTokens.length === 1 && !_confirmedCharacters?.has(namePart)) {
    return false;
  }

  return true;
};

/**
 * اسم الشخصية (Character)
 * يظهر بالوسط فوق الحوار
 */
export const Character = Node.create({
  name: "character",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return buildProgressiveNodeAttributes();
  },

  parseHTML() {
    return [{ tag: 'div[data-type="character"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "character",
        class: "screenplay-character",
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      // الانتقال إلى الحوار عند الضغط على Enter
      Enter: ({ editor }) => {
        if (!editor.isActive("character")) return false;

        // تأكيد وجود ":" في نهاية اسم الشخصية قبل الانتقال للحوار.
        editor
          .chain()
          .command(({ state, tr }) => {
            const { $from } = state.selection;

            for (let depth = $from.depth; depth >= 0; depth--) {
              if ($from.node(depth).type.name !== "character") continue;

              const characterNode = $from.node(depth);
              const currentText = characterNode.textContent.trim();
              if (!currentText) return true;
              if (/[:：]\s*$/.test(currentText)) return true;

              const nodeContentEnd =
                $from.start(depth) + characterNode.content.size;
              tr.insertText(":", nodeContentEnd, nodeContentEnd);
              return true;
            }

            return true;
          })
          .run();

        return editor.chain().focus().splitBlock().setDialogue().run();
      },
    };
  },
});

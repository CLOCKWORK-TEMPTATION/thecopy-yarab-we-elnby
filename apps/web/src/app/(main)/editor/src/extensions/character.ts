import { Node, mergeAttributes } from "@tiptap/core";
import type { ClassificationContext } from "./classification-types";
import { buildProgressiveNodeAttributes } from "./shared-node-attrs";
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
import { collectActionEvidence } from "./action";
import { hasDirectDialogueCues } from "./dialogue";
import { isParentheticalLine } from "./parenthetical";
import {
  hasActionVerbStructure,
  isActionCueLine,
  isActionVerbStart,
  matchesActionStartPattern,
  normalizeCharacterName,
  normalizeLine,
  stripLeadingBullets,
} from "./text-utils";

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

export const isCandidateCharacterName = (value: string): boolean => {
  const candidate = normalizeCharacterName(value);
  if (!candidate) return false;
  if (!ARABIC_ONLY_WITH_NUMBERS_RE.test(candidate)) return false;
  if (isShortDialogueWord(candidate)) return false;
  if (/[؟!,،"«»]/.test(candidate)) return false;

  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 5) return false;
  if (tokens.some((token) => CHARACTER_STOP_WORDS.has(token))) return false;
  // ضمير في أي موضع → مش اسم شخصية (مش بس لو كلمة واحدة)
  if (tokens.some((token) => PRONOUN_RE.test(token))) return false;
  // بداية كلامية (يا، انت، مش، ...) → حوار مش اسم
  const firstToken = tokens[0];
  if (
    tokens.length > 1 &&
    firstToken &&
    CONVERSATIONAL_START_SET.has(firstToken)
  )
    return false;
  if (
    tokens.some((token) => {
      const normalizedToken = normalizeLine(token);
      return FUNCTIONAL_WORD_RE.test(normalizedToken);
    })
  ) {
    return false;
  }
  // رفض بدايات وظيفية مركّبة («وما»، «فلا»، ...) في أي token
  if (
    tokens.some((token) => {
      const normalizedToken = normalizeLine(token);
      return COMPOUND_FUNCTIONAL_START_RE.test(normalizedToken);
    })
  ) {
    return false;
  }

  if (isActionVerbStart(candidate)) return false;
  if (matchesActionStartPattern(candidate)) return false;
  if (hasActionVerbStructure(candidate)) return false;

  return CHARACTER_RE.test(`${candidate}:`);
};

export const parseInlineCharacterDialogue = (
  line: string
): ParsedInlineCharacterDialogue | null => {
  const trimmed = (line ?? "").trim();
  const sanitized = normalizeLine(stripLeadingBullets(trimmed));
  if (!sanitized) return null;

  const glueMatch = sanitized.match(INLINE_DIALOGUE_GLUE_RE);
  if (glueMatch) {
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
  }

  const inlineMatch = sanitized.match(INLINE_DIALOGUE_RE);
  if (!inlineMatch) return null;

  const rawNamePart = (inlineMatch[1] ?? "").trim();
  const dialogueText = (inlineMatch[2] ?? "").trim();
  if (!rawNamePart || !dialogueText) return null;

  const nameTokens = rawNamePart.split(/\s+/).filter(Boolean);
  if (nameTokens.length >= 2) {
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
  }

  const normalizedName = normalizeCharacterName(rawNamePart);
  if (!isCandidateCharacterName(normalizedName)) return null;

  return { characterName: normalizedName, dialogueText };
};

export const parseImplicitCharacterDialogueWithoutColon = (
  line: string,
  context: Partial<ClassificationContext>,
  confirmedCharacters?: ReadonlySet<string>
): ParsedInlineCharacterDialogue | null => {
  const trimmed = (line ?? "").trim();
  if (!trimmed) return null;
  if (/[:：]/.test(trimmed)) return null;
  if (!context.isInDialogueBlock) return null;

  if (SCENE_NUMBER_EXACT_RE.test(trimmed)) return null;
  if (TRANSITION_RE.test(trimmed)) return null;
  if (isParentheticalLine(trimmed)) return null;

  const normalized = normalizeLine(trimmed);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const maxNameTokens = Math.min(3, tokens.length - 1);
  for (let k = 1; k <= maxNameTokens; k++) {
    const candidateName = normalizeCharacterName(tokens.slice(0, k).join(" "));
    const dialogueText = tokens.slice(k).join(" ").trim();
    if (!candidateName || !dialogueText) continue;
    if (!isCandidateCharacterName(candidateName)) continue;

    // Guard صارم: أي اسم (مفرد أو مركب) لا يُعتبر بداية شخصية ضمنية
    // إلا إذا كان مؤكداً مسبقاً في سجل الشخصيات (confirmedCharacters).
    // السبب: السطر ده جاي من كرنك كحوار صحيح، فصعود الحاجز يمنع
    // تقسيمه الخاطئ إلى «اسم + حوار» بناءً على تطابق هيكلي ضعيف.
    if (!confirmedCharacters || !confirmedCharacters.has(candidateName)) {
      continue;
    }

    const hasSpeechCue =
      hasDirectDialogueCues(dialogueText) ||
      /[؟?!]/.test(dialogueText) ||
      /(?:\.{2,}|…)/.test(dialogueText);
    if (!hasSpeechCue) continue;

    const actionEvidence = collectActionEvidence(dialogueText);
    const hasStrongAction =
      actionEvidence.byDash ||
      actionEvidence.byPattern ||
      actionEvidence.byVerb ||
      actionEvidence.byStructure ||
      actionEvidence.byNarrativeSyntax ||
      actionEvidence.byPronounAction ||
      actionEvidence.byThenAction ||
      actionEvidence.byAudioNarrative;

    if (hasStrongAction) continue;

    return { characterName: candidateName, dialogueText };
  }

  return null;
};

export const isCharacterLine = (
  line: string,
  _context?: Partial<ClassificationContext>,
  _confirmedCharacters?: ReadonlySet<string>
): boolean => {
  const trimmed = normalizeLine(stripLeadingBullets((line ?? "").trim()));
  if (!trimmed) return false;

  if (!/[:：]\s*$/.test(trimmed)) return false;
  if (SCENE_NUMBER_EXACT_RE.test(trimmed)) return false;
  if (TRANSITION_RE.test(trimmed)) return false;
  if (isParentheticalLine(trimmed)) return false;

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

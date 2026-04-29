/**
 * @module extensions/hybrid-classifier
 * @description
 * مصنّف هجين خفيف: regex قوي + سياق + ذاكرة قصيرة.
 *
 * يعمل كطبقة تصنيف ثانية بعد كواشف regex الأولية، ويُحسّن
 * الحالات الرمادية (السطور الغامضة) بدون تبعيات خارجية أو AI.
 *
 * يُصدّر:
 * - {@link HybridResult} — نتيجة التصنيف (نوع + ثقة + طريقة)
 * - {@link HybridClassifier} — الفئة الرئيسية مع `classifyLine()`
 *
 * سلّم الثقة:
 * | الحالة | الثقة |
 * |--------|-------|
 * | بسملة (regex) | 99 |
 * | رأس مشهد علوي (regex) | 96 |
 * | انتقال (regex) | 95 |
 * | شخصية معروفة من الذاكرة | 92 |
 * | نمط حوار ×3 | 86 |
 * | نمط وصف ×3 | 85 |
 * | قيمة احتياطية | 80 |
 *
 * يُستهلك في {@link PasteClassifier} → `classifyLines()`.
 */
import { collectActionEvidence } from "./action";
import { SCENE_NUMBER_EXACT_RE } from "./arabic-patterns";
import { isStandaloneBasmalaLine } from "./basmala";
import { hasDirectDialogueCues, getDialogueProbability } from "./dialogue";
import { pipelineRecorder } from "./pipeline-recorder";
import { isSceneHeader3Line } from "./scene-header-3";
import { isCompleteSceneHeaderLine } from "./scene-header-top-line";
import { normalizeCharacterName, normalizeLine } from "./text-utils";
import { isTransitionLine } from "./transition";

import type {
  ClassificationContext,
  ClassificationMethod,
  ElementType,
} from "./classification-types";
import type { ContextMemorySnapshot } from "./context-memory-manager";
import type { LineContextInfo } from "./document-context-graph";

/**
 * نتيجة التصنيف الهجين — نوع العنصر مع درجة الثقة وطريقة التصنيف.
 */
export interface HybridResult {
  readonly type: ElementType;
  readonly confidence: number;
  readonly classificationMethod: ClassificationMethod;
}

// ─── نتيجة تجميع أدلة التصنيف ────────────────────────────────────────

interface HybridEvidenceResult {
  readonly actionTotal: number;
  readonly dialogueTotal: number;
}

// ─── أدوات مساعدة ────────────────────────────────────────────────────

/** عدد كلمات السطر */
const wordCount = (line: string): number =>
  line.split(/\s+/).filter(Boolean).length;

// ─── تصنيف بالـ regex ────────────────────────────────────────────────

/** تصنيف بناءً على أنماط regex الحاسمة */
const classifyByRegex = (
  line: string,
  normalizedLine: string
): HybridResult | null => {
  if (isStandaloneBasmalaLine(line)) {
    return { type: "basmala", confidence: 99, classificationMethod: "regex" };
  }
  if (isCompleteSceneHeaderLine(line)) {
    return {
      type: "scene_header_1",
      confidence: 96,
      classificationMethod: "regex",
    };
  }
  if (SCENE_NUMBER_EXACT_RE.test(normalizedLine)) {
    return {
      type: "scene_header_1",
      confidence: 88,
      classificationMethod: "regex",
    };
  }
  if (isTransitionLine(line)) {
    return {
      type: "transition",
      confidence: 95,
      classificationMethod: "regex",
    };
  }
  if (isSceneHeader3Line(normalizedLine)) {
    return {
      type: "scene_header_3",
      confidence: 90,
      classificationMethod: "regex",
    };
  }
  return null;
};

// ─── تصنيف الشخصيات ──────────────────────────────────────────────────

/** تصنيف الشخصيات الأحادية والمعروفة من الذاكرة */
const classifyByCharacterHeuristics = (
  line: string,
  normalizedLine: string,
  fallbackType: ElementType,
  memory: ContextMemorySnapshot
): HybridResult | null => {
  const isSingleTokenCharCandidate =
    /[:：]\s*$/.test(normalizedLine) &&
    !SCENE_NUMBER_EXACT_RE.test(normalizedLine) &&
    !isTransitionLine(normalizedLine) &&
    wordCount(normalizedLine) <= 4 &&
    !/[.!؟،]/.test(normalizedLine.replace(/[:：]\s*$/, ""));

  if (isSingleTokenCharCandidate) {
    const characterName = normalizeCharacterName(line);
    const seenCount = memory.characterFrequency.get(characterName) ?? 0;
    if (fallbackType === "character" || seenCount >= 1) {
      return {
        type: "character",
        confidence: seenCount >= 1 ? 92 : 84,
        classificationMethod: "context",
      };
    }
    if (wordCount(normalizedLine.replace(/[:：]\s*$/, "")) === 1) {
      return {
        type: "character",
        confidence: 78,
        classificationMethod: "regex",
      };
    }
  }

  if (fallbackType === "character") {
    const characterName = normalizeCharacterName(line);
    const seenCount = memory.characterFrequency.get(characterName) ?? 0;
    if (seenCount >= 1) {
      return {
        type: "character",
        confidence: 92,
        classificationMethod: "context",
      };
    }
  }

  return null;
};

// ─── حساب أدلة التصنيف ───────────────────────────────────────────────

/** وزن متناقص لآخر N أنواع — الأحدث = أعلى */
const CONTEXT_WEIGHTS = [5, 4, 3, 2, 1] as const;

/** حساب context bonus لنوع معين من الأنواع السابقة */
const contextBonus = (
  targetType: "action" | "dialogue",
  recentTypes: readonly string[]
): number => {
  const recent = recentTypes.slice(-CONTEXT_WEIGHTS.length);
  let bonus = 0;
  for (let i = 0; i < recent.length; i++) {
    const weight = CONTEXT_WEIGHTS[CONTEXT_WEIGHTS.length - recent.length + i];
    if (weight === undefined) continue;
    if (recent[i] === targetType) bonus += weight;
    if (targetType === "dialogue" && recent[i] === "parenthetical") {
      bonus += Math.max(1, weight - 1);
    }
  }
  return bonus;
};

/** حساب نقاط أدلة الوصف من ActionEvidence */
const scoreActionEvidence = (
  line: string
): { score: number; hasVerbOrStructure: boolean } => {
  const actionEv = collectActionEvidence(line);
  let score = 0;
  if (actionEv.byVerb) score += 3;
  if (actionEv.byStructure) score += 2;
  if (actionEv.byPattern) score += 2;
  if (actionEv.byCue) score += 2;
  if (actionEv.byDash) score += 3;
  if (actionEv.byNarrativeSyntax) score += 1;
  if (actionEv.byPronounAction) score += 1;
  if (actionEv.byThenAction) score += 1;
  if (actionEv.byAudioNarrative) score += 2;
  if (wordCount(line) >= 4 && score > 0) score += 1;
  return { score, hasVerbOrStructure: actionEv.byVerb || actionEv.byStructure };
};

/** حساب نقاط أدلة الحوار */
const scoreDialogueEvidence = (line: string): number => {
  let score = 0;
  if (hasDirectDialogueCues(line)) score += 4;
  const dp = getDialogueProbability(line);
  if (dp >= 4) score += 3;
  else if (dp >= 2) score += 1;
  return score;
};

/** حساب bonus من DCG */
const computeDcgBonus = (
  lineCtx: LineContextInfo | undefined,
  actionScore: number
): { dcgActionBonus: number; dcgDialogueBonus: number } => {
  if (!lineCtx) return { dcgActionBonus: 0, dcgDialogueBonus: 0 };
  const dcgActionBonus =
    lineCtx.scenePosition < 0.1 && lineCtx.sceneLinesCount > 3 ? 1 : 0;
  const dcgDialogueBonus =
    lineCtx.dialogueDensity > 0.7 && actionScore === 0 ? 1 : 0;
  return { dcgActionBonus, dcgDialogueBonus };
};

/**
 * تجميع أدلة التصنيف من مصادر متعددة + context bonus + dialogue flow breaker.
 */
const collectHybridEvidence = (
  line: string,
  _context: ClassificationContext,
  memory: ContextMemorySnapshot,
  lineCtx?: LineContextInfo
): HybridEvidenceResult => {
  const { score: actionScore, hasVerbOrStructure } = scoreActionEvidence(line);
  const dialogueScore = scoreDialogueEvidence(line);

  const actionCtx = contextBonus("action", memory.recentTypes);
  const dialogueCtx = contextBonus("dialogue", memory.recentTypes);

  const dialoguePenalty =
    memory.isInDialogueFlow &&
    hasVerbOrStructure &&
    !hasDirectDialogueCues(line)
      ? 8
      : 0;

  const { dcgActionBonus, dcgDialogueBonus } = computeDcgBonus(
    lineCtx,
    actionScore
  );

  return {
    actionTotal: actionScore + actionCtx + dcgActionBonus,
    dialogueTotal:
      dialogueScore + dialogueCtx + dcgDialogueBonus - dialoguePenalty,
  };
};

// ─── تصنيف بالأدلة ───────────────────────────────────────────────────

/** تصنيف بناءً على الأدلة المجمّعة */
const classifyByEvidence = (
  line: string,
  context: ClassificationContext,
  memory: ContextMemorySnapshot,
  lineCtx: LineContextInfo | undefined,
  fallbackType: ElementType
): HybridResult => {
  const evidence = collectHybridEvidence(line, context, memory, lineCtx);

  if (evidence.actionTotal > evidence.dialogueTotal + 1) {
    return {
      type: "action",
      confidence: Math.min(92, 78 + evidence.actionTotal),
      classificationMethod: "context",
    };
  }

  if (evidence.dialogueTotal > evidence.actionTotal + 1) {
    return {
      type: "dialogue",
      confidence: Math.min(92, 78 + evidence.dialogueTotal),
      classificationMethod: "context",
    };
  }

  return {
    type: fallbackType,
    confidence: 80,
    classificationMethod: "context",
  };
};

// ─── الفئة الرئيسية ────────────────────────────────────────────────────

/**
 * مصنف هجين خفيف: regex قوي + سياق + ذاكرة قصيرة.
 * الهدف تحسين الحالات الرمادية بدون تبعيات خارجية.
 */
export class HybridClassifier {
  /**
   * يصنّف سطراً واحداً عبر سلسلة أولويات:
   * basmala → sceneHeaderTopLine → transition → شخصية معروفة → أدلة مُثرية → احتياطي.
   *
   * @param line - السطر المطبّع
   * @param fallbackType - النوع الاحتياطي من المصنّف الأولي
   * @param context - سياق التصنيف (الأنواع السابقة)
   * @param memory - لقطة ذاكرة السياق
   * @param lineCtx - سياق السطر من DCG (اختياري)
   * @returns {@link HybridResult}
   */
  classifyLine(
    line: string,
    fallbackType: ElementType,
    context: ClassificationContext,
    memory: ContextMemorySnapshot,
    lineCtx?: LineContextInfo
  ): HybridResult {
    pipelineRecorder.trackFile("hybrid-classifier.ts");
    const normalizedLine = normalizeLine(line);

    const regexResult = classifyByRegex(line, normalizedLine);
    if (regexResult) return regexResult;

    const charResult = classifyByCharacterHeuristics(
      line,
      normalizedLine,
      fallbackType,
      memory
    );
    if (charResult) return charResult;

    return classifyByEvidence(line, context, memory, lineCtx, fallbackType);
  }
}

/**
 * @module extensions/paste-classifier/classify-lines
 *
 * نقطة الدخول الأساسية للتصنيف الخالص للنصوص (بدون ProseMirror):
 * - تطبيع النص.
 * - تنظيف artifacts الناتجة عن OCR.
 * - تصنيف per-line بسلسلة قواعد regex/context.
 * - تشغيل passes لاحقة: retroactive، reverse، Viterbi، suspicion engine.
 * - تسجيل تشخيصات وعينات pipelineRecorder.
 *
 * كل قواعد التصنيف ونتائجها وسلوك pipeline متطابقة مع النسخة السابقة من
 * paste-classifier.ts؛ لم تُغيَّر أي ثقة أو عتبة أو منطق ترتيب.
 */

import { traceCollector } from "@editor/suspicion-engine/trace/trace-collector";

import { isActionLine } from "../action";
import { convertHindiToArabic, detectDialect } from "../arabic-patterns";
import { isStandaloneBasmalaLine } from "../basmala";
import {
  ensureCharacterTrailingColon,
  isCharacterLine,
  parseImplicitCharacterDialogueWithoutColon,
  parseInlineCharacterDialogue,
} from "../character";
import { resolveNarrativeDecision } from "../classification-decision";
import { ContextMemoryManager } from "../context-memory-manager";
import {
  getDialogueProbability,
  isDialogueContinuationLine,
  isDialogueLine,
} from "../dialogue";
import {
  buildDocumentContextGraph,
  type DocumentContextGraph,
} from "../document-context-graph";
import { HybridClassifier } from "../hybrid-classifier";
import {
  mergeBrokenCharacterName,
  parseBulletLine,
  shouldMergeWrappedLines,
} from "../line-repair";
import { isParentheticalLine } from "../parenthetical";
import {
  agentReviewLogger,
  sanitizeOcrArtifactsForClassification,
} from "../paste-classifier-config";
import {
  generateItemId,
  normalizeRawInputText,
  toSourceProfile,
  buildStructuredHintQueues,
  consumeSourceHintTypeForLine,
  type ClassifiedDraftWithId,
} from "../paste-classifier-helpers";
import { pipelineRecorder } from "../pipeline-recorder";
import { isSceneHeader3Line } from "../scene-header-3";
import {
  isCompleteSceneHeaderLine,
  splitSceneHeaderLine,
} from "../scene-header-top-line";
import {
  shouldReflect,
  reflectOnChunk,
  SELF_REFLECTION_CHUNK_SIZE,
} from "../self-reflection-pass";
import { isTransitionLine } from "../transition";

import { buildContext, hasTemporalSceneSignal } from "./classification-context";
import { applyClassifyLinesPostPasses } from "./classify-lines-post-passes";
import { PIPELINE_FLAGS } from "./constants";
import {
  buildSchemaSeedQueues,
  consumeSchemaSeedTypeForLine,
  recordSchemaSeedVotes,
  shouldPreferSchemaSeedDecision,
} from "./schema-seed";
import { buildDraftForType } from "./utils/draft-builders";

import type { ClassifyLinesContext } from "./types";
import type {
  ClassifiedDraft,
  ClassificationContext,
  ElementType,
} from "../classification-types";
import type { ContextMemorySnapshot } from "../context-memory-manager";

// ─── أنواع مساعدة داخلية ────────────────────────────────────────────

interface LineClassifierState {
  classified: ClassifiedDraftWithId[];
  memoryManager: ContextMemoryManager;
  hybridClassifier: HybridClassifier;
  dcg: DocumentContextGraph | undefined;
  push: (entry: ClassifiedDraft) => void;
}

interface SchemaSeedCounters {
  adopted: number;
  overridden: number;
}

// ─── دوال تشخيص النص ─────────────────────────────────────────────────

const countMatches = (text: string, re: RegExp): number =>
  (text.match(re) ?? []).length;

const buildCharBreakdown = (text: string): Record<string, number> => ({
  cr: countMatches(text, /\r/g),
  nbsp: countMatches(text, /\u00A0/gu),
  zwnj: countMatches(text, /‌/gu),
  zwj: countMatches(text, /‍/gu),
  zwsp: countMatches(text, /\u200B/gu),
  lrm: countMatches(text, /‎/gu),
  rlm: countMatches(text, /‏/gu),
  bom: countMatches(text, /\uFEFF/gu),
  tab: countMatches(text, /\t/g),
  softHyphen: countMatches(text, /­/gu),
  alm: countMatches(text, /؜/gu),
  fullwidthColon: countMatches(text, /：/gu),
});

const logNormalizeDiag = (text: string, normalizedText: string): void => {
  agentReviewLogger.info("diag:normalize-delta", {
    originalLength: text.length,
    normalizedLength: normalizedText.length,
    charsRemoved: text.length - normalizedText.length,
    charBreakdown: JSON.stringify(buildCharBreakdown(text)),
  });
};

const logClassifyLinesInput = (
  normalizedText: string,
  lines: string[],
  removedLines: number,
  context?: ClassifyLinesContext
): void => {
  const rawLen = normalizedText.length;
  const rawLines = normalizedText.split(/\r?\n/).length;
  const rawHash = Array.from(normalizedText).reduce(
    (h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0,
    0
  );
  agentReviewLogger.info("diag:classifyLines-input", {
    classificationProfile: context?.classificationProfile,
    sourceFileType: context?.sourceFileType,
    hasStructuredHints: !!(
      context?.structuredHints && context.structuredHints.length > 0
    ),
    rawTextLength: rawLen,
    rawLineCount: rawLines,
    rawTextHash: rawHash,
    sanitizedLineCount: lines.length,
    sanitizedRemovedLines: removedLines,
    first80: normalizedText.slice(0, 80).replace(/\n/g, "↵"),
    last80: normalizedText.slice(-80).replace(/\n/g, "↵"),
  });
};

interface OutputDiagParams {
  normalizedText: string;
  lines: string[];
  classified: ClassifiedDraftWithId[];
  seqOptResult: { totalDisagreements: number };
  schemaSeedAdopted: number;
  schemaSeedOverridden: number;
  context?: ClassifyLinesContext;
}

const logClassifyLinesOutput = (params: OutputDiagParams): void => {
  const {
    normalizedText,
    lines,
    classified,
    seqOptResult,
    schemaSeedAdopted,
    schemaSeedOverridden,
    context,
  } = params;
  const typeDist: Record<string, number> = {};
  for (const item of classified) {
    typeDist[item.type] = (typeDist[item.type] ?? 0) + 1;
  }
  agentReviewLogger.info("diag:classifyLines-output", {
    classificationProfile: context?.classificationProfile,
    sourceFileType: context?.sourceFileType,
    rawTextHash: Array.from(normalizedText).reduce(
      (h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0,
      0
    ),
    inputLineCount: lines.length,
    classifiedCount: classified.length,
    mergedOrSkipped: lines.length - classified.length,
    typeDistribution: typeDist,
    viterbiDisagreements: seqOptResult.totalDisagreements,
    schemaSeedAdopted,
    schemaSeedOverridden,
  });
};

// ─── قواعد دمج الأسطر السابقة ────────────────────────────────────────

/**
 * محاولة دمج السطر الحالي بالسطر السابق (إصلاح اسم شخصية مكسور أو سطر ملفوف).
 * @returns true إذا تم الدمج (skip السطر الحالي)
 */
const tryMergePreviousLine = (
  trimmed: string,
  state: LineClassifierState
): boolean => {
  const { classified, memoryManager } = state;
  const previous = classified[classified.length - 1];
  if (!previous) return false;

  const mergedCharacter = mergeBrokenCharacterName(previous.text, trimmed);
  if (mergedCharacter && previous.type === "action") {
    const corrected: ClassifiedDraft = {
      ...previous,
      type: "character",
      text: ensureCharacterTrailingColon(mergedCharacter),
      confidence: 92,
      classificationMethod: "context",
    };
    classified[classified.length - 1] = corrected;
    memoryManager.replaceLast(corrected);
    return true;
  }

  if (shouldMergeWrappedLines(previous.text, trimmed, previous.type)) {
    const merged: ClassifiedDraft = {
      ...previous,
      text: `${previous.text} ${trimmed}`.replace(/\s+/g, " ").trim(),
      confidence: Math.max(previous.confidence, 86),
      classificationMethod: "context",
    };
    classified[classified.length - 1] = merged;
    memoryManager.replaceLast(merged);
    return true;
  }

  return false;
};

// ─── قواعد تصنيف per-line ────────────────────────────────────────────

/** قاعدة 1: بسملة */
const tryClassifyBasmala = (
  normalizedForClassification: string,
  trimmed: string,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  if (!isStandaloneBasmalaLine(normalizedForClassification)) return false;
  push({
    type: "basmala",
    text: trimmed,
    confidence: 99,
    classificationMethod: "regex",
  });
  return true;
};

/** قاعدة 2: رأس مشهد كامل */
const tryClassifyCompleteSceneHeader = (
  normalizedForClassification: string,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  if (!isCompleteSceneHeaderLine(normalizedForClassification)) return false;
  const parts = splitSceneHeaderLine(normalizedForClassification);
  if (!parts) return false;
  push({
    type: "scene_header_1",
    text: parts.header1,
    confidence: 96,
    classificationMethod: "regex",
  });
  if (parts.header2) {
    push({
      type: "scene_header_2",
      text: parts.header2,
      confidence: 96,
      classificationMethod: "regex",
    });
  }
  return true;
};

/** قاعدة 3: انتقال */
const tryClassifyTransition = (
  normalizedForClassification: string,
  trimmed: string,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  if (!isTransitionLine(normalizedForClassification)) return false;
  push({
    type: "transition",
    text: trimmed,
    confidence: 95,
    classificationMethod: "regex",
  });
  return true;
};

/** قاعدة 4: رأس مشهد 3 (بعد top_line أو regex مباشر) */
const tryClassifySceneHeader3 = (
  normalizedForClassification: string,
  trimmed: string,
  context: ClassificationContext,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  const temporalSceneSignal = hasTemporalSceneSignal(
    normalizedForClassification
  );
  if (
    context.isAfterSceneHeaderTopLine &&
    (isSceneHeader3Line(normalizedForClassification, context) ||
      temporalSceneSignal)
  ) {
    push({
      type: "scene_header_3",
      text: trimmed,
      confidence: temporalSceneSignal ? 88 : 90,
      classificationMethod: "context",
    });
    return true;
  }
  if (isSceneHeader3Line(normalizedForClassification, context)) {
    push({
      type: "scene_header_3",
      text: trimmed,
      confidence: 82,
      classificationMethod: "regex",
    });
    return true;
  }
  return false;
};

/** قاعدة 5: حوار مضمّن (character + dialogue في سطر واحد) */
const tryClassifyInlineCharacterDialogue = (
  trimmed: string,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  const inlineParsed = parseInlineCharacterDialogue(trimmed);
  if (!inlineParsed) return false;
  if (inlineParsed.cue) {
    push({
      type: "action",
      text: inlineParsed.cue,
      confidence: 92,
      classificationMethod: "regex",
    });
  }
  push({
    type: "character",
    text: ensureCharacterTrailingColon(inlineParsed.characterName),
    confidence: 98,
    classificationMethod: "regex",
  });
  push({
    type: "dialogue",
    text: inlineParsed.dialogueText,
    confidence: 98,
    classificationMethod: "regex",
  });
  return true;
};

/** قاعدة 6: إرشاد مسرحي (parenthetical) داخل كتلة حوار */
const tryClassifyParenthetical = (
  normalizedForClassification: string,
  trimmed: string,
  context: ClassificationContext,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  if (
    !isParentheticalLine(normalizedForClassification) ||
    !context.isInDialogueBlock
  )
    return false;
  push({
    type: "parenthetical",
    text: trimmed,
    confidence: 90,
    classificationMethod: "regex",
  });
  return true;
};

/** قاعدة 7: استمرار حوار */
const tryClassifyDialogueContinuation = (
  rawLine: string,
  trimmed: string,
  context: ClassificationContext,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  if (!isDialogueContinuationLine(rawLine, context.previousType)) return false;
  push({
    type: "dialogue",
    text: trimmed,
    confidence: 82,
    classificationMethod: "context",
  });
  return true;
};

/** قاعدة 8: حوار ضمني بدون نقطتين */
const tryClassifyImplicitCharacterDialogue = (
  trimmed: string,
  context: ClassificationContext,
  snapshot: ContextMemorySnapshot,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  const implicit = parseImplicitCharacterDialogueWithoutColon(
    trimmed,
    context,
    snapshot.confirmedCharacters
  );
  if (!implicit) return false;
  if (implicit.cue) {
    push({
      type: "action",
      text: implicit.cue,
      confidence: 85,
      classificationMethod: "context",
    });
  }
  push({
    type: "character",
    text: ensureCharacterTrailingColon(implicit.characterName),
    confidence: 78,
    classificationMethod: "context",
  });
  push({
    type: "dialogue",
    text: implicit.dialogueText,
    confidence: 78,
    classificationMethod: "context",
  });
  return true;
};

/** قاعدة 9: اسم شخصية */
const tryClassifyCharacter = (
  normalizedForClassification: string,
  trimmed: string,
  context: ClassificationContext,
  snapshot: ContextMemorySnapshot,
  push: (entry: ClassifiedDraft) => void
): boolean => {
  if (
    !isCharacterLine(
      normalizedForClassification,
      context,
      snapshot.confirmedCharacters
    )
  )
    return false;
  push({
    type: "character",
    text: ensureCharacterTrailingColon(trimmed),
    confidence: 88,
    classificationMethod: "regex",
  });
  return true;
};

/** قاعدة 10: حوار بالاحتمالية */
interface DialogueClassifyArgs {
  normalized: string;
  trimmed: string;
  context: ClassificationContext;
  snapshot: ContextMemorySnapshot;
  detectedDialect: boolean;
  push: (entry: ClassifiedDraft) => void;
}

const tryClassifyDialogue = (args: DialogueClassifyArgs): boolean => {
  const { normalized, trimmed, context, snapshot, detectedDialect, push } =
    args;
  const dialogueProbability = getDialogueProbability(normalized, context);
  const dialogueThreshold = detectedDialect ? 5 : 6;
  if (
    !isDialogueLine(normalized, context, snapshot) &&
    dialogueProbability < dialogueThreshold
  ) {
    return false;
  }
  const dialectBoost = detectedDialect ? 3 : 0;
  push({
    type: "dialogue",
    text: trimmed,
    confidence: Math.max(
      72,
      Math.min(94, 64 + dialogueProbability * 4 + dialectBoost)
    ),
    classificationMethod: "context",
  });
  return true;
};

// ─── قاعدة 11: schema seed + hybrid fallback ─────────────────────────

interface HybridFallbackParams {
  normalizedForClassification: string;
  trimmed: string;
  lineIdx: number;
  context: ClassificationContext;
  state: LineClassifierState;
  activeSchemaSeedType: ElementType | undefined;
  counters: SchemaSeedCounters;
}

const classifyWithHybridFallback = (params: HybridFallbackParams): void => {
  const {
    normalizedForClassification,
    trimmed,
    lineIdx,
    context,
    state,
    activeSchemaSeedType,
    counters,
  } = params;
  const { memoryManager, hybridClassifier, dcg, push } = state;

  const decision = resolveNarrativeDecision(
    normalizedForClassification,
    context,
    memoryManager.getSnapshot()
  );
  const hybridResult = hybridClassifier.classifyLine(
    normalizedForClassification,
    decision.type,
    context,
    memoryManager.getSnapshot(),
    dcg?.lineContexts[lineIdx]
  );

  if (
    shouldPreferSchemaSeedDecision({
      schemaType: activeSchemaSeedType,
      localType: hybridResult.type,
      localConfidence: hybridResult.confidence,
      localMethod: hybridResult.classificationMethod,
    })
  ) {
    counters.adopted += 1;
    push(
      buildDraftForType(
        activeSchemaSeedType!,
        trimmed,
        Math.max(0.9, hybridResult.confidence),
        "external-engine"
      )
    );
    return;
  }
  if (activeSchemaSeedType && hybridResult.type !== activeSchemaSeedType) {
    counters.overridden += 1;
  }

  if (hybridResult.type === "scene_header_1") {
    const parts = splitSceneHeaderLine(normalizedForClassification);
    if (parts?.header2) {
      push({
        type: "scene_header_1",
        text: parts.header1,
        confidence: Math.max(85, hybridResult.confidence),
        classificationMethod: hybridResult.classificationMethod,
      });
      push({
        type: "scene_header_2",
        text: parts.header2,
        confidence: Math.max(85, hybridResult.confidence),
        classificationMethod: hybridResult.classificationMethod,
      });
      return;
    }
  }

  if (hybridResult.type === "character") {
    push({
      type: "character",
      text: ensureCharacterTrailingColon(trimmed),
      confidence: Math.max(78, hybridResult.confidence),
      classificationMethod: hybridResult.classificationMethod,
    });
    return;
  }

  if (
    hybridResult.type === "action" ||
    isActionLine(normalizedForClassification, context)
  ) {
    push({
      type: "action",
      text: trimmed.replace(/^[-–—]\s*/, ""),
      confidence: Math.max(74, hybridResult.confidence),
      classificationMethod: hybridResult.classificationMethod,
    });
    return;
  }

  push({
    type: hybridResult.type,
    text: trimmed,
    confidence: Math.max(68, hybridResult.confidence),
    classificationMethod: hybridResult.classificationMethod,
  });
};

// ─── حلقة التصنيف الرئيسية ──────────────────────────────────────────

const runClassificationLoop = (
  lines: string[],
  state: LineClassifierState,
  hintQueues: ReturnType<typeof buildStructuredHintQueues>,
  schemaSeedQueues: ReturnType<typeof buildSchemaSeedQueues>,
  counters: SchemaSeedCounters
): { chunkStartIdx: number; linesInChunk: number } => {
  const { classified, memoryManager } = state;
  let activeSourceHintType: ElementType | undefined;
  let activeSchemaSeedType: ElementType | undefined;
  let chunkStartIdx = 0;
  let linesInChunk = 0;

  for (let _lineIdx = 0; _lineIdx < lines.length; _lineIdx++) {
    const rawLine = lines[_lineIdx];
    if (rawLine === undefined) continue;
    const trimmed = parseBulletLine(rawLine);
    if (!trimmed) continue;

    activeSourceHintType = consumeSourceHintTypeForLine(trimmed, hintQueues);
    activeSchemaSeedType = consumeSchemaSeedTypeForLine(
      trimmed,
      schemaSeedQueues
    );

    // Update push closure to include current hint types
    const currentHintType = activeSourceHintType ?? activeSchemaSeedType;
    const boundPush = (entry: ClassifiedDraft): void => {
      const withId: ClassifiedDraftWithId = {
        ...entry,
        _itemId: generateItemId(),
        ...(currentHintType !== undefined && {
          sourceHintType: currentHintType,
        }),
      };
      classified.push(withId);
      memoryManager.record(entry);
    };

    const normalizedForClassification = convertHindiToArabic(trimmed);
    const hasDetectedDialect =
      detectDialect(normalizedForClassification) !== null;

    if (tryMergePreviousLine(trimmed, state)) continue;

    const context = buildContext(classified.map((item) => item.type));

    if (tryClassifyBasmala(normalizedForClassification, trimmed, boundPush))
      continue;
    if (tryClassifyCompleteSceneHeader(normalizedForClassification, boundPush))
      continue;
    if (tryClassifyTransition(normalizedForClassification, trimmed, boundPush))
      continue;
    if (
      tryClassifySceneHeader3(
        normalizedForClassification,
        trimmed,
        context,
        boundPush
      )
    )
      continue;
    if (tryClassifyInlineCharacterDialogue(trimmed, boundPush)) continue;
    if (
      tryClassifyParenthetical(
        normalizedForClassification,
        trimmed,
        context,
        boundPush
      )
    )
      continue;
    if (tryClassifyDialogueContinuation(rawLine, trimmed, context, boundPush))
      continue;

    const snapshot = memoryManager.getSnapshot();

    if (
      tryClassifyImplicitCharacterDialogue(
        trimmed,
        context,
        snapshot,
        boundPush
      )
    )
      continue;
    if (
      tryClassifyCharacter(
        normalizedForClassification,
        trimmed,
        context,
        snapshot,
        boundPush
      )
    )
      continue;
    if (
      tryClassifyDialogue({
        normalized: normalizedForClassification,
        trimmed,
        context,
        snapshot,
        detectedDialect: hasDetectedDialect,
        push: boundPush,
      })
    )
      continue;

    classifyWithHybridFallback({
      normalizedForClassification,
      trimmed,
      lineIdx: _lineIdx,
      context,
      state: { ...state, push: boundPush },
      activeSchemaSeedType,
      counters,
    });

    if (PIPELINE_FLAGS.SELF_REFLECTION_ENABLED) {
      linesInChunk++;
      const lastType = classified[classified.length - 1]?.type;
      if (
        lastType &&
        shouldReflect(linesInChunk, lastType, SELF_REFLECTION_CHUNK_SIZE)
      ) {
        reflectOnChunk(
          classified,
          chunkStartIdx,
          classified.length,
          memoryManager,
          state.dcg
        );
        chunkStartIdx = classified.length;
        linesInChunk = 0;
      }
    }
  }

  return { chunkStartIdx, linesInChunk };
};

/**
 * تصنيف النصوص المُلصقة محلياً مع توليد معرف فريد (_itemId) لكل عنصر.
 * المعرّف يُستخدم لاحقاً في تتبع الأوامر من الوكيل.
 */
export const classifyLines = (
  text: string,
  context?: ClassifyLinesContext
): ClassifiedDraftWithId[] => {
  const normalizedText = normalizeRawInputText(text);

  logNormalizeDiag(text, normalizedText);

  const { sanitizedText, removedLines } =
    sanitizeOcrArtifactsForClassification(normalizedText);
  if (removedLines > 0) {
    agentReviewLogger.telemetry("artifact-lines-stripped", {
      layer: "frontend-classifier",
      artifactLinesRemoved: removedLines,
    });
  }
  const lines = sanitizedText.split(/\r?\n/);

  logClassifyLinesInput(normalizedText, lines, removedLines, context);

  const classified: ClassifiedDraftWithId[] = [];
  const memoryManager = new ContextMemoryManager();
  memoryManager.seedFromInlinePatterns(lines);
  memoryManager.seedFromStandalonePatterns(lines);
  const hybridClassifier = new HybridClassifier();

  const dcg: DocumentContextGraph | undefined = PIPELINE_FLAGS.DCG_ENABLED
    ? buildDocumentContextGraph(lines)
    : undefined;

  const sourceProfile = toSourceProfile(context?.classificationProfile);
  const hintQueues = buildStructuredHintQueues(context?.structuredHints);
  const schemaSeedQueues = buildSchemaSeedQueues(context?.schemaElements);
  const counters: SchemaSeedCounters = { adopted: 0, overridden: 0 };

  const push = (entry: ClassifiedDraft): void => {
    const withId: ClassifiedDraftWithId = {
      ...entry,
      _itemId: generateItemId(),
      ...(sourceProfile !== undefined && { sourceProfile }),
    };
    classified.push(withId);
    memoryManager.record(entry);
  };

  const state: LineClassifierState = {
    classified,
    memoryManager,
    hybridClassifier,
    dcg,
    push,
  };

  traceCollector.clear();

  const { chunkStartIdx, linesInChunk } = runClassificationLoop(
    lines,
    state,
    hintQueues,
    schemaSeedQueues,
    counters
  );

  const matchedSchemaVotes = recordSchemaSeedVotes(
    classified,
    context?.schemaElements
  );
  if (matchedSchemaVotes > 0) {
    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("schema-style-classify", classified, {
      source: "external-engine-seed",
      matchedVotes: matchedSchemaVotes,
    });
  }

  if (PIPELINE_FLAGS.SELF_REFLECTION_ENABLED && linesInChunk >= 3) {
    reflectOnChunk(
      classified,
      chunkStartIdx,
      classified.length,
      memoryManager,
      dcg
    );
  }

  const _seqOptResult = applyClassifyLinesPostPasses({
    classified,
    memoryManager,
    dcg,
    context,
  });

  logClassifyLinesOutput({
    normalizedText,
    lines,
    classified,
    seqOptResult: _seqOptResult,
    schemaSeedAdopted: counters.adopted,
    schemaSeedOverridden: counters.overridden,
    ...(context !== undefined ? { context } : {}),
  });

  return classified;
};

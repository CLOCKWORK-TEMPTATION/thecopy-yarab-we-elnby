import { Extension } from "@tiptap/core";
import { Fragment, Node as PmNode, Schema, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { isActionLine } from "./action";
import {
  DATE_PATTERNS,
  TIME_PATTERNS,
  convertHindiToArabic,
  detectDialect,
} from "./arabic-patterns";
import { isStandaloneBasmalaLine } from "./basmala";
import {
  ensureCharacterTrailingColon,
  isCharacterLine,
  parseImplicitCharacterDialogueWithoutColon,
  parseInlineCharacterDialogue,
} from "./character";
import { resolveNarrativeDecision } from "./classification-decision";
import type {
  ClassifiedDraft,
  ClassificationContext,
  ElementType,
} from "./classification-types";
import { ContextMemoryManager } from "./context-memory-manager";
import {
  getDialogueProbability,
  isDialogueContinuationLine,
  isDialogueLine,
} from "./dialogue";
import {
  buildDocumentContextGraph,
  type DocumentContextGraph,
} from "./document-context-graph";
import { HybridClassifier } from "./hybrid-classifier";
import { retroactiveCorrectionPass } from "./retroactive-corrector";
import {
  reverseClassificationPass,
  mergeForwardReverse,
} from "./reverse-classification-pass";
import {
  shouldReflect,
  reflectOnChunk,
  SELF_REFLECTION_CHUNK_SIZE,
} from "./self-reflection-pass";
import type { SequenceOptimizationResult } from "./structural-sequence-optimizer";
import {
  optimizeSequence,
  applyViterbiOverrides,
} from "./structural-sequence-optimizer";
import {
  mergeBrokenCharacterName,
  parseBulletLine,
  shouldMergeWrappedLines,
} from "./line-repair";
import { isParentheticalLine } from "./parenthetical";
import { isSceneHeader3Line } from "./scene-header-3";
import {
  isCompleteSceneHeaderLine,
  splitSceneHeaderLine,
} from "./scene-header-top-line";
import { isTransitionLine } from "./transition";
import { progressiveUpdater } from "./ai-progressive-updater";
import { pipelineRecorder } from "./pipeline-recorder";
import {
  isModelReviewSuspicionBand,
  shouldKeepSuspicionModelDecisionForFinalReview,
  summarizeSuspicionReviewDispatchBands,
  type SuspicionReviewDispatchSummary,
} from "./suspicion-review-routing";
import {
  agentReviewLogger,
  sanitizeOcrArtifactsForClassification,
  FINAL_REVIEW_ENDPOINT,
  FINAL_REVIEW_MAX_RATIO,
  FINAL_REVIEW_PROMOTION_THRESHOLD,
  DEFAULT_FINAL_REVIEW_SCHEMA_HINTS,
  REVIEWABLE_AGENT_TYPES,
  SUSPICION_REVIEW_ENDPOINT,
  PASTE_CLASSIFIER_ERROR_EVENT,
} from "./paste-classifier-config";
export { PASTE_CLASSIFIER_ERROR_EVENT } from "./paste-classifier-config";
import {
  generateItemId,
  normalizeRawInputText,
  toSourceProfile,
  buildStructuredHintQueues,
  consumeSourceHintTypeForLine,
  type ClassifiedDraftWithId,
} from "./paste-classifier-helpers";
import { fetchUnifiedTextExtract } from "../utils/file-import";
import { traceCollector } from "@editor/suspicion-engine/trace/trace-collector";
import type {
  ImportSource,
  LineQuality,
  PassStage,
  SourceHints,
  SuspicionCase,
} from "@editor/suspicion-engine/types";
import { createDefaultSuspicionEngine } from "@editor/suspicion-engine/engine";
import {
  collectTracesFromMap,
  applyPreRenderActions,
  type LineRepairRecord,
} from "@editor/suspicion-engine/adapters/from-classifier";
import type {
  AgentCommand,
  ReviewRoutingStats as FinalReviewRoutingStats,
  FinalReviewRequestPayload,
  FinalReviewResponsePayload,
  FinalReviewSuspiciousLinePayload,
} from "@editor/types/final-review";
import type {
  SuspicionReviewContextLine,
  SuspicionReviewDiscoveredLine,
  SuspicionReviewLinePayload,
  SuspicionReviewRequestPayload,
  SuspicionReviewResponsePayload,
  SuspicionReviewReviewedLine,
} from "@editor/types/suspicion-review";
import {
  buildContextLines,
  buildFinalReviewSuspiciousLinePayload,
  formatFinalReviewPacketText,
} from "@editor/final-review/payload-builder";
import type { LineType } from "@editor/types/screenplay";

// ── Re-entry guard + text dedup ──────────────────────────────────────────────
let pipelineRunning = false;
let lastProcessedHash = "";
let lastProcessedAt = 0;
const DEDUP_WINDOW_MS = 2_000;

const simpleHash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
};

const PREVIEW_LINE_TYPE: ElementType = "action";

const ARABIC_RANGE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const WEIRD_CHARS =
  /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0020-\u007E\u00A0-\u00FF\s\d.,;:!?()[\]{}"'`\-_/\\@#$%^&*+=<>|~]/g;

const normalizePreviewText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const normalizeComparableText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const computeDocumentSignature = (view: EditorView): string =>
  simpleHash(
    `${view.state.doc.childCount}:${view.state.doc.textBetween(
      0,
      view.state.doc.content.size,
      "\n",
      "\n"
    )}`
  );

const computeLineQuality = (text: string): LineQuality => {
  const readableChars = text.replace(/\s/g, "");
  const totalReadable = readableChars.length;
  if (totalReadable === 0) {
    return {
      score: 0,
      arabicRatio: 0,
      weirdCharRatio: 0,
      hasStructuralMarkers: false,
    };
  }

  const arabicCount = (text.match(ARABIC_RANGE) ?? []).length;
  const weirdCount = (text.match(WEIRD_CHARS) ?? []).length;
  const arabicRatio = arabicCount / totalReadable;
  const weirdCharRatio = weirdCount / totalReadable;

  return {
    score: Math.max(
      0,
      Math.min(1, arabicRatio * 0.7 + (1 - weirdCharRatio) * 0.3)
    ),
    arabicRatio,
    weirdCharRatio,
    hasStructuralMarkers:
      /[:()-]/u.test(text) ||
      /(?:^|\s)(?:مشهد|قطع|داخلي|خارجي|ليل|نهار)(?:\s|$)/u.test(text),
  };
};

const toImportSource = (
  classificationProfile: string | undefined,
  sourceFileType: string | undefined
): ImportSource => {
  if (sourceFileType === "pdf") return "pdf";
  if (sourceFileType === "doc" || sourceFileType === "docx") return "docx";
  if (sourceFileType === "fountain") return "fountain";
  if (sourceFileType === "fdx") return "fdx";
  if (sourceFileType === "txt") return "txt";
  if (classificationProfile === "paste") return "paste";
  return "unknown";
};

const pickSuspicionPolicyProfile = (
  classificationProfile: string | undefined,
  sourceFileType: string | undefined
): "balanced-paste" | "strict-import" | "ocr-heavy" => {
  if (sourceFileType === "pdf") return "ocr-heavy";
  if (
    sourceFileType === "doc" ||
    sourceFileType === "docx" ||
    classificationProfile === "generic-open"
  ) {
    return "strict-import";
  }
  return "balanced-paste";
};

const buildSourceHintsMap = (
  classified: readonly ClassifiedDraftWithId[],
  context: ClassifyLinesContext | undefined
): ReadonlyMap<number, SourceHints> => {
  const importSource = toImportSource(
    context?.classificationProfile,
    context?.sourceFileType
  );
  const result = new Map<number, SourceHints>();

  for (let index = 0; index < classified.length; index += 1) {
    const item = classified[index];
    if (!item) continue;
    result.set(index, {
      importSource,
      lineQuality: computeLineQuality(item.text),
      pageNumber: null,
    });
  }

  return result;
};

const normalizeSeedLookupText = (value: string): string => {
  const bulletNormalized = parseBulletLine(value) ?? value;
  return convertHindiToArabic(bulletNormalized).replace(/\s+/g, " ").trim();
};

const buildSchemaSeedQueues = (
  schemaElements: readonly SchemaElementInput[] | undefined
): Map<string, ElementType[]> => {
  const queues = new Map<string, ElementType[]>();
  if (!schemaElements || schemaElements.length === 0) return queues;

  for (const element of schemaElements) {
    const mappedType = ENGINE_ELEMENT_MAP.get(element.element.trim());
    if (!mappedType) continue;
    const normalizedText = normalizeSeedLookupText(element.value);
    if (!normalizedText) continue;
    const queue = queues.get(normalizedText);
    if (queue) {
      queue.push(mappedType);
    } else {
      queues.set(normalizedText, [mappedType]);
    }
  }

  return queues;
};

const consumeSchemaSeedTypeForLine = (
  lineText: string,
  seedQueues: Map<string, ElementType[]>
): ElementType | undefined => {
  const normalized = normalizeSeedLookupText(lineText);
  if (!normalized) return undefined;
  const queue = seedQueues.get(normalized);
  if (!queue || queue.length === 0) return undefined;
  const value = queue.shift();
  if (queue.length === 0) {
    seedQueues.delete(normalized);
  }
  return value;
};

const buildDraftForType = (
  type: ElementType,
  text: string,
  confidence: number,
  classificationMethod: ClassifiedDraft["classificationMethod"]
): ClassifiedDraft => ({
  type,
  text:
    type === "character"
      ? ensureCharacterTrailingColon(text)
      : type === "action"
        ? text.replace(/^[-–—]\s*/, "")
        : text,
  confidence,
  classificationMethod,
});

const normalizeClassifierConfidence = (confidence: number): number =>
  confidence > 1 ? confidence / 100 : confidence;

const shouldPreferSchemaSeedDecision = (params: {
  schemaType: ElementType | undefined;
  localType: ElementType;
  localConfidence: number;
  localMethod: ClassifiedDraft["classificationMethod"];
}): boolean => {
  const { schemaType, localType, localConfidence, localMethod } = params;
  if (!schemaType) return false;
  if (schemaType === localType) return true;

  const normalizedConfidence = normalizeClassifierConfidence(localConfidence);
  if (localMethod === "regex" && normalizedConfidence >= 0.92) return false;
  if (localMethod === "context" && normalizedConfidence >= 0.96) return false;

  return normalizedConfidence < 0.98;
};

const recordSchemaSeedVotes = (
  classified: readonly ClassifiedDraftWithId[],
  schemaElements: readonly SchemaElementInput[] | undefined
): number => {
  const queues = buildSchemaSeedQueues(schemaElements);
  let matched = 0;

  for (let index = 0; index < classified.length; index += 1) {
    const item = classified[index];
    if (!item) continue;
    const seedType = consumeSchemaSeedTypeForLine(item.text, queues);
    if (!seedType) continue;
    traceCollector.addVote(index, {
      stage: "schema-hint",
      suggestedType: seedType,
      confidence: 1,
      reasonCode: "external-engine",
      metadata: { source: "karank" },
    });
    matched += 1;
  }

  return matched;
};

const buildLiteralPreviewDrafts = (text: string): ClassifiedDraftWithId[] => {
  const lines = normalizePreviewText(text).split("\n");
  if (lines.length === 1 && lines[0] === "") return [];

  return lines.map((line) => ({
    _itemId: generateItemId(),
    type: PREVIEW_LINE_TYPE,
    text: line,
    confidence: 1,
    classificationMethod: "fallback",
  }));
};

const buildProgressiveNodeAttrs = (
  itemId: string
): {
  elementId: string;
  approvalState: "unapproved";
  approvedVersionId: null;
  approvedAt: null;
} => ({
  elementId: itemId,
  approvalState: "unapproved",
  approvedVersionId: null,
  approvedAt: null,
});

const renderClassifiedDraftsToView = (
  view: EditorView,
  classified: readonly ClassifiedDraftWithId[],
  range: { from: number; to: number },
  metaStage: string
): {
  from: number;
  to: number;
  documentSignature: string;
  nodesRendered: number;
} | null => {
  const nodes = classifiedToNodes(classified, view.state.schema);
  if (nodes.length === 0) return null;

  const currentDocSize = view.state.doc.content.size;
  const safeFrom = Math.max(0, Math.min(range.from, currentDocSize));
  const safeTo = Math.max(safeFrom, Math.min(range.to, currentDocSize));
  const fragment = Fragment.from(nodes);
  const slice = new Slice(fragment, 0, 0);
  const expectedTopLevelElementIds = new Set(
    nodes
      .map((node) =>
        typeof node.attrs?.["elementId"] === "string" &&
        node.attrs["elementId"].trim().length > 0
          ? node.attrs["elementId"]
          : null
      )
      .filter((value): value is string => Boolean(value))
  );
  const tr = view.state.tr.replaceRange(safeFrom, safeTo, slice);
  tr.setMeta("silent-pipeline-stage", { stage: metaStage });
  view.dispatch(tr);

  let resolvedFrom = safeFrom;
  let resolvedTo = safeFrom + fragment.size;
  if (expectedTopLevelElementIds.size > 0) {
    let firstMatch: number | null = null;
    let lastMatchEnd: number | null = null;

    view.state.doc.forEach((node, offset) => {
      const elementId =
        typeof node.attrs?.["elementId"] === "string" &&
        node.attrs["elementId"].trim().length > 0
          ? node.attrs["elementId"]
          : null;
      if (!elementId || !expectedTopLevelElementIds.has(elementId)) return;

      if (firstMatch === null) {
        firstMatch = offset;
      }
      lastMatchEnd = offset + node.nodeSize;
    });

    if (firstMatch !== null && lastMatchEnd !== null) {
      resolvedFrom = firstMatch;
      resolvedTo = Math.min(lastMatchEnd, view.state.doc.content.size);
    }
  }

  return {
    from: resolvedFrom,
    to: resolvedTo,
    documentSignature: computeDocumentSignature(view),
    nodesRendered: nodes.length,
  };
};

const toRepairRecords = (): LineRepairRecord[] => {
  const records: LineRepairRecord[] = [];
  for (const [lineIndex, repairs] of traceCollector.getAllRepairs()) {
    for (const repair of repairs) {
      records.push({ lineIndex, repair });
    }
  }
  return records;
};

/** Record current classified state as PassVotes for the given stage */
const recordStageVotes = (
  classified: readonly ClassifiedDraft[],
  stage: PassStage
): void => {
  for (let i = 0; i < classified.length; i++) {
    const line = classified[i]!;
    traceCollector.addVote(i, {
      stage,
      suggestedType: line.type,
      confidence: line.confidence,
      reasonCode: line.classificationMethod,
      metadata: {},
    });
  }
};

type ClassifiedDraftPipelineState = ClassifiedDraftWithId[] & {
  _sequenceOptimization?: SequenceOptimizationResult;
  _suspicionCases?: readonly SuspicionCase[];
  _finalReviewCandidates?: readonly FinalReviewSuspiciousLinePayload[];
};

// ─── Feature Flags (طبقات جديدة — للتجربة) ────────────────────
// غيّر لـ true عشان تفعّل كل طبقة
export const PIPELINE_FLAGS = {
  /** Document Context Graph + DCG bonus في الـ hybrid classifier */
  DCG_ENABLED: true,
  /** Self-Reflection أثناء الـ forward pass */
  SELF_REFLECTION_ENABLED: true,
  /** أنماط 6-9 الجديدة في الـ retroactive corrector */
  RETRO_NEW_PATTERNS_ENABLED: true,
  /** Reverse Classification Pass + دمج */
  REVERSE_PASS_ENABLED: true,
  /** Viterbi Override (تطبيق اقتراحات Viterbi القوية) */
  VITERBI_OVERRIDE_ENABLED: true,
  /** طبقة شك بالنموذج بعد الشك المحلي */
  SUSPICION_MODEL_ENABLED: true,
  /** Final review layer after suspicion routing */
  FINAL_REVIEW_ENABLED: true,
};

/**
 * خيارات مصنّف اللصق التلقائي.
 */
export interface PasteClassifierOptions {
  /** دالة مراجعة محلية مخصصة (اختياري) */
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[];
}

/**
 * خيارات تطبيق تدفق التصنيف على العرض.
 */
export interface ApplyPasteClassifierFlowOptions {
  /** دالة مراجعة محلية مخصصة (اختياري) */
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[];
  /** موضع البدء في العرض (اختياري) */
  from?: number;
  /** موضع النهاية في العرض (اختياري) */
  to?: number;
  /** بروفايل مصدر التصنيف (paste | generic-open) */
  classificationProfile?: string; // ClassificationSourceProfile in classification-types
  /** نوع الملف المصدر (اختياري) */
  sourceFileType?: string;
  /** طريقة الاستخراج (اختياري) */
  sourceMethod?: string;
  /** تلميحات بنيوية من المصدر (Filmlane، PDF، إلخ) */
  structuredHints?: readonly unknown[]; // ScreenplayBlock[]
  /** عناصر schema من المحرك المضمّن (اختياري) */
  schemaElements?: readonly SchemaElementInput[];
  /** النص الخام الأصلي المعروض أولاً في الملفات قبل التطوير الصامت */
  rawExtractedText?: string;
  /** اسم الملف عند الاستيراد */
  fileName?: string | null;
  /** مصدر أول نسخة ظاهرة في فتح الملفات */
  firstVisibleSourceKind?: "user-paste" | "direct-extraction" | "ocr";
}

export interface SchemaElementInput {
  readonly element: string;
  readonly value: string;
}

export interface ClassifyLinesContext {
  classificationProfile?: string;
  sourceFileType?: string;
  sourceMethod?: string;
  structuredHints?: readonly unknown[];
  schemaElements?: readonly SchemaElementInput[];
}

const buildContext = (
  previousTypes: readonly ElementType[]
): ClassificationContext => {
  const previousType =
    previousTypes.length > 0
      ? (previousTypes[previousTypes.length - 1] ?? null)
      : null;
  const isInDialogueBlock =
    previousType === "character" ||
    previousType === "dialogue" ||
    previousType === "parenthetical";

  return {
    previousTypes,
    previousType,
    isInDialogueBlock,
    isAfterSceneHeaderTopLine:
      previousType === "scene_header_top_line" ||
      previousType === "scene_header_2",
  };
};

const hasTemporalSceneSignal = (text: string): boolean =>
  DATE_PATTERNS.test(text) || TIME_PATTERNS.test(text);

/**
 * جدول ربط أسماء عناصر المحرك بأنواع عناصر السيناريو
 */
const ENGINE_ELEMENT_MAP: ReadonlyMap<string, ElementType> = new Map([
  ["scene_header_1", "scene_header_1"],
  ["scene_header_2", "scene_header_2"],
  ["scene_header_3", "scene_header_3"],
  ["ACTION", "action"],
  ["DIALOGUE", "dialogue"],
  ["CHARACTER", "character"],
  ["TRANSITION", "transition"],
  ["PARENTHETICAL", "parenthetical"],
  ["BASMALA", "basmala"],
]);

/**
 * تصنيف النصوص المُلصقة محلياً مع توليد معرف فريد (_itemId) لكل عنصر.
 * المعرّف يُستخدم لاحقاً في تتبع الأوامر من الوكيل.
 */
export const classifyLines = (
  text: string,
  context?: ClassifyLinesContext
): ClassifiedDraftWithId[] => {
  // ── توحيد النص: إزالة الحروف غير المرئية التي يضيفها Word clipboard ──
  const normalizedText = normalizeRawInputText(text);

  // ── diagnostic: بصمة النص المُدخل للمقارنة بين المسارات ──
  const _diagRawLen = normalizedText.length;
  const _diagRawLines = normalizedText.split(/\r?\n/).length;
  const _diagRawHash = Array.from(normalizedText).reduce(
    (h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0,
    0
  );
  const _diagFirst80 = normalizedText.slice(0, 80).replace(/\n/g, "↵");
  const _diagLast80 = normalizedText.slice(-80).replace(/\n/g, "↵");

  // ── diagnostic: تفصيل أنواع الحروف الخاصة في النص الأصلي ──
  const _diagCharBreakdown = {
    cr: (text.match(/\r/g) || []).length,
    nbsp: (text.match(/\u00A0/g) || []).length,
    zwnj: (text.match(/\u200C/g) || []).length,
    zwj: (text.match(/\u200D/g) || []).length,
    zwsp: (text.match(/\u200B/g) || []).length,
    lrm: (text.match(/\u200E/g) || []).length,
    rlm: (text.match(/\u200F/g) || []).length,
    bom: (text.match(/\uFEFF/g) || []).length,
    tab: (text.match(/\t/g) || []).length,
    softHyphen: (text.match(/\u00AD/g) || []).length,
    alm: (text.match(/\u061C/g) || []).length,
    fullwidthColon: (text.match(/\uFF1A/g) || []).length,
  };

  agentReviewLogger.info("diag:normalize-delta", {
    originalLength: text.length,
    normalizedLength: normalizedText.length,
    charsRemoved: text.length - normalizedText.length,
    charBreakdown: JSON.stringify(_diagCharBreakdown),
  });

  const { sanitizedText, removedLines } =
    sanitizeOcrArtifactsForClassification(normalizedText);
  if (removedLines > 0) {
    agentReviewLogger.telemetry("artifact-lines-stripped", {
      layer: "frontend-classifier",
      artifactLinesRemoved: removedLines,
    });
  }
  const lines = sanitizedText.split(/\r?\n/);

  agentReviewLogger.info("diag:classifyLines-input", {
    classificationProfile: context?.classificationProfile,
    sourceFileType: context?.sourceFileType,
    hasStructuredHints: !!(
      context?.structuredHints && context.structuredHints.length > 0
    ),
    rawTextLength: _diagRawLen,
    rawLineCount: _diagRawLines,
    rawTextHash: _diagRawHash,
    sanitizedLineCount: lines.length,
    sanitizedRemovedLines: removedLines,
    first80: _diagFirst80,
    last80: _diagLast80,
  });
  const classified: ClassifiedDraftWithId[] = [];

  const memoryManager = new ContextMemoryManager();
  // بذر الـ registry من inline patterns (regex-based) قبل الـ loop
  memoryManager.seedFromInlinePatterns(lines);
  // بذر الـ registry من standalone patterns (اسم: سطر + حوار سطر تالي)
  memoryManager.seedFromStandalonePatterns(lines);
  const hybridClassifier = new HybridClassifier();

  // ── بناء Document Context Graph (مسح أولي — O(n)) ──
  const dcg: DocumentContextGraph | undefined = PIPELINE_FLAGS.DCG_ENABLED
    ? buildDocumentContextGraph(lines)
    : undefined;

  // استخراج الخيارات من السياق
  const sourceProfile = toSourceProfile(context?.classificationProfile);
  const hintQueues = buildStructuredHintQueues(context?.structuredHints);
  const schemaSeedQueues = buildSchemaSeedQueues(context?.schemaElements);
  let activeSourceHintType: ElementType | undefined;
  let activeSchemaSeedType: ElementType | undefined;
  let schemaSeedAdopted = 0;
  let schemaSeedOverridden = 0;

  const push = (entry: ClassifiedDraft): void => {
    const hintType = activeSourceHintType ?? activeSchemaSeedType;
    const withId: ClassifiedDraftWithId = {
      ...entry,
      _itemId: generateItemId(),
      // إضافة بيانات المصدر إذا كانت متوفرة
      ...(sourceProfile !== undefined && { sourceProfile }),
      ...(hintType !== undefined && { sourceHintType: hintType }),
    };
    classified.push(withId);
    memoryManager.record(entry);
  };

  // ── Recorder: بداية run جديد + snapshot أولي ──
  traceCollector.clear();

  // ── Self-Reflection: عدّاد أسطر الـ chunk الحالي ──
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
    const normalizedForClassification = convertHindiToArabic(trimmed);
    const detectedDialect = detectDialect(normalizedForClassification);

    const previous = classified[classified.length - 1];
    if (previous) {
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
        continue;
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
        continue;
      }
    }

    const context = buildContext(classified.map((item) => item.type));

    if (isStandaloneBasmalaLine(normalizedForClassification)) {
      push({
        type: "basmala",
        text: trimmed,
        confidence: 99,
        classificationMethod: "regex",
      });
      continue;
    }

    if (isCompleteSceneHeaderLine(normalizedForClassification)) {
      const parts = splitSceneHeaderLine(normalizedForClassification);
      if (parts) {
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
        continue;
      }
    }

    if (isTransitionLine(normalizedForClassification)) {
      push({
        type: "transition",
        text: trimmed,
        confidence: 95,
        classificationMethod: "regex",
      });
      continue;
    }

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
      continue;
    }

    if (isSceneHeader3Line(normalizedForClassification, context)) {
      push({
        type: "scene_header_3",
        text: trimmed,
        confidence: 82,
        classificationMethod: "regex",
      });
      continue;
    }

    const inlineParsed = parseInlineCharacterDialogue(trimmed);
    if (inlineParsed) {
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
      continue;
    }

    if (
      isParentheticalLine(normalizedForClassification) &&
      context.isInDialogueBlock
    ) {
      push({
        type: "parenthetical",
        text: trimmed,
        confidence: 90,
        classificationMethod: "regex",
      });
      continue;
    }

    if (isDialogueContinuationLine(rawLine, context.previousType)) {
      push({
        type: "dialogue",
        text: trimmed,
        confidence: 82,
        classificationMethod: "context",
      });
      continue;
    }

    // أخذ snapshot قبل parseImplicit عشان نمرر confirmedCharacters
    const snapshot = memoryManager.getSnapshot();

    const implicit = parseImplicitCharacterDialogueWithoutColon(
      trimmed,
      context,
      snapshot.confirmedCharacters
    );
    if (implicit) {
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
      continue;
    }
    if (
      isCharacterLine(
        normalizedForClassification,
        context,
        snapshot.confirmedCharacters
      )
    ) {
      push({
        type: "character",
        text: ensureCharacterTrailingColon(trimmed),
        confidence: 88,
        classificationMethod: "regex",
      });
      continue;
    }

    const dialogueProbability = getDialogueProbability(
      normalizedForClassification,
      context
    );
    const dialogueThreshold = detectedDialect ? 5 : 6;
    if (
      isDialogueLine(normalizedForClassification, context, snapshot) ||
      dialogueProbability >= dialogueThreshold
    ) {
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
      continue;
    }

    const decision = resolveNarrativeDecision(
      normalizedForClassification,
      context,
      snapshot
    );
    const hybridResult = hybridClassifier.classifyLine(
      normalizedForClassification,
      decision.type,
      context,
      memoryManager.getSnapshot(),
      dcg?.lineContexts[_lineIdx]
    );

    if (
      shouldPreferSchemaSeedDecision({
        schemaType: activeSchemaSeedType,
        localType: hybridResult.type,
        localConfidence: hybridResult.confidence,
        localMethod: hybridResult.classificationMethod,
      })
    ) {
      schemaSeedAdopted += 1;
      push(
        buildDraftForType(
          activeSchemaSeedType as ElementType,
          trimmed,
          Math.max(0.9, hybridResult.confidence),
          "external-engine"
        )
      );
      continue;
    }
    if (activeSchemaSeedType && hybridResult.type !== activeSchemaSeedType) {
      schemaSeedOverridden += 1;
    }

    if (hybridResult.type === "scene_header_1") {
      const parts = splitSceneHeaderLine(normalizedForClassification);
      if (parts && parts.header2) {
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
        continue;
      }
    }

    if (hybridResult.type === "character") {
      push({
        type: "character",
        text: ensureCharacterTrailingColon(trimmed),
        confidence: Math.max(78, hybridResult.confidence),
        classificationMethod: hybridResult.classificationMethod,
      });
      continue;
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
      continue;
    }

    push({
      type: hybridResult.type,
      text: trimmed,
      confidence: Math.max(68, hybridResult.confidence),
      classificationMethod: hybridResult.classificationMethod,
    });

    // ── Self-Reflection: مراجعة ذاتية دورية أثناء الـ forward pass ──
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
          dcg
        );
        chunkStartIdx = classified.length;
        linesInChunk = 0;
      }
    }
  }

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

  // ── Self-Reflection: مراجعة الـ chunk الأخير المتبقي ──
  if (PIPELINE_FLAGS.SELF_REFLECTION_ENABLED && linesInChunk >= 3) {
    reflectOnChunk(
      classified,
      chunkStartIdx,
      classified.length,
      memoryManager,
      dcg
    );
  }

  // ── Recorder: snapshot بعد الـ forward pass ──
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("forward-pass", classified);
  recordStageVotes(classified, "forward");

  // ── ممر التصحيح الرجعي (retroactive correction pass) ──
  const _retroCorrections = retroactiveCorrectionPass(
    classified,
    memoryManager,
    PIPELINE_FLAGS.RETRO_NEW_PATTERNS_ENABLED
  );
  if (_retroCorrections > 0) {
    agentReviewLogger.info("diag:retroactive-corrections", {
      corrections: _retroCorrections,
      classifiedCount: classified.length,
    });
  }

  // ── Recorder: snapshot بعد الـ retroactive corrector ──
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("retroactive", classified, {
    corrections: _retroCorrections,
  });
  recordStageVotes(classified, "retroactive");

  // ── ممر التصنيف العكسي (Reverse Classification Pass) + دمج ──
  if (PIPELINE_FLAGS.REVERSE_PASS_ENABLED && dcg) {
    const reverseResult = reverseClassificationPass(classified, dcg);
    const _mergeCorrections = mergeForwardReverse(classified, reverseResult);
    if (_mergeCorrections > 0) {
      agentReviewLogger.info("diag:reverse-merge-corrections", {
        corrections: _mergeCorrections,
        classifiedCount: classified.length,
      });
    }
  }

  // ── Recorder: snapshot بعد الـ reverse pass ──
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("reverse-pass", classified);
  recordStageVotes(classified, "reverse");

  // ── ممر Viterbi للتحسين التسلسلي (Structural Sequence Optimizer) ──
  const preSeeded = memoryManager.getPreSeededCharacters();
  const _seqOptResult = optimizeSequence(classified, preSeeded);
  if (_seqOptResult.totalDisagreements > 0) {
    agentReviewLogger.info("diag:viterbi-disagreements", {
      total: _seqOptResult.totalDisagreements,
      rate: _seqOptResult.disagreementRate.toFixed(3),
      top: _seqOptResult.disagreements
        .slice(0, 5)
        .map(
          (d) =>
            `L${d.lineIndex}:${d.forwardType}→${d.viterbiType}(${d.disagreementStrength})`
        ),
    });
  }

  // ── Viterbi Feedback Loop: تطبيق الاقتراحات القوية ──
  if (PIPELINE_FLAGS.VITERBI_OVERRIDE_ENABLED) {
    const _viterbiOverrides = applyViterbiOverrides(classified, _seqOptResult);
    if (_viterbiOverrides > 0) {
      agentReviewLogger.info("diag:viterbi-overrides", {
        applied: _viterbiOverrides,
        classifiedCount: classified.length,
      });
    }
  }

  // ── Recorder: snapshot بعد Viterbi ──
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("viterbi", classified, {
    disagreements: _seqOptResult.totalDisagreements,
  });
  recordStageVotes(classified, "viterbi");

  // ── Suspicion Engine: تحليل الاشتباه والإصلاح المحلي ──
  const _suspicionTraces = collectTracesFromMap(
    classified,
    traceCollector.getAllVotes(),
    toRepairRecords(),
    buildSourceHintsMap(classified, context)
  );
  const _suspicionEngine = createDefaultSuspicionEngine(
    pickSuspicionPolicyProfile(
      context?.classificationProfile,
      context?.sourceFileType
    )
  );
  const _suspicionResult = _suspicionEngine.analyze({
    classifiedLines: classified,
    traces: _suspicionTraces,
    sequenceOptimization:
      _seqOptResult.totalDisagreements > 0
        ? {
            disagreements: _seqOptResult.disagreements.map((d) => ({
              lineIndex: d.lineIndex,
              suggestedType: d.viterbiType,
            })),
          }
        : null,
    extractionQuality: null,
  });
  const _suspicionFixes = applyPreRenderActions(
    classified,
    _suspicionResult.actions
  );
  pipelineRecorder.snapshot("suspicion-engine", classified, {
    cases: _suspicionResult.cases.length,
    fixes: _suspicionFixes,
  });
  agentReviewLogger.telemetry("paste-pipeline-stage", {
    stage: "suspicion-engine-complete",
    cases: _suspicionResult.cases.length,
    fixes: _suspicionFixes,
    actions: _suspicionResult.actions.length,
  });

  const pipelineState = classified as ClassifiedDraftPipelineState;
  pipelineState._sequenceOptimization = _seqOptResult;
  pipelineState._suspicionCases = _suspicionResult.cases;

  // ── diagnostic: ملخص نتائج التصنيف للمقارنة ──
  const _diagTypeDist: Record<string, number> = {};
  for (const item of classified) {
    _diagTypeDist[item.type] = (_diagTypeDist[item.type] ?? 0) + 1;
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
    typeDistribution: _diagTypeDist,
    viterbiDisagreements: _seqOptResult.totalDisagreements,
    schemaSeedAdopted,
    schemaSeedOverridden,
  });

  return classified;
};

// Final Review Layer (T012 + T015 + T023-T025 + T027)

const promoteHighSeveritySuspicionCases = (
  cases: readonly SuspicionCase[]
): SuspicionCase[] =>
  cases.map((caseItem) => {
    if (caseItem.band !== "agent-candidate") return caseItem;
    const hasHighPull = caseItem.signals.some(
      (signal) =>
        signal.signalType === "alternative-pull" &&
        signal.score >= FINAL_REVIEW_PROMOTION_THRESHOLD
    );
    if (!hasHighPull) return caseItem;
    return { ...caseItem, band: "agent-forced" } as SuspicionCase;
  });

const computeFinalReviewRoutingStats = (
  cases: readonly SuspicionCase[]
): FinalReviewRoutingStats => {
  let countPass = 0;
  let countLocalReview = 0;
  let countAgentCandidate = 0;
  let countAgentForced = 0;

  for (const caseItem of cases) {
    switch (caseItem.band) {
      case "pass":
        countPass += 1;
        break;
      case "local-review":
        countLocalReview += 1;
        break;
      case "agent-candidate":
        countAgentCandidate += 1;
        break;
      case "agent-forced":
        countAgentForced += 1;
        break;
    }
  }

  return { countPass, countLocalReview, countAgentCandidate, countAgentForced };
};

const buildSuspicionReviewContextLines = (
  targetIndex: number,
  classified: readonly ClassifiedDraftWithId[]
): SuspicionReviewContextLine[] => {
  const result: SuspicionReviewContextLine[] = [];

  for (let offset = -3; offset <= 3; offset += 1) {
    if (offset === 0) continue;
    const lineIndex = targetIndex + offset;
    if (lineIndex < 0 || lineIndex >= classified.length) continue;
    const line = classified[lineIndex];
    if (!line) continue;
    result.push({
      lineIndex,
      text: line.text,
      assignedType: line.type as LineType,
      confidence: line.confidence,
      offset,
    });
  }

  return result;
};

const buildLocalSuspicionReviewPayload = (params: {
  suspicionCase: SuspicionCase;
  classified: readonly ClassifiedDraftWithId[];
  itemId: string;
  sourceMethod?: string;
}): SuspicionReviewLinePayload | null => {
  const { suspicionCase, classified, itemId, sourceMethod } = params;
  const assignedType = suspicionCase.classifiedLine.type as LineType;

  const schemaVote = suspicionCase.trace.passVotes.find(
    (vote) => vote.stage === "schema-hint"
  );

  return {
    itemId,
    lineIndex: suspicionCase.lineIndex,
    text: suspicionCase.classifiedLine.text,
    assignedType,
    originalConfidence: suspicionCase.classifiedLine.confidence,
    suspicionScore: suspicionCase.score,
    routingBand:
      suspicionCase.band === "agent-forced"
        ? "agent-forced"
        : suspicionCase.band === "local-review"
          ? "local-review"
          : "agent-candidate",
    critical: suspicionCase.critical,
    primarySuggestedType:
      (suspicionCase.primarySuggestedType as LineType | null) ?? null,
    reasonCodes: suspicionCase.signals
      .map((signal) => signal.reasonCode)
      .slice(0, 32),
    signalMessages: suspicionCase.signals
      .map((signal) => signal.message)
      .slice(0, 32),
    contextLines: buildSuspicionReviewContextLines(
      suspicionCase.lineIndex,
      classified
    ),
    sourceHints: {
      importSource: suspicionCase.trace.sourceHints.importSource,
      ...(sourceMethod !== undefined && { sourceMethod }),
      engineSuggestedType:
        (schemaVote?.suggestedType as LineType | undefined) ?? null,
    },
  };
};

const buildDiscoveredFinalReviewPayload = (params: {
  discovered: SuspicionReviewDiscoveredLine;
  classified: readonly ClassifiedDraftWithId[];
  importSource: ImportSource;
}): FinalReviewSuspiciousLinePayload | null => {
  const { discovered, classified, importSource } = params;
  const target = classified[discovered.lineIndex];
  if (!target) return null;
  if (!REVIEWABLE_AGENT_TYPES.has(discovered.assignedType)) return null;

  const lineQuality = computeLineQuality(target.text);

  return {
    itemId: `model-discovered-${discovered.lineIndex}-${simpleHash(discovered.text)}`,
    lineIndex: discovered.lineIndex,
    text: discovered.text,
    assignedType: discovered.assignedType,
    fingerprint: `${discovered.lineIndex}:${simpleHash(discovered.text)}`,
    suspicionScore: discovered.suspicionScore,
    routingBand: discovered.routingBand,
    critical: discovered.routingBand === "agent-forced",
    primarySuggestedType: discovered.primarySuggestedType ?? null,
    distinctSignalFamilies: 1,
    signalCount: 1,
    reasonCodes: ["MODEL_CONTEXT_DISCOVERY"],
    signalMessages: [discovered.reason],
    sourceHints: {
      importSource,
      lineQualityScore: lineQuality.score,
      arabicRatio: lineQuality.arabicRatio,
      weirdCharRatio: lineQuality.weirdCharRatio,
      hasStructuralMarkers: lineQuality.hasStructuralMarkers,
      pageNumber: null,
    },
    evidence: {
      gateBreaks: [],
      alternativePulls: [],
      contextContradictions: [],
      rawCorruptionSignals: [],
      multiPassConflicts: [],
      sourceRisks: [],
    },
    trace: {
      passVotes: [],
      repairs: [],
      finalDecision: {
        assignedType: discovered.assignedType,
        confidence: target.confidence,
        method: "weighted",
      },
    },
    contextLines: buildContextLines(discovered.lineIndex, classified),
  };
};

const mergeSuspicionReason = (
  payload: FinalReviewSuspiciousLinePayload,
  review: SuspicionReviewReviewedLine
): FinalReviewSuspiciousLinePayload => ({
  ...payload,
  suspicionScore: Math.max(0, Math.min(100, review.adjustedScore)),
  routingBand:
    review.routingBand === "agent-forced" ? "agent-forced" : "agent-candidate",
  primarySuggestedType:
    review.primarySuggestedType === undefined
      ? payload.primarySuggestedType
      : review.primarySuggestedType,
  reasonCodes: [
    ...new Set([...payload.reasonCodes, "MODEL_CONTEXT_REVIEW"]),
  ].slice(0, 32),
  signalMessages: [
    ...new Set([...payload.signalMessages, review.reason]),
  ].slice(0, 32),
});

const mergeSuspicionReviewCandidates = (params: {
  localCandidates: readonly FinalReviewSuspiciousLinePayload[];
  response: SuspicionReviewResponsePayload;
  classified: readonly ClassifiedDraftWithId[];
  importSource: ImportSource;
}): FinalReviewSuspiciousLinePayload[] => {
  const { localCandidates, response, classified, importSource } = params;
  const merged = new Map(
    localCandidates.map((candidate) => [candidate.itemId, candidate])
  );

  for (const reviewed of response.reviewedLines) {
    const current = merged.get(reviewed.itemId);
    if (!current) continue;
    if (!shouldKeepSuspicionModelDecisionForFinalReview(reviewed)) {
      merged.delete(reviewed.itemId);
      continue;
    }
    merged.set(reviewed.itemId, mergeSuspicionReason(current, reviewed));
  }

  for (const discovered of response.discoveredLines) {
    const payload = buildDiscoveredFinalReviewPayload({
      discovered,
      classified,
      importSource,
    });
    if (!payload || merged.has(payload.itemId)) continue;
    merged.set(payload.itemId, payload);
  }

  return [...merged.values()].sort(
    (a, b) => a.lineIndex - b.lineIndex || b.suspicionScore - a.suspicionScore
  );
};

const shouldEscalatePayloadToFinalReview = (
  payload: FinalReviewSuspiciousLinePayload
): boolean => {
  if (payload.routingBand === "agent-forced") return true;
  if (payload.critical) return true;
  if (payload.suspicionScore >= 85) return true;
  if (payload.distinctSignalFamilies >= 2) return true;
  return Boolean(
    payload.primarySuggestedType &&
    payload.primarySuggestedType !== payload.assignedType
  );
};

const selectFinalReviewPayloads = (
  suspiciousLines: readonly FinalReviewSuspiciousLinePayload[],
  totalReviewed: number
): FinalReviewSuspiciousLinePayload[] => {
  const cap = Math.max(1, Math.ceil(totalReviewed * FINAL_REVIEW_MAX_RATIO));
  return [...suspiciousLines]
    .filter(shouldEscalatePayloadToFinalReview)
    .sort((a, b) => {
      if (a.routingBand === "agent-forced" && b.routingBand !== "agent-forced")
        return -1;
      if (b.routingBand === "agent-forced" && a.routingBand !== "agent-forced")
        return 1;
      return b.suspicionScore - a.suspicionScore;
    })
    .slice(0, cap);
};

const normalizeReviewCommandConfidence = (
  confidence: number | undefined,
  fallback: number
): number =>
  typeof confidence === "number" && Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, confidence))
    : fallback;

const applyFinalReviewCommand = (
  drafts: ClassifiedDraftWithId[],
  command: AgentCommand
): boolean => {
  const targetIndex = drafts.findIndex(
    (item) => item._itemId === command.itemId
  );
  if (targetIndex < 0) return false;

  const original = drafts[targetIndex];
  if (!original) return false;

  if (command.op === "relabel") {
    drafts[targetIndex] = {
      ...original,
      type: command.newType,
      confidence: normalizeReviewCommandConfidence(
        command.confidence,
        original.confidence
      ),
      classificationMethod: "ml",
    };
    return true;
  }
  return false;
};

const NON_FATAL_FINAL_REVIEW_STATUSES = new Set([
  "applied",
  "partial",
  "skipped",
]);

class ProgressivePipelineStageError extends Error {
  readonly stage: "suspicion-review" | "final-review";
  readonly code: string | null;

  constructor(
    stage: "suspicion-review" | "final-review",
    message: string,
    code?: string | null
  ) {
    super(message);
    this.name = "ProgressivePipelineStageError";
    this.stage = stage;
    this.code = code ?? null;
  }
}

export const applyFinalReviewLayer = async (
  classified: ClassifiedDraftWithId[],
  suspiciousLines: readonly FinalReviewSuspiciousLinePayload[],
  importOpId: string,
  sessionId: string
): Promise<ClassifiedDraftWithId[]> => {
  if (suspiciousLines.length === 0) {
    return classified;
  }
  if (!FINAL_REVIEW_ENDPOINT) {
    throw new ProgressivePipelineStageError(
      "final-review",
      "نقطة /api/final-review غير مضبوطة بينما المراجعة النهائية مطلوبة."
    );
  }

  const selected = selectFinalReviewPayloads(
    suspiciousLines,
    classified.length
  );
  if (selected.length === 0) {
    return classified;
  }

  const requiredItemIds = selected.map((line) => line.itemId);
  const forcedItemIds = selected
    .filter((line) => line.routingBand === "agent-forced")
    .map((line) => line.itemId);

  const requestPayload: FinalReviewRequestPayload = {
    packetVersion: "suspicion-final-review-v1",
    schemaVersion: "arabic-screenplay-classifier-output-v1",
    importOpId,
    sessionId,
    totalReviewed: classified.length,
    suspiciousLines: selected,
    requiredItemIds,
    forcedItemIds,
    schemaHints: DEFAULT_FINAL_REVIEW_SCHEMA_HINTS,
    reviewPacketText: formatFinalReviewPacketText({
      totalReviewed: classified.length,
      requiredItemIds,
      forcedItemIds,
      suspiciousLines,
    }),
  };

  try {
    const { default: axios } = await import("axios");
    const response = await axios.post<FinalReviewResponsePayload>(
      FINAL_REVIEW_ENDPOINT,
      requestPayload,
      { timeout: 180_000 }
    );

    const data = response.data;
    if (!NON_FATAL_FINAL_REVIEW_STATUSES.has(data.status)) {
      throw new ProgressivePipelineStageError(
        "final-review",
        data.message ||
          `المراجعة النهائية أعادت حالة غير مدعومة: ${data.status}`
      );
    }
    if (!data.commands || data.commands.length === 0) {
      return classified;
    }

    const result: ClassifiedDraftWithId[] = [...classified];
    let appliedCommandCount = 0;
    for (const command of data.commands) {
      if (applyFinalReviewCommand(result, command)) {
        appliedCommandCount += 1;
      }
    }

    if (appliedCommandCount === 0) {
      return classified;
    }

    return result;
  } catch (error) {
    throw new ProgressivePipelineStageError(
      "final-review",
      error instanceof Error ? error.message : "فشلت طبقة المراجعة النهائية."
    );
  }
};

const applySuspicionReviewLayer = async (params: {
  classified: ClassifiedDraftWithId[];
  suspicionCases: readonly SuspicionCase[];
  importOpId: string;
  sessionId: string;
  sourceMethod?: string;
}): Promise<{
  finalReviewCandidates: FinalReviewSuspiciousLinePayload[];
  reviewedCount: number;
  dismissedCount: number;
  heldLocalReviewCount: number;
  escalatedCount: number;
  discoveredCount: number;
  dispatchSummary: SuspicionReviewDispatchSummary;
}> => {
  const { classified, suspicionCases, importOpId, sessionId, sourceMethod } =
    params;

  const promoted = promoteHighSeveritySuspicionCases(suspicionCases);
  const eligibleDispatchSummary = summarizeSuspicionReviewDispatchBands(
    promoted.map((caseItem) => caseItem.band)
  );
  const localCandidates: FinalReviewSuspiciousLinePayload[] = [];
  const reviewLines: SuspicionReviewLinePayload[] = [];

  for (const caseItem of promoted) {
    if (!isModelReviewSuspicionBand(caseItem.band)) {
      continue;
    }

    const classifiedItem = classified[caseItem.lineIndex];
    const itemId = classifiedItem?._itemId ?? `item-${caseItem.lineIndex}`;
    const payload = buildFinalReviewSuspiciousLinePayload({
      suspicionCase: caseItem,
      classified,
      itemId,
      fingerprint: `${itemId}:${simpleHash(caseItem.classifiedLine.text)}`,
    });
    if (payload) {
      localCandidates.push(payload);
    }

    const reviewPayload = buildLocalSuspicionReviewPayload({
      suspicionCase: caseItem,
      classified,
      itemId,
      ...(sourceMethod !== undefined && { sourceMethod }),
    });
    if (reviewPayload) {
      reviewLines.push(reviewPayload);
    }
  }

  const preparedDispatchSummary = summarizeSuspicionReviewDispatchBands(
    reviewLines.map((line) => line.routingBand)
  );
  const skippedDispatchSummary: SuspicionReviewDispatchSummary = {
    ...preparedDispatchSummary,
    totalLocalCases: eligibleDispatchSummary.totalLocalCases,
    passSkipped: eligibleDispatchSummary.passSkipped,
    sentToModel: 0,
    sentLocalReview: 0,
    sentAgentCandidate: 0,
    sentAgentForced: 0,
  };

  if (
    !PIPELINE_FLAGS.SUSPICION_MODEL_ENABLED ||
    !SUSPICION_REVIEW_ENDPOINT ||
    reviewLines.length === 0
  ) {
    return {
      finalReviewCandidates: [],
      reviewedCount: 0,
      dismissedCount: 0,
      heldLocalReviewCount: 0,
      escalatedCount: 0,
      discoveredCount: 0,
      dispatchSummary: skippedDispatchSummary,
    };
  }

  const requestPayload: SuspicionReviewRequestPayload = {
    apiVersion: "1.0",
    importOpId,
    sessionId,
    totalReviewed: classified.length,
    reviewLines,
  };

  try {
    const { default: axios } = await import("axios");
    const response = await axios.post<SuspicionReviewResponsePayload>(
      SUSPICION_REVIEW_ENDPOINT,
      requestPayload,
      { timeout: 180_000 }
    );
    const data = response.data;
    if (data.status === "error") {
      throw new Error(data.message || "فشلت طبقة الشك بالنموذج.");
    }

    const mergedCandidates = mergeSuspicionReviewCandidates({
      localCandidates,
      response: data,
      classified,
      importSource: reviewLines[0]?.sourceHints.importSource ?? "unknown",
    });

    return {
      finalReviewCandidates: mergedCandidates,
      reviewedCount: data.reviewedLines.length,
      dismissedCount: data.reviewedLines.filter(
        (item) => item.verdict === "dismiss"
      ).length,
      heldLocalReviewCount: data.reviewedLines.filter(
        (item) => item.routingBand === "local-review"
      ).length,
      escalatedCount: data.reviewedLines.filter(
        (item) => item.verdict === "escalate"
      ).length,
      discoveredCount: data.discoveredLines.length,
      dispatchSummary: {
        ...preparedDispatchSummary,
        totalLocalCases: eligibleDispatchSummary.totalLocalCases,
        passSkipped: eligibleDispatchSummary.passSkipped,
      },
    };
  } catch (error) {
    agentReviewLogger.error("suspicion-model-layer-failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ProgressivePipelineStageError(
      "suspicion-review",
      error instanceof Error ? error.message : "فشلت طبقة الشك بالنموذج."
    );
  }
};
const applyAgentReview = (
  classified: ClassifiedDraftWithId[],
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[]
): ClassifiedDraftWithId[] => {
  if (!agentReview) return classified;

  try {
    const reviewed = agentReview(classified);
    return reviewed.length > 0 ? reviewed : classified;
  } catch (error) {
    agentReviewLogger.error("local-review-failed", { error });
    return classified;
  }
};

/**
 * إنشاء عقدة ProseMirror من عنصر مصنّف.
 */
const createNodeForType = (
  item: ClassifiedDraftWithId,
  schema: Schema
): PmNode | null => {
  const { type, text, header1, header2 } = item;
  const itemId = item._itemId ?? "";
  const attrs = buildProgressiveNodeAttrs(itemId);

  const getNode = (name: string) => schema.nodes[name];

  switch (type) {
    case "scene_header_top_line": {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) return null;
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`),
        header1 ? schema.text(header1) : undefined
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header2`),
        header2 ? schema.text(header2) : undefined
      );
      return topType.create(attrs, [h1Node, h2Node]);
    }

    case "scene_header_1": {
      const nodeType = getNode("scene_header_1");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "scene_header_2": {
      const nodeType = getNode("scene_header_2");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "basmala": {
      const nodeType = getNode("basmala");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "scene_header_3": {
      const nodeType = getNode("scene_header_3");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "action": {
      const nodeType = getNode("action");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "character": {
      const nodeType = getNode("character");
      if (!nodeType) return null;
      return nodeType.create(
        attrs,
        text ? schema.text(ensureCharacterTrailingColon(text)) : undefined
      );
    }

    case "dialogue": {
      const nodeType = getNode("dialogue");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "parenthetical": {
      const nodeType = getNode("parenthetical");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    case "transition": {
      const nodeType = getNode("transition");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }

    default: {
      const nodeType = getNode("action");
      if (!nodeType) return null;
      return nodeType.create(attrs, text ? schema.text(text) : undefined);
    }
  }
};

/**
 * تحويل عناصر مصنّفة إلى عقد ProseMirror.
 */
const classifiedToNodes = (
  classified: readonly ClassifiedDraftWithId[],
  schema: Schema
): PmNode[] => {
  const nodes: PmNode[] = [];
  const getNode = (name: string) => schema.nodes[name];

  for (let i = 0; i < classified.length; i++) {
    const item = classified[i];
    if (!item) continue;
    const next = classified[i + 1];
    const itemId = item._itemId ?? "";

    // look-ahead: scene_header_1 + scene_header_2 → scene_header_top_line display node
    if (item.type === "scene_header_1" && next?.type === "scene_header_2") {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) continue;
      const nextId = next._itemId ?? "";
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`),
        item.text ? schema.text(item.text) : undefined
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${nextId}:header2`),
        next.text ? schema.text(next.text) : undefined
      );
      nodes.push(
        topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node])
      );
      i++; // skip next (header_2 consumed)
      continue;
    }

    // scene_header_1 alone → wrap in top_line with empty header_2
    if (item.type === "scene_header_1") {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) continue;
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`),
        item.text ? schema.text(item.text) : undefined
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header2`)
      );
      nodes.push(
        topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node])
      );
      continue;
    }

    // scene_header_2 alone (orphan) → wrap in top_line with empty header_1
    if (item.type === "scene_header_2") {
      const h1Type = getNode("scene_header_1");
      const h2Type = getNode("scene_header_2");
      const topType = getNode("scene_header_top_line");
      if (!h1Type || !h2Type || !topType) continue;
      const h1Node = h1Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header1`)
      );
      const h2Node = h2Type.create(
        buildProgressiveNodeAttrs(`${itemId}:header2`),
        item.text ? schema.text(item.text) : undefined
      );
      nodes.push(
        topType.create(buildProgressiveNodeAttrs(itemId), [h1Node, h2Node])
      );
      continue;
    }

    const node = createNodeForType(item, schema);
    if (node) nodes.push(node);
  }

  return nodes;
};

/**
 * تصنيف النص محلياً فقط (بدون مراجعة الوكيل).
 */
export const classifyText = (
  text: string,
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[],
  options?: ClassifyLinesContext
): ClassifiedDraftWithId[] => {
  const initiallyClassified = classifyLines(text, options);
  return applyAgentReview(initiallyClassified, agentReview);
};

/**
 * تطبيق تصنيف اللصق على العرض بنمط Render-First.
 *
 * 1) تصنيف محلي + تطبيق إصلاحات الاشتباه قبل العرض
 * 2) عرض فوري
 * 3) مراجعة نهائية في الخلفية
 *
 * المستخدم يشوف المحتوى فوراً (الخطوة 1)،
 * ثم تطبق طبقة المراجعة النهائية تصحيحاتها تدريجياً.
 */
export const applyPasteClassifierFlowToView = async (
  view: EditorView,
  text: string,
  options?: ApplyPasteClassifierFlowOptions
): Promise<boolean> => {
  if (pipelineRunning) {
    agentReviewLogger.warn("pipeline-reentry-blocked", {});
    return false;
  }

  const textHash = simpleHash(text);
  if (
    textHash === lastProcessedHash &&
    performance.now() - lastProcessedAt < DEDUP_WINDOW_MS
  ) {
    agentReviewLogger.telemetry("pipeline-dedup-skip", { hash: textHash });
    return false;
  }

  pipelineRunning = true;
  try {
    const customReview = options?.agentReview;
    let classificationProfile = options?.classificationProfile;
    let sourceFileType = options?.sourceFileType;
    let sourceMethod = options?.sourceMethod;
    const structuredHints = options?.structuredHints;
    let schemaElements = options?.schemaElements;
    let classificationText = text;
    const previewText =
      typeof options?.rawExtractedText === "string" &&
      options.rawExtractedText.trim().length > 0
        ? options.rawExtractedText
        : text;
    const from = options?.from ?? view.state.selection.from;
    const to = options?.to ?? view.state.selection.to;

    pipelineRecorder.startRun(
      classificationProfile ?? "paste",
      {
        textLength: previewText.length,
        lineCount: normalizePreviewText(previewText).split("\n").length,
      },
      {
        ...(classificationProfile === "paste"
          ? { sourceType: "paste" }
          : sourceFileType === "doc" ||
              sourceFileType === "docx" ||
              sourceFileType === "pdf"
            ? { sourceType: sourceFileType }
            : {}),
        intakeKind: classificationProfile === "paste" ? "paste" : "file-open",
        fileName: options?.fileName ?? null,
      }
    );

    const finishRunWithFailure = (
      stage: string,
      message: string,
      code: string
    ): void => {
      pipelineRecorder.logRunFailure(stage, message, code);
      pipelineRecorder.finishRun();
    };

    let activeRange = { from, to };
    let previewDocumentSignature: string | null = null;
    const previewDrafts = buildLiteralPreviewDrafts(previewText);
    if (previewDrafts.length > 0) {
      const previewRender = renderClassifiedDraftsToView(
        view,
        previewDrafts,
        activeRange,
        "preview-literal"
      );
      if (!previewRender) {
        finishRunWithFailure(
          "local-classification",
          "تعذر عرض المعاينة الأولية داخل المحرر.",
          "PREVIEW_RENDER_FAILED"
        );
        return false;
      }
      activeRange = { from: previewRender.from, to: previewRender.to };
      previewDocumentSignature = previewRender.documentSignature;
      pipelineRecorder.trackFile("paste-classifier.ts");
      pipelineRecorder.snapshot("preview-literal", previewDrafts, {
        nodesRendered: previewRender.nodesRendered,
        visibleStage:
          classificationProfile === "paste" ? "user-paste" : "extracted",
        firstVisibleSourceKind:
          classificationProfile === "paste"
            ? "user-paste"
            : (options?.firstVisibleSourceKind ??
              (sourceFileType === "pdf" ? "ocr" : "direct-extraction")),
      });
    }

    const bridgeStart = performance.now();
    const shouldFetchKarankBridge =
      !schemaElements &&
      (classificationProfile === "paste" ||
        sourceFileType === "doc" ||
        sourceFileType === "docx" ||
        sourceFileType === "pdf");

    if (shouldFetchKarankBridge) {
      const bridgeSourceType =
        classificationProfile === "paste"
          ? "paste"
          : sourceFileType === "doc" ||
              sourceFileType === "docx" ||
              sourceFileType === "pdf"
            ? sourceFileType
            : "paste";
      const unifiedResult = await fetchUnifiedTextExtract(
        text,
        bridgeSourceType
      );
      schemaElements = unifiedResult.schemaElements;
      classificationText =
        unifiedResult.rawText.trim().length > 0 ? unifiedResult.rawText : text;
      sourceMethod = sourceMethod ?? "karank-engine-bridge";

      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "engine-text-extract-success",
        sourceType: bridgeSourceType,
        elementCount: schemaElements.length,
      });
      pipelineRecorder.logBridgeCall(
        bridgeSourceType,
        schemaElements.length,
        Math.round(performance.now() - bridgeStart)
      );
    }

    if (
      schemaElements &&
      schemaElements.length > 0 &&
      classificationProfile !== "paste"
    ) {
      pipelineRecorder.logBridgeCall(
        classificationProfile ?? "file-import",
        schemaElements.length,
        Math.round(performance.now() - bridgeStart)
      );
    }

    const normalizedKarankText = normalizeComparableText(classificationText);
    const normalizedPreviewText = normalizeComparableText(previewText);
    const shouldRenderKarankVisible =
      normalizedKarankText.length > 0 &&
      normalizedKarankText !== normalizedPreviewText;

    if (shouldRenderKarankVisible) {
      const karankPreviewDrafts = buildLiteralPreviewDrafts(classificationText);
      const karankRender = renderClassifiedDraftsToView(
        view,
        karankPreviewDrafts,
        activeRange,
        "karank-visible"
      );
      if (!karankRender) {
        finishRunWithFailure(
          "karank",
          "تعذر عرض نسخة محرك التصنيف الوسيط داخل المحرر.",
          "KARANK_RENDER_FAILED"
        );
        return previewDrafts.length > 0;
      }

      activeRange = { from: karankRender.from, to: karankRender.to };
      previewDocumentSignature = karankRender.documentSignature;

      pipelineRecorder.trackFile("paste-classifier.ts");
      pipelineRecorder.snapshot("karank-visible", karankPreviewDrafts, {
        nodesRendered: karankRender.nodesRendered,
        visibleStage: "karank",
      });
    }

    const initiallyClassified = classifyLines(classificationText, {
      ...(classificationProfile !== undefined && { classificationProfile }),
      ...(sourceFileType !== undefined && { sourceFileType }),
      ...(sourceMethod !== undefined && { sourceMethod }),
      ...(structuredHints !== undefined && { structuredHints }),
      ...(schemaElements !== undefined && { schemaElements }),
    });
    const locallyReviewed = applyAgentReview(initiallyClassified, customReview);

    if (locallyReviewed.length === 0 || view.isDestroyed) {
      finishRunWithFailure(
        "local-classification",
        view.isDestroyed
          ? "توقف مسار التصنيف لأن المحرر لم يعد نشطاً."
          : "لم ينتج مسار التصنيف أي عناصر قابلة للعرض.",
        view.isDestroyed ? "EDITOR_VIEW_DESTROYED" : "EMPTY_CLASSIFICATION"
      );
      return false;
    }

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "frontend-classify-complete",
      totalLines: locallyReviewed.length,
      sourceFileType,
      sourceMethod,
    });

    if (
      previewDocumentSignature &&
      computeDocumentSignature(view) !== previewDocumentSignature
    ) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "render-first-skipped",
        reason: "document-changed-after-preview",
      });
      lastProcessedHash = textHash;
      lastProcessedAt = performance.now();
      pipelineRecorder.finishRun();
      return true;
    }

    const renderResult = renderClassifiedDraftsToView(
      view,
      locallyReviewed,
      activeRange,
      "render-first"
    );
    if (!renderResult) {
      finishRunWithFailure(
        "local-classification",
        "تعذر عرض النسخة المصنفة داخل المحرر.",
        "CLASSIFIED_RENDER_FAILED"
      );
      return previewDrafts.length > 0;
    }

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "frontend-render-first",
      nodesApplied: renderResult.nodesRendered,
    });

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("render-first", locallyReviewed, {
      nodesRendered: renderResult.nodesRendered,
      visibleStage: "local-classified",
    });

    const importOpId = generateItemId();
    void runFinalReviewPipeline(
      view,
      locallyReviewed,
      importOpId,
      sourceMethod
    ).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      agentReviewLogger.error("final-review-pipeline-error", {
        error: message,
      });
    });

    lastProcessedHash = textHash;
    lastProcessedAt = performance.now();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    agentReviewLogger.error("paste-pipeline-silent-fallback", {
      error: message,
    });
    pipelineRecorder.logRunFailure("local-classification", message);
    lastProcessedHash = textHash;
    lastProcessedAt = performance.now();
    pipelineRecorder.finishRun();
    return true;
  } finally {
    pipelineRunning = false;
  }
};

/**
 * تطبيق طبقة المراجعة النهائية بعد العرض الفوري.
 */
const runFinalReviewPipeline = async (
  view: EditorView,
  locallyReviewed: ClassifiedDraftWithId[],
  importOpId: string,
  sourceMethod?: string
): Promise<void> => {
  if (view.isDestroyed) return;

  const sessionId = `silent-review-${Date.now()}`;
  const updateSession = progressiveUpdater.createSession(sessionId, {
    minConfidenceThreshold: 0.65,
    allowLayerOverride: true,
    layerPriority: ["final-review", "suspicion-model", "gemini-context"],
  });
  const suspicionCases =
    (locallyReviewed as ClassifiedDraftPipelineState)._suspicionCases ?? [];
  const routingStats = computeFinalReviewRoutingStats(
    promoteHighSeveritySuspicionCases(suspicionCases)
  );
  const markSettled = (
    classified: readonly ClassifiedDraftWithId[],
    metadata?: Record<string, unknown>
  ): void => {
    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("settled", classified, {
      ...(metadata ?? {}),
      visibleStage: "settled",
    });
  };

  try {
    if (suspicionCases.length === 0) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "suspicion-review-summary",
        localSuspicionCases: 0,
        sentToSuspicionModel: 0,
        modelDismissed: 0,
        modelEscalated: 0,
        finalReviewEligible: 0,
        finalReviewReceived: 0,
      });
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "no-suspicion-cases",
      });
      markSettled(locallyReviewed, { reason: "no-suspicion-cases" });
      return;
    }

    const {
      finalReviewCandidates,
      reviewedCount,
      dismissedCount,
      heldLocalReviewCount,
      escalatedCount,
      discoveredCount,
      dispatchSummary,
    } = await applySuspicionReviewLayer({
      classified: locallyReviewed,
      suspicionCases,
      importOpId,
      sessionId,
      ...(sourceMethod !== undefined ? { sourceMethod } : {}),
    });

    (locallyReviewed as ClassifiedDraftPipelineState)._finalReviewCandidates =
      finalReviewCandidates;

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("suspicion-model", locallyReviewed, {
      localCases: dispatchSummary.totalLocalCases,
      sentToModel: dispatchSummary.sentToModel,
      sentLocalReview: dispatchSummary.sentLocalReview,
      sentAgentCandidate: dispatchSummary.sentAgentCandidate,
      sentAgentForced: dispatchSummary.sentAgentForced,
      reviewedCount,
      dismissedCount,
      heldLocalReviewCount,
      escalatedCount,
      discoveredCount,
      remainingCandidates: finalReviewCandidates.length,
      visibleStage: "suspicion-reviewed",
    });

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "suspicion-model-complete",
      suspicionCount: dispatchSummary.totalLocalCases,
      sentToSuspicionModel: dispatchSummary.sentToModel,
      sentLocalReview: dispatchSummary.sentLocalReview,
      sentAgentCandidate: dispatchSummary.sentAgentCandidate,
      sentAgentForced: dispatchSummary.sentAgentForced,
      reviewedCount,
      dismissedCount,
      heldLocalReviewCount,
      escalatedCount,
      discoveredCount,
      remainingCandidates: finalReviewCandidates.length,
    });

    const selectedFinalReviewCount = selectFinalReviewPayloads(
      finalReviewCandidates,
      locallyReviewed.length
    ).length;

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "suspicion-review-summary",
      localSuspicionCases: dispatchSummary.totalLocalCases,
      sentToSuspicionModel: dispatchSummary.sentToModel,
      modelDismissed: dismissedCount,
      modelEscalated: escalatedCount,
      finalReviewEligible: selectedFinalReviewCount,
      finalReviewReceived: PIPELINE_FLAGS.FINAL_REVIEW_ENABLED
        ? selectedFinalReviewCount
        : 0,
    });

    if (finalReviewCandidates.length === 0) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "no-remaining-suspicion-cases",
      });
      markSettled(locallyReviewed, { reason: "no-remaining-suspicion-cases" });
      return;
    }

    if (selectedFinalReviewCount === 0) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "no-final-review-selected-after-suspicion-model",
      });
      markSettled(locallyReviewed, {
        reason: "no-final-review-selected-after-suspicion-model",
      });
      return;
    }

    if (!PIPELINE_FLAGS.FINAL_REVIEW_ENABLED) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "FINAL_REVIEW_ENABLED=false",
      });
      markSettled(locallyReviewed, { reason: "FINAL_REVIEW_ENABLED=false" });
      return;
    }

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-start",
      suspicionCount: selectedFinalReviewCount,
    });

    const finalReviewed = await applyFinalReviewLayer(
      locallyReviewed,
      finalReviewCandidates,
      importOpId,
      sessionId
    );

    let appliedCount = 0;
    const comparableLength = Math.min(
      locallyReviewed.length,
      finalReviewed.length
    );
    for (let index = 0; index < comparableLength; index += 1) {
      const original = locallyReviewed[index];
      const corrected = finalReviewed[index];
      if (!original || !corrected) continue;
      if (original.type === corrected.type) continue;

      const applied = updateSession.applyCorrection(view, {
        lineIndex: index,
        correctedType: corrected.type,
        confidence: Math.max(0.65, corrected.confidence),
        reason: "Final review correction",
        source: "final-review",
        expectedCurrentText: original.text,
      });
      if (applied) {
        appliedCount += 1;
      }
    }

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("final-review", finalReviewed, {
      appliedCount,
      suspicionCount: selectedFinalReviewCount,
      ...routingStats,
      visibleStage: "final-reviewed",
    });

    markSettled(finalReviewed, {
      appliedCount,
      suspicionCount: selectedFinalReviewCount,
      ...routingStats,
    });

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-complete",
      appliedCount,
      suspicionCount: selectedFinalReviewCount,
      countPass: routingStats.countPass,
      countLocalReview: routingStats.countLocalReview,
      countAgentCandidate: routingStats.countAgentCandidate,
      countAgentForced: routingStats.countAgentForced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stage =
      error instanceof ProgressivePipelineStageError
        ? error.stage
        : "final-review";
    const code =
      error instanceof ProgressivePipelineStageError ? error.code : null;
    agentReviewLogger.error("final-review-pipeline-failed", {
      sessionId,
      stage,
      code,
      error: message,
    });
    pipelineRecorder.logRunFailure(stage, message, code ?? undefined);
  } finally {
    updateSession.complete();
    pipelineRecorder.finishRun();
  }
};

export const PasteClassifier = Extension.create<PasteClassifierOptions>({
  name: "pasteClassifier",

  addOptions() {
    return {} as PasteClassifierOptions;
  },

  addProseMirrorPlugins() {
    const agentReview = this.options.agentReview;

    return [
      new Plugin({
        key: new PluginKey("pasteClassifier"),

        props: {
          handlePaste(view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const text = clipboardData.getData("text/plain");
            if (!text || !text.trim()) return false;

            event.preventDefault();
            void applyPasteClassifierFlowToView(view, text, {
              ...(agentReview !== undefined ? { agentReview } : {}),
              classificationProfile: "paste",
            }).catch((error) => {
              const message =
                error instanceof Error ? error.message : String(error);
              agentReviewLogger.error("paste-failed-fatal", {
                error,
                message,
              });

              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent(PASTE_CLASSIFIER_ERROR_EVENT, {
                    detail: { message },
                  })
                );
              }
            });
            return true;
          },
        },
      }),
    ];
  },
});

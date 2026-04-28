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

import type { ClassifiedDraft, ElementType } from "../classification-types";
import type { ClassifyLinesContext } from "./types";

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
    cr: (text.match(/\r/g) ?? []).length,
    nbsp: (text.match(/\u00A0/g) ?? []).length,
    zwnj: (text.match(/\u200C/g) ?? []).length,
    zwj: (text.match(/\u200D/g) ?? []).length,
    zwsp: (text.match(/\u200B/g) ?? []).length,
    lrm: (text.match(/\u200E/g) ?? []).length,
    rlm: (text.match(/\u200F/g) ?? []).length,
    bom: (text.match(/\uFEFF/g) ?? []).length,
    tab: (text.match(/\t/g) ?? []).length,
    softHyphen: (text.match(/\u00AD/g) ?? []).length,
    alm: (text.match(/\u061C/g) ?? []).length,
    fullwidthColon: (text.match(/\uFF1A/g) ?? []).length,
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
          activeSchemaSeedType!,
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

  // ── post-passes (forward → retro → reverse → viterbi → suspicion) ──
  const _seqOptResult = applyClassifyLinesPostPasses({
    classified,
    memoryManager,
    dcg,
    context,
  });

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

/**
 * @module extensions/paste-classifier/classify-lines-post-passes
 *
 * Post-passes ما بعد forward classification:
 * - retroactive correction.
 * - reverse classification + merge.
 * - Viterbi sequence optimization + override.
 * - Suspicion engine analysis + pre-render actions.
 *
 * النتيجة هي SequenceOptimizationResult وحقن
 * _sequenceOptimization و _suspicionCases على pipelineState.
 *
 * كل القواعد ومنطق pipeline مطابق حرفياً للنسخة قبل التقسيم؛
 * هذه الدالة استخراج نقي بدون تعديل سلوكي.
 */

import { ContextMemoryManager } from "../context-memory-manager";
import { agentReviewLogger } from "../paste-classifier-config";
import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import { pipelineRecorder } from "../pipeline-recorder";
import { retroactiveCorrectionPass } from "../retroactive-corrector";
import {
  reverseClassificationPass,
  mergeForwardReverse,
} from "../reverse-classification-pass";
import {
  optimizeSequence,
  applyViterbiOverrides,
  type SequenceOptimizationResult,
} from "../structural-sequence-optimizer";

import {
  applyPreRenderActions,
  collectTracesFromMap,
} from "@editor/suspicion-engine/adapters/from-classifier";
import { createDefaultSuspicionEngine } from "@editor/suspicion-engine/engine";
import { traceCollector } from "@editor/suspicion-engine/trace/trace-collector";

import type { DocumentContextGraph } from "../document-context-graph";

import { PIPELINE_FLAGS } from "./constants";
import { recordStageVotes, toRepairRecords } from "./trace-helpers";
import {
  buildSourceHintsMap,
  pickSuspicionPolicyProfile,
} from "./utils/source-mapping";

import type {
  ClassifiedDraftPipelineState,
  ClassifyLinesContext,
} from "./types";

/**
 * مدخلات تطبيق post-passes.
 */
export interface ApplyClassifyLinesPostPassesArgs {
  classified: ClassifiedDraftWithId[];
  memoryManager: ContextMemoryManager;
  dcg: DocumentContextGraph | undefined;
  context: ClassifyLinesContext | undefined;
}

/**
 * تشغيل passes ما بعد forward وتعديل classified in-place.
 * يحقن _sequenceOptimization و _suspicionCases على pipelineState
 * ويُرجع SequenceOptimizationResult لاستخدامه في diagnostics.
 */
export const applyClassifyLinesPostPasses = (
  args: ApplyClassifyLinesPostPassesArgs
): SequenceOptimizationResult => {
  const { classified, memoryManager, dcg, context } = args;

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

  return _seqOptResult;
};

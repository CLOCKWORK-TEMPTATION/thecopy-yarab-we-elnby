/**
 * @module extensions/paste-classifier/classify-lines-diag
 *
 * دوال تشخيصية لـ classify-lines: حساب توزيع الحروف غير المرئية وتسجيل
 * البيانات التشخيصية قبل وبعد التصنيف.
 */

import { agentReviewLogger } from "../paste-classifier-config";

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import type { ClassifyLinesContext } from "./types";

// ─── دوال تشخيص النص ─────────────────────────────────────────────────

const countMatches = (text: string, re: RegExp): number =>
  (text.match(re) ?? []).length;

export const buildCharBreakdown = (text: string): Record<string, number> => ({
  cr: countMatches(text, /\r/g),
  nbsp: countMatches(text, / /gu),
  zwnj: countMatches(text, /‌/gu),
  zwj: countMatches(text, /‍/gu),
  zwsp: countMatches(text, /​/gu),
  lrm: countMatches(text, /‎/gu),
  rlm: countMatches(text, /‏/gu),
  bom: countMatches(text, /﻿/gu),
  tab: countMatches(text, /\t/g),
  softHyphen: countMatches(text, /­/gu),
  alm: countMatches(text, /؜/gu),
  fullwidthColon: countMatches(text, /：/gu),
});

export const logNormalizeDiag = (
  text: string,
  normalizedText: string
): void => {
  agentReviewLogger.info("diag:normalize-delta", {
    originalLength: text.length,
    normalizedLength: normalizedText.length,
    charsRemoved: text.length - normalizedText.length,
    charBreakdown: JSON.stringify(buildCharBreakdown(text)),
  });
};

export const logClassifyLinesInput = (
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

export interface OutputDiagParams {
  normalizedText: string;
  lines: string[];
  classified: ClassifiedDraftWithId[];
  seqOptResult: { totalDisagreements: number };
  schemaSeedAdopted: number;
  schemaSeedOverridden: number;
  context?: ClassifyLinesContext;
}

export const logClassifyLinesOutput = (params: OutputDiagParams): void => {
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

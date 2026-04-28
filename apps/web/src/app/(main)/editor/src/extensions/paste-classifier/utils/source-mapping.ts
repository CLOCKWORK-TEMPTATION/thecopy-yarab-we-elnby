/**
 * @module extensions/paste-classifier/utils/source-mapping
 *
 * ربط classificationProfile و sourceFileType إلى:
 * - ImportSource (paste/pdf/docx/...)
 * - بروفايل سياسة الاشتباه (balanced-paste / strict-import / ocr-heavy).
 * - بناء خريطة SourceHints لكل سطر مصنف.
 */

import type {
  ImportSource,
  SourceHints,
} from "@editor/suspicion-engine/types";

import type { ClassifiedDraftWithId } from "../../paste-classifier-helpers";

import { computeLineQuality } from "./line-quality";

import type { ClassifyLinesContext } from "../types";

/**
 * يحدد قيمة ImportSource من بروفايل التصنيف ونوع الملف.
 */
export const toImportSource = (
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

/**
 * يختار بروفايل سياسة الاشتباه الملائم للمصدر.
 */
export const pickSuspicionPolicyProfile = (
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

/**
 * يبني خريطة SourceHints لكل عنصر مصنف بحسب index.
 */
export const buildSourceHintsMap = (
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

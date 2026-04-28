import type { EditorView } from "@tiptap/pm/view";
import type { ImportSource, LineQuality } from "@editor/suspicion-engine/types";
import { ARABIC_RANGE, WEIRD_CHARS } from "./constants";

export const simpleHash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
};

export const normalizePreviewText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

export const normalizeComparableText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const computeDocumentSignature = (view: EditorView): string =>
  simpleHash(
    `${view.state.doc.childCount}:${view.state.doc.textBetween(
      0,
      view.state.doc.content.size,
      "\n",
      "\n"
    )}`
  );

export const computeLineQuality = (text: string): LineQuality => {
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

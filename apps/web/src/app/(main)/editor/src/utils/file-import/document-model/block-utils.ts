/**
 * @module document-model/block-utils
 * @description أدوات معالجة كتل السيناريو
 */

import { normalizeBlockText } from "./encoding";
import { normalizeFormatId, splitLegacyTopLineText } from "./format-utils";

import type { ScreenplayBlock } from "./types";

/**
 * يُطبّع مصفوفة كتل واردة: يُطبّع المعرّفات، يفكّ أسطر top-line، ويُطبّع النصوص.
 * يُستخدم كبوابة تطبيع موحّدة قبل الترميز أو التحويل إلى HTML.
 */
export const normalizeIncomingBlocks = (
  blocks: ScreenplayBlock[]
): ScreenplayBlock[] => {
  const normalizedBlocks: ScreenplayBlock[] = [];

  for (const block of blocks) {
    const formatId = normalizeFormatId(block.formatId);
    if (!formatId) continue;

    if (formatId === "scene_header_top_line") {
      normalizedBlocks.push(...splitLegacyTopLineText(block.text));
      continue;
    }

    normalizedBlocks.push({
      formatId,
      text: normalizeBlockText(block.text),
    });
  }

  return normalizedBlocks;
};

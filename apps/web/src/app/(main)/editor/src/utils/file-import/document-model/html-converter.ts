/**
 * @module document-model/html-converter
 * @description تحويل HTML/كتل السيناريو
 */

import type { ScreenplayBlock } from "./types";
import { normalizeBlockText, escapeHtml } from "./encoding";
import {
  getFormatIdFromElement,
  splitLegacyTopLineText,
  toLineTextsFromNode,
} from "./format-utils";
import { normalizeIncomingBlocks } from "./block-utils";

/**
 * يحوّل سلسلة HTML إلى مصفوفة كتل سيناريو عبر DOMParser.
 *
 * يعالج ثلاث حالات لكل عقدة:
 * - عقدة نصية → كتل `action`
 * - عنصر `scene_header_top_line` → فكّ إلى `scene_header_1` + `scene_header_2`
 * - عنصر آخر → استخراج formatId من `data-type` أو CSS class
 *
 * يُطبّق {@link normalizeIncomingBlocks} على النتيجة النهائية.
 *
 * @param html - سلسلة HTML من محرر Tiptap أو مصدر خارجي
 * @returns مصفوفة كتل مُطبَّعة (فارغة إذا كان HTML فارغاً أو DOMParser غير متاح)
 */
export const htmlToScreenplayBlocks = (html: string): ScreenplayBlock[] => {
  if (!html?.trim()) return [];
  if (typeof DOMParser === "undefined") return [];

  const parser = new DOMParser();
  const documentRef = parser.parseFromString(
    `<div id="screenplay-model-root">${html}</div>`,
    "text/html"
  );
  const root = documentRef.getElementById("screenplay-model-root");
  if (!root) return [];

  const blocks: ScreenplayBlock[] = [];

  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLines = normalizeBlockText(node.textContent ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      textLines.forEach((line) => {
        blocks.push({ formatId: "action", text: line });
      });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const formatId = getFormatIdFromElement(element) ?? "action";

    if (formatId === "scene_header_top_line") {
      const directChildren = Array.from(element.children);
      const sceneHeader1 = directChildren.find((child) => {
        const id = getFormatIdFromElement(child);
        return id === "scene_header_1";
      });
      const sceneHeader2 = directChildren.find((child) => {
        const id = getFormatIdFromElement(child);
        return id === "scene_header_2";
      });

      if (sceneHeader1) {
        toLineTextsFromNode(sceneHeader1).forEach((line) => {
          blocks.push({ formatId: "scene_header_1", text: line });
        });
      }

      if (sceneHeader2) {
        toLineTextsFromNode(sceneHeader2).forEach((line) => {
          blocks.push({ formatId: "scene_header_2", text: line });
        });
      }

      if (!sceneHeader1 && !sceneHeader2) {
        blocks.push(...splitLegacyTopLineText(element.textContent || ""));
      }

      return;
    }

    toLineTextsFromNode(element).forEach((line) => {
      blocks.push({ formatId, text: line });
    });
  });

  return normalizeIncomingBlocks(blocks);
};

/**
 * يبني HTML لعنصر top-line مركّب من header-1 و header-2 مع تهريب XSS.
 * @internal يُستخدم حصرياً من {@link screenplayBlocksToHtml}
 */
const renderTopLineBlock = (header1: string, header2: string): string => {
  const top = normalizeBlockText(header1).trim();
  const bottom = normalizeBlockText(header2).trim();
  return `<div data-type="scene_header_top_line"><div data-type="scene_header_1">${
    top ? escapeHtml(top) : ""
  }</div><div data-type="scene_header_2">${bottom ? escapeHtml(bottom) : ""}</div></div>`;
};

/**
 * يحوّل مصفوفة كتل سيناريو إلى سلسلة HTML جاهزة لمحرر Tiptap.
 *
 * يعالج ثلاث حالات خاصة لترويسات المشاهد:
 * - `scene_header_top_line` → فكّ ثم عرض كـ top-line مركّب
 * - `scene_header_1` يليه `scene_header_2` → دمجهما في top-line واحد
 * - `scene_header_1` أو `scene_header_2` منفرداً → top-line بجزء فارغ
 *
 * باقي الأنواع تُعرض كـ `<div data-type="formatId">text</div>`.
 *
 * @param blocks - مصفوفة كتل من نوع {@link ScreenplayBlock}
 * @returns سلسلة HTML مُطبَّعة
 */
export const screenplayBlocksToHtml = (blocks: ScreenplayBlock[]): string => {
  const normalized = normalizeIncomingBlocks(
    (blocks ?? []).filter(
      (block): block is ScreenplayBlock =>
        Boolean(block) &&
        typeof block.text === "string" &&
        typeof block.formatId === "string"
    )
  );

  const html: string[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const current = normalized[i];
    const next = normalized[i + 1];

    if (!current) {
      continue;
    }

    if (current.formatId === "scene_header_top_line") {
      const parts = splitLegacyTopLineText(current.text);
      const header1 =
        parts.find((part) => part.formatId === "scene_header_1")?.text ?? "";
      const header2 =
        parts.find((part) => part.formatId === "scene_header_2")?.text ?? "";
      html.push(renderTopLineBlock(header1, header2));
      continue;
    }

    if (current.formatId === "scene_header_1") {
      if (next?.formatId === "scene_header_2") {
        html.push(renderTopLineBlock(current.text, next.text));
        i += 1;
        continue;
      }
      html.push(renderTopLineBlock(current.text, ""));
      continue;
    }

    if (current.formatId === "scene_header_2") {
      html.push(renderTopLineBlock("", current.text));
      continue;
    }

    const text = normalizeBlockText(current.text);
    const htmlText = text ? escapeHtml(text).replace(/\n/g, "<br>") : "";
    html.push(`<div data-type="${current.formatId}">${htmlText}</div>`);
  }

  return html.join("");
};

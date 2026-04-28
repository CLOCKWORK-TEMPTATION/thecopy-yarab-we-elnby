/**
 * @module document-model/format-utils
 * @description أدوات تنسيق المعرّفات والعناصر
 */

import { DATA_TYPE_TO_FORMAT_ID, FORMAT_ID_SET } from "./constants";
import type { ScreenplayFormatId, SplitTopLineBlock } from "./types";
import { normalizeBlockText } from "./encoding";

/**
 * يُطبّع معرّف تنسيق خام إلى {@link ScreenplayFormatId} صالح.
 * يدعم الصيغ القديمة (camelCase مثل `sceneHeaderTopLine`) والحديثة (kebab-case).
 * @returns المعرّف المُطبَّع أو `null` إذا كان غير معروف
 */
export const normalizeFormatId = (value: string): ScreenplayFormatId | null => {
  if (!value) return null;
  if (value in DATA_TYPE_TO_FORMAT_ID) {
    return DATA_TYPE_TO_FORMAT_ID[value] ?? null;
  }
  if (FORMAT_ID_SET.has(value)) {
    return value as ScreenplayFormatId;
  }
  return null;
};

/**
 * يستخرج معرّف التنسيق من عنصر HTML عبر `data-type` أولاً ثم فئات CSS (`format-*`).
 * @param element - عنصر DOM المراد فحصه
 * @returns المعرّف المُطبَّع أو `null`
 */
export const getFormatIdFromElement = (
  element: Element
): ScreenplayFormatId | null => {
  const dataType = element.getAttribute("data-type");
  if (dataType) {
    const normalized = normalizeFormatId(dataType);
    if (normalized) return normalized;
  }

  const classNames = Array.from(element.classList);
  for (const className of classNames) {
    if (!className.startsWith("format-")) continue;
    const rawId = className.slice("format-".length);
    const normalized = normalizeFormatId(rawId);
    if (normalized) return normalized;
  }

  return null;
};

/**
 * يفكّ سطر ترويسة مشهد مُركَّب (top-line) إلى أجزائه: رقم المشهد (header-1) وزمن/مكان (header-2).
 * يعالج الفواصل: شرطة، نقطتين، فاصلة عربية، أو مسافة.
 * @param text - نص السطر المُركَّب
 * @returns مصفوفة كتل مقسّمة (1-2 عنصر) أو مصفوفة فارغة
 */
export const splitLegacyTopLineText = (text: string): SplitTopLineBlock[] => {
  const normalized = normalizeBlockText(text).replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const pairMatch =
    /^((?:مشهد|scene)\s*[0-9٠-٩]+)\s*(?:[-–—:،]\s*|\s+)(.+)$/iu.exec(
      normalized
    );
  if (pairMatch) {
    const part1 = pairMatch[1];
    const part2 = pairMatch[2];
    if (!part1 || !part2) {
      return [{ formatId: "scene_header_2", text: normalized }];
    }
    return [
      { formatId: "scene_header_1", text: part1.trim() },
      { formatId: "scene_header_2", text: part2.trim() },
    ];
  }

  if (/^(?:مشهد|scene)\s*[0-9٠-٩]+/iu.test(normalized)) {
    return [{ formatId: "scene_header_1", text: normalized }];
  }

  return [{ formatId: "scene_header_2", text: normalized }];
};

/**
 * يستخرج أسطر النص من عنصر DOM (يفضّل `innerText` على `textContent`).
 * @returns مصفوفة أسطر مُطبَّعة (عنصر واحد على الأقل)
 */
export const toLineTextsFromNode = (element: Element): string[] => {
  const rawText =
    element instanceof HTMLElement && typeof element.innerText === "string"
      ? element.innerText
      : element.textContent || "";

  const lines = normalizeBlockText(rawText)
    .split("\n")
    .map((line) => line.trim());

  return lines.length > 0 ? lines : [""];
};

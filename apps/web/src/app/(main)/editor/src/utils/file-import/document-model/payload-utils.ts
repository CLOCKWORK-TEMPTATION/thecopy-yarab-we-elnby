/**
 * @module document-model/payload-utils
 * @description أدوات الحمولة والتشفير
 */

import {
  SCREENPLAY_PAYLOAD_VERSION,
  SCREENPLAY_PAYLOAD_TOKEN,
  MARKER_RE,
} from "./constants";
import type { ScreenplayPayloadV1, UnsignedPayload, ScreenplayBlock } from "./types";
import { utf8ToBase64, base64ToUtf8, fnv1a, normalizeBlockText } from "./encoding";
import { normalizeIncomingBlocks } from "./block-utils";
import { normalizeFormatId } from "./format-utils";
import { htmlToScreenplayBlocks } from "./html-converter";

/** يحسب بصمة FNV1a للحمولة بدون حقل checksum عبر تسلسل JSON */
const computePayloadChecksum = (
  payload: UnsignedPayload
): string => {
  return fnv1a(JSON.stringify(payload));
};

/**
 * يُطبّع الحمولة ويعيد حساب بصمة التحقق FNV1a.
 * يُطبّق {@link normalizeIncomingBlocks} على الكتل قبل الحساب.
 *
 * @param payload - حمولة بدون بصمة (أو ببصمة قديمة تُتجاهل)
 * @returns حمولة كاملة من نوع {@link ScreenplayPayloadV1} ببصمة صحيحة
 */
export const ensurePayloadChecksum = (
  payload: UnsignedPayload & { checksum?: string }
): ScreenplayPayloadV1 => {
  const unsignedPayload = {
    version: SCREENPLAY_PAYLOAD_VERSION,
    blocks: normalizeIncomingBlocks(payload.blocks),
    font: payload.font,
    size: payload.size,
    createdAt: payload.createdAt,
  } as const;

  return {
    ...unsignedPayload,
    checksum: computePayloadChecksum(unsignedPayload),
  };
};

/**
 * يبني علامة الحمولة الكاملة: `[[FILMLANE_PAYLOAD_V1:<encodedPayload>]]`
 * @param encodedPayload - الحمولة المشفّرة بـ Base64
 */
export const buildPayloadMarker = (encodedPayload: string): string =>
  `[[${SCREENPLAY_PAYLOAD_TOKEN}:${encodedPayload}]]`;

/**
 * يستخرج الجزء المشفّر بـ Base64 من علامة الحمولة في النص.
 * @param text - النص الذي قد يحتوي علامة `[[FILMLANE_PAYLOAD_V1:...]]`
 * @returns السلسلة المشفّرة أو `null` إذا لم تُوجد علامة
 */
export const extractEncodedPayloadMarker = (text: string): string | null => {
  const match = MARKER_RE.exec(text ?? "");
  const encoded = match?.[1];
  return encoded ?? null;
};

/**
 * يُرمّز حمولة السيناريو إلى سلسلة Base64 عبر تسلسل JSON ثم UTF-8→Base64.
 * @param payload - حمولة كاملة من نوع {@link ScreenplayPayloadV1}
 * @returns سلسلة Base64 جاهزة للتضمين في علامة الحمولة
 */
export const encodeScreenplayPayload = (payload: ScreenplayPayloadV1): string =>
  utf8ToBase64(JSON.stringify(payload));

/**
 * يفكّ ترميز حمولة سيناريو من سلسلة Base64 ويتحقق من سلامتها.
 *
 * خطوات التحقق:
 * 1. فك Base64 → JSON → كائن
 * 2. التحقق من وجود جميع الحقول الإلزامية وأنواعها
 * 3. تطبيع معرّفات التنسيق ونصوص الكتل
 * 4. إعادة حساب بصمة FNV1a ومقارنتها بالبصمة المُخزَّنة
 *
 * @param encodedPayload - سلسلة Base64 المستخرجة من علامة الحمولة
 * @returns حمولة صالحة أو `null` إذا فشل أي تحقق
 */
export const decodeScreenplayPayload = (
  encodedPayload: string
): ScreenplayPayloadV1 | null => {
  try {
    const decoded = base64ToUtf8(encodedPayload);
    const parsed = JSON.parse(decoded) as Partial<ScreenplayPayloadV1>;

    if (
      parsed?.version !== SCREENPLAY_PAYLOAD_VERSION ||
      !Array.isArray(parsed.blocks) ||
      typeof parsed.font !== "string" ||
      typeof parsed.size !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.checksum !== "string"
    ) {
      return null;
    }

    const sanitizedBlocks: ScreenplayBlock[] = [];
    for (const block of parsed.blocks) {
      if (!block || typeof block !== "object") continue;
      if (typeof block.text !== "string" || typeof block.formatId !== "string")
        continue;

      const normalized = normalizeFormatId(block.formatId);
      if (!normalized) continue;

      sanitizedBlocks.push({
        formatId: normalized,
        text: normalizeBlockText(block.text),
      });
    }

    const rebuilt = ensurePayloadChecksum({
      version: SCREENPLAY_PAYLOAD_VERSION,
      blocks: sanitizedBlocks,
      font: parsed.font,
      size: parsed.size,
      createdAt: parsed.createdAt,
    });

    if (rebuilt.checksum !== parsed.checksum) {
      return null;
    }

    return rebuilt;
  } catch {
    return null;
  }
};

/**
 * يستخرج ويفكّ ترميز حمولة السيناريو من نص يحتوي علامة حمولة.
 * يجمع بين {@link extractEncodedPayloadMarker} و {@link decodeScreenplayPayload}.
 *
 * @param text - النص الذي قد يحتوي `[[FILMLANE_PAYLOAD_V1:...]]`
 * @returns حمولة صالحة أو `null` إذا لم تُوجد علامة أو فشل فك الترميز
 */
export const extractPayloadFromText = (
  text: string
): ScreenplayPayloadV1 | null => {
  const encoded = extractEncodedPayloadMarker(text);
  if (!encoded) return null;
  return decodeScreenplayPayload(encoded);
};

/**
 * يبني حمولة سيناريو كاملة من مصفوفة كتل مع بصمة FNV1a.
 *
 * القيم الافتراضية: خط `AzarMehrMonospaced-San`، حجم `12pt`، تاريخ ISO حالي.
 *
 * @param blocks - مصفوفة كتل المصدر
 * @param options - خيارات اختيارية (font, size, createdAt)
 * @returns حمولة كاملة من نوع {@link ScreenplayPayloadV1}
 */
export const createPayloadFromBlocks = (
  blocks: ScreenplayBlock[],
  options?: {
    font?: string;
    size?: string;
    createdAt?: string;
  }
): ScreenplayPayloadV1 => {
  return ensurePayloadChecksum({
    version: SCREENPLAY_PAYLOAD_VERSION,
    blocks: normalizeIncomingBlocks(blocks),
    font: options?.font ?? "AzarMehrMonospaced-San",
    size: options?.size ?? "12pt",
    createdAt: options?.createdAt ?? new Date().toISOString(),
  });
};

/**
 * يبني حمولة سيناريو كاملة من سلسلة HTML.
 * اختصار يجمع {@link htmlToScreenplayBlocks} ثم {@link createPayloadFromBlocks}.
 *
 * @param html - سلسلة HTML من محرر Tiptap
 * @param options - خيارات اختيارية (font, size, createdAt)
 * @returns حمولة كاملة من نوع {@link ScreenplayPayloadV1}
 */
export const createPayloadFromHtml = (
  html: string,
  options?: {
    font?: string;
    size?: string;
    createdAt?: string;
  }
): ScreenplayPayloadV1 => {
  const blocks = htmlToScreenplayBlocks(html);
  return createPayloadFromBlocks(blocks, options);
};

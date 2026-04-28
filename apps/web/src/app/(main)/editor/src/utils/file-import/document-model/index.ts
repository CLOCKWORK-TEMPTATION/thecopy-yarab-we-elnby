/**
 * @module document-model
 * @description نموذج المستند الأساسي لتطبيق Filmlane.
 *
 * يُعرّف هيكل كتلة السيناريو ({@link ScreenplayBlock})، حمولة التصدير/الاستيراد
 * ({@link ScreenplayPayloadV1})، وآليات الترميز/فكّ الترميز (Base64 + FNV1a checksum).
 *
 * يتضمن تحويلات ثنائية الاتجاه بين:
 * - كتل السيناريو ↔ HTML (لتكامل Tiptap)
 * - كتل السيناريو ↔ Payload مشفّر (للتصدير/الاستيراد بدون فقدان)
 *
 * علامة الحمولة: `[[FILMLANE_PAYLOAD_V1:<base64>]]`
 */

// Types
export type {
  ScreenplayFormatId,
  ScreenplayBlock,
  ScreenplayPayloadV1,
  UnsignedPayload,
  SplitTopLineBlock,
} from "./types";

// Constants
export {
  SCREENPLAY_BLOCK_FORMAT_IDS,
  SCREENPLAY_PAYLOAD_VERSION,
  SCREENPLAY_PAYLOAD_TOKEN,
  MARKER_RE,
  FORMAT_ID_SET,
  DATA_TYPE_TO_FORMAT_ID,
} from "./constants";

// Encoding utilities
export {
  escapeHtml,
  utf8ToBase64,
  base64ToUtf8,
  fnv1a,
  normalizeBlockText,
} from "./encoding";

// Format utilities
export {
  normalizeFormatId,
  getFormatIdFromElement,
  splitLegacyTopLineText,
  toLineTextsFromNode,
} from "./format-utils";

// Block utilities
export { normalizeIncomingBlocks } from "./block-utils";

// HTML converter
export {
  htmlToScreenplayBlocks,
  screenplayBlocksToHtml,
} from "./html-converter";

// Payload utilities
export {
  ensurePayloadChecksum,
  buildPayloadMarker,
  extractEncodedPayloadMarker,
  encodeScreenplayPayload,
  decodeScreenplayPayload,
  extractPayloadFromText,
  createPayloadFromBlocks,
  createPayloadFromHtml,
} from "./payload-utils";

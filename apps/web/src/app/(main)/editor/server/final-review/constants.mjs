// ─────────────────────────────────────────────────────────
// final-review/constants.mjs — الثوابت والقيود
// ─────────────────────────────────────────────────────────

// نموذج افتراضي
export const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

// معاملات التحكم في الجودة
export const TEMPERATURE = 0.0;
export const DEFAULT_TIMEOUT_MS = 180_000;
export const API_VERSION = "2.0";
export const API_MODE = "auto-apply";

// ميزانية التوكنز
export const BASE_OUTPUT_TOKENS = 1200;
export const TOKENS_PER_SUSPICIOUS_LINE = 1000;
export const MAX_TOKENS_CEILING = 64000;

// قيود التحقق من الإدخال
export const MAX_PACKET_VERSION_LENGTH = 64;
export const MAX_SCHEMA_VERSION_LENGTH = 64;
export const MAX_SESSION_ID_LENGTH = 120;
export const MAX_IMPORT_OP_ID_LENGTH = 120;
export const MAX_REVIEW_PACKET_TEXT_LENGTH = 160_000;
export const MAX_ITEM_ID_LENGTH = 120;
export const MAX_TEXT_LENGTH = 8_000;
export const MAX_FINGERPRINT_LENGTH = 256;
export const MAX_REASON_CODES = 32;
export const MAX_SIGNAL_MESSAGES = 32;

// الأنواع المسموحة
export const ALLOWED_LINE_TYPES = new Set([
  "action",
  "dialogue",
  "character",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "transition",
  "parenthetical",
  "basmala",
]);

// نطاقات التوجيه المسموحة
export const ALLOWED_ROUTING_BANDS = new Set(["agent-candidate", "agent-forced"]);

// قناة المراجعة النهائية
export const FINAL_REVIEW_CHANNEL = "final-review";

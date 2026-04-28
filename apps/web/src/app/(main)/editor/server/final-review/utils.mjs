// ─────────────────────────────────────────────────────────
// final-review/utils.mjs — أدوات مساعدة
// ─────────────────────────────────────────────────────────

export const isObjectRecord = (value) =>
  typeof value === "object" && value !== null;

export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const isIntegerNumber = (value) => Number.isInteger(value) && value >= 0;

export const normalizeIncomingText = (value, maxLength = 50_000) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

/**
 * T009 partial — تطبيع نوع scene_header في قرارات الوكيل
 * في final-review، نُطبّع scene_header_1/2 إلى scene_header_top_line
 * (عكس agent-review الذي يُطبّع scene_header_top_line → scene_header_1)
 */
export const normalizeSceneHeaderDecisionType = (lineType) => {
  if (lineType === "scene_header_1" || lineType === "scene_header_2") {
    return "scene_header_top_line";
  }
  return lineType;
};

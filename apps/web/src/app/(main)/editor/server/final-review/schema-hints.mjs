// ─────────────────────────────────────────────────────────
// final-review/schema-hints.mjs — القيم الافتراضية للمخطط
// ─────────────────────────────────────────────────────────

import { ALLOWED_LINE_TYPES } from "./constants.mjs";

export const DEFAULT_SCHEMA_HINTS = {
  allowedLineTypes: [...ALLOWED_LINE_TYPES],
  lineTypeDescriptions: {
    action: "وصف الحدث والمشهد",
    dialogue: "نص الحوار المنطوق",
    character: "اسم الشخصية فوق الحوار",
    scene_header_1: "رأس المشهد الرئيسي",
    scene_header_2: "رأس المشهد الفرعي",
    scene_header_3: "وصف زمني أو مكاني للمشهد",
    transition: "انتقال بين المشاهد",
    parenthetical: "توجيه أدائي بين قوسين",
    basmala: "البسملة في بداية المستند",
  },
  gateRules: [],
};

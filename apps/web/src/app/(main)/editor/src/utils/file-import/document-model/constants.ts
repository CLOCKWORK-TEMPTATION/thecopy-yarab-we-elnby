/**
 * @module document-model/constants
 * @description الثوابت والمعرفات الخاصة بنموذج المستند
 */

/**
 * معرّفات التنسيق المتاحة لكتل السيناريو العربي.
 * تُستخدم كاتحاد حرفي عبر `as const` لضمان أمان الأنواع.
 *
 * العناصر العشرة:
 * `basmala` | `scene_header_top_line` | `scene_header_1` | `scene_header_2` |
 * `scene_header_3` | `action` | `character` | `dialogue` | `parenthetical` | `transition`
 */
export const SCREENPLAY_BLOCK_FORMAT_IDS = [
  "basmala",
  "scene_header_top_line",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
] as const;

/** رقم إصدار بروتوكول الحمولة الحالي */
export const SCREENPLAY_PAYLOAD_VERSION = 1 as const;

/** رمز التعريف المُضمَّن في علامة الحمولة: `[[FILMLANE_PAYLOAD_V1:...]]` */
export const SCREENPLAY_PAYLOAD_TOKEN = "FILMLANE_PAYLOAD_V1" as const;

/** regex لاستخراج علامة الحمولة */
export const MARKER_RE = new RegExp(
  String.raw`\[\[${SCREENPLAY_PAYLOAD_TOKEN}:([A-Za-z0-9+/=]+)\]\]`,
  "u"
);

/** مجموعة معرفات التنسيق للبحث السريع */
export const FORMAT_ID_SET = new Set<string>(SCREENPLAY_BLOCK_FORMAT_IDS);

/** خريطة تحويل أنواع البيانات إلى معرفات التنسيق */
export const DATA_TYPE_TO_FORMAT_ID: Record<string, ScreenplayFormatId> = {
  basmala: "basmala",
  scene_header_top_line: "scene_header_top_line",
  scene_header_1: "scene_header_1",
  scene_header_2: "scene_header_2",
  scene_header_3: "scene_header_3",
  action: "action",
  character: "character",
  dialogue: "dialogue",
  parenthetical: "parenthetical",
  transition: "transition",
  sceneHeaderTopLine: "scene_header_top_line",
  sceneHeader3: "scene_header_3",
};

// Import type for the mapping above
import type { ScreenplayFormatId } from "./types";

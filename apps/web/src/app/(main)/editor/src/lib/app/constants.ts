/**
 * @file constants.ts
 * @description ثوابت موديول التطبيق وأنواع البيانات الخاصة بحالة المحرر.
 */

import {
  brandColors,
  classificationTypeOptions,
  colors,
  DOCK_BUTTONS,
  EDITOR_CANVAS_BOTTOM_OFFSET_PX,
  EDITOR_CANVAS_COMPACT_GUTTER_PX,
  EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX,
  EDITOR_CANVAS_LEFT_GUTTER_PX,
  EDITOR_CANVAS_RIGHT_RESERVE_PX,
  EDITOR_CANVAS_TOP_OFFSET_PX,
  EDITOR_CANVAS_WIDTH_PX,
  fonts,
  formatClassMap,
  FORMAT_LABEL_BY_TYPE,
  getSpacingMarginTop,
  gradients,
  highlightColors,
  MENU_SECTIONS,
  screenplayFormats,
  semanticColors,
  SHORTCUT_FORMAT_BY_DIGIT,
  SIDEBAR_SECTIONS,
  textSizes,
} from "../../constants";

export const TYPING_SETTINGS_STORAGE_KEY = "filmlane.typing-system.settings";
export const AUTOSAVE_DRAFT_STORAGE_KEY = "filmlane.autosave.document-text.v1";

export const LOCKED_EDITOR_FONT_LABEL = fonts[0]?.label ?? "غير محدد";
export const LOCKED_EDITOR_FONT_VALUE =
  fonts[0]?.value ?? "AzarMehrMonospaced-San";
export const LOCKED_EDITOR_SIZE_LABEL = textSizes[0]?.label ?? "12";
export const SUPPORTED_LEGACY_FORMAT_COUNT = Object.keys(formatClassMap).length;
export const CLASSIFIER_OPTION_COUNT = classificationTypeOptions.length;
export const ACTION_BLOCK_SPACING =
  getSpacingMarginTop("action", "action") || "0";
export const MAX_DIAGNOSTIC_EVENTS = 5;

export interface EditorAutosaveSnapshot {
  html?: string;
  text: string;
  updatedAt: string;
  version?: 2;
}

export interface EditorDiagnosticEvent {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface EditorAppConstants {
  brandColors: typeof brandColors;
  colors: typeof colors;
  DOCK_BUTTONS: typeof DOCK_BUTTONS;
  EDITOR_CANVAS_BOTTOM_OFFSET_PX: typeof EDITOR_CANVAS_BOTTOM_OFFSET_PX;
  EDITOR_CANVAS_COMPACT_GUTTER_PX: typeof EDITOR_CANVAS_COMPACT_GUTTER_PX;
  EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX: typeof EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX;
  EDITOR_CANVAS_LEFT_GUTTER_PX: typeof EDITOR_CANVAS_LEFT_GUTTER_PX;
  EDITOR_CANVAS_RIGHT_RESERVE_PX: typeof EDITOR_CANVAS_RIGHT_RESERVE_PX;
  EDITOR_CANVAS_TOP_OFFSET_PX: typeof EDITOR_CANVAS_TOP_OFFSET_PX;
  EDITOR_CANVAS_WIDTH_PX: typeof EDITOR_CANVAS_WIDTH_PX;
  FORMAT_LABEL_BY_TYPE: typeof FORMAT_LABEL_BY_TYPE;
  gradients: typeof gradients;
  highlightColors: typeof highlightColors;
  MENU_SECTIONS: typeof MENU_SECTIONS;
  screenplayFormats: typeof screenplayFormats;
  semanticColors: typeof semanticColors;
  SHORTCUT_FORMAT_BY_DIGIT: typeof SHORTCUT_FORMAT_BY_DIGIT;
  SIDEBAR_SECTIONS: typeof SIDEBAR_SECTIONS;
}

export const getConstants = (): EditorAppConstants => ({
  brandColors,
  colors,
  DOCK_BUTTONS,
  EDITOR_CANVAS_BOTTOM_OFFSET_PX,
  EDITOR_CANVAS_COMPACT_GUTTER_PX,
  EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX,
  EDITOR_CANVAS_LEFT_GUTTER_PX,
  EDITOR_CANVAS_RIGHT_RESERVE_PX,
  EDITOR_CANVAS_TOP_OFFSET_PX,
  EDITOR_CANVAS_WIDTH_PX,
  FORMAT_LABEL_BY_TYPE,
  gradients,
  highlightColors,
  MENU_SECTIONS,
  screenplayFormats,
  semanticColors,
  SHORTCUT_FORMAT_BY_DIGIT,
  SIDEBAR_SECTIONS,
});

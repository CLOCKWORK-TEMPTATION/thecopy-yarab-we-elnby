/**
 * @file utils.ts
 * @description دوال نقية لقراءة/كتابة الحالة المستقلة عن React (localStorage,
 *   عنوان المشروع، استعادة المسودة، تطبيق design tokens).
 */

import { getCurrentProject } from "@/lib/projectStore";

import {
  brandColors,
  colors,
  gradients,
  highlightColors,
  semanticColors,
} from "../../constants";
import { loadFromStorage } from "../../hooks";
import {
  DEFAULT_TYPING_SYSTEM_SETTINGS,
  sanitizeTypingSystemSettings,
  type TypingSystemSettings,
} from "../../types";

import {
  AUTOSAVE_DRAFT_STORAGE_KEY,
  LOCKED_EDITOR_FONT_VALUE,
  LOCKED_EDITOR_SIZE_LABEL,
  TYPING_SETTINGS_STORAGE_KEY,
  type EditorAutosaveSnapshot,
} from "./constants";

import type { EditorArea } from "../../components/editor";

export const readTypingSystemSettings = (): TypingSystemSettings => {
  const parsed = loadFromStorage<Partial<TypingSystemSettings> | null>(
    TYPING_SETTINGS_STORAGE_KEY,
    null
  );
  return sanitizeTypingSystemSettings(parsed ?? DEFAULT_TYPING_SYSTEM_SETTINGS);
};

export const readActiveProjectTitle = (): string | null => {
  const project = getCurrentProject();
  if (!project?.id) {
    return null;
  }

  const normalizedTitle =
    typeof project.title === "string" ? project.title.trim() : "";
  return normalizedTitle || "مشروع بدون عنوان";
};

export const readAutosaveSnapshot = (): EditorAutosaveSnapshot | null =>
  loadFromStorage<EditorAutosaveSnapshot | null>(
    AUTOSAVE_DRAFT_STORAGE_KEY,
    null
  );

export const canRestoreAutosaveSnapshot = (
  snapshot: EditorAutosaveSnapshot | null
): snapshot is EditorAutosaveSnapshot =>
  Boolean(snapshot?.text && snapshot.text.trim().length > 0);

export const applyAutosaveSnapshot = async (
  area: EditorArea,
  snapshot: EditorAutosaveSnapshot
): Promise<void> => {
  if (snapshot.version === 2 && snapshot.html?.trim()) {
    area.editor.commands.setContent(snapshot.html, { emitUpdate: true });
    area.editor.commands.focus("end");
    return;
  }

  await area.importClassifiedText(snapshot.text, "replace");
};

export const applyDesignTokens = (): void => {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--brand", brandColors.jungleGreen);
  rootStyle.setProperty("--brand-teal", brandColors.teal);
  rootStyle.setProperty("--brand-bronze", brandColors.bronze);
  rootStyle.setProperty("--ring", brandColors.jungleGreen);
  rootStyle.setProperty("--accent", semanticColors.secondary);
  rootStyle.setProperty("--accent-success", semanticColors.success);
  rootStyle.setProperty("--accent-warning", semanticColors.warning);
  rootStyle.setProperty("--accent-error", semanticColors.error);
  rootStyle.setProperty("--accent-creative", semanticColors.creative);
  rootStyle.setProperty("--accent-technical", semanticColors.technical);
  rootStyle.setProperty("--filmlane-brand-gradient", gradients.jungleFull);
  rootStyle.setProperty("--filmlane-brand-gradient-soft", gradients.jungle);
  rootStyle.setProperty("--filmlane-highlight-primary", highlightColors[0]);
  rootStyle.setProperty("--filmlane-highlight-secondary", highlightColors[1]);
  rootStyle.setProperty("--filmlane-palette-dark", colors[0]);
  rootStyle.setProperty("--filmlane-editor-font", LOCKED_EDITOR_FONT_VALUE);
  rootStyle.setProperty(
    "--filmlane-editor-size",
    `${LOCKED_EDITOR_SIZE_LABEL}pt`
  );
};

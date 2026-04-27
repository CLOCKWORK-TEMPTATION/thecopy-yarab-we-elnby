import type { TypingSystemSettings } from "./index";

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

export const TYPING_SETTINGS_STORAGE_KEY = "filmlane.typing-system.settings";
export const AUTOSAVE_DRAFT_STORAGE_KEY = "filmlane.autosave.document-text.v1";
export const MAX_DIAGNOSTIC_EVENTS = 5;

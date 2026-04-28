/**
 * @file studio/index.ts — Barrel export for SelfTapeSuite studio components
 * @description Re-exports all studio components and hooks for backward compatibility
 */

// Hooks
export { useSelfTapeState } from "./useSelfTapeState";
export { useCameraRecording } from "./useCameraRecording";

// Types
export type {
  ActiveTool,
  CameraState,
  NotificationState,
  NoteType,
  NoteSeverity,
  TakeNote,
  Take,
  TeleprompterSettings,
  ExportSettings,
  ComparisonView,
  PendingTake,
  SelfTapeSuiteSnapshot,
} from "./types";

// UI Components
export { Header } from "./Header";
export { Notification } from "./Notification";
export { ToolNavigation } from "./ToolNavigation";

// Page Components
export { TeleprompterPage } from "./TeleprompterPage";
export { RecorderPage } from "./RecorderPage";
export { ComparisonPage } from "./ComparisonPage";
export { NotesPage } from "./NotesPage";
export { ExportPage } from "./ExportPage";

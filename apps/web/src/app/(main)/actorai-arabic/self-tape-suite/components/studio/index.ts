/**
 * @file studio/index.ts — Barrel export for SelfTapeSuite studio components
 * @description Re-exports all studio components and hooks for backward compatibility
 */

// Hooks
export { useSelfTapeState } from "./useSelfTapeState";
export { useCameraRecording } from "./useCameraRecording";

// UI Components
export { Header } from "./Header";
export { Notification } from "./Notification";
export { ToolNavigation } from "./ToolNavigation";

// Page Components
export { TeleprompterPage } from "./TeleprompterPage";

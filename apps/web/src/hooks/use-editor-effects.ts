/**
 * @file apps/web/src/hooks/use-editor-effects.ts
 * @description Effects hook for the App component.
 */

import { useEffect } from "react";

import { EditorArea } from "../components/editor/EditorArea";
import { subscribeIsMobile } from "../hooks";
import { applyDesignTokens, scheduleAutoSave , saveToStorage } from "../hooks/storage";
import { buildKeyHandler , readActiveProjectTitle, readAutosaveSnapshot, canRestoreAutosaveSnapshot, applyAutosaveSnapshot } from "../lib/app/utils";

import type { EditorAutosaveSnapshot, EditorDiagnosticEvent } from "../types/app";

interface EditorState {
  editorMountRef: React.RefObject<HTMLDivElement | null>;
  editorAreaRef: React.RefObject<EditorArea | null>;
  handleMenuActionRef: React.RefObject<((actionId: string) => Promise<void>) | null>;
  liveTypingWorkflowTimeoutRef: React.RefObject<number | null>;
  applyingTypingWorkflowRef: React.RefObject<boolean>;
  lastLiveWorkflowTextRef: React.RefObject<string>;
  stats: any;
  setStats: (stats: any) => void;
  currentFormat: any;
  setCurrentFormat: (format: any) => void;
  activeMenu: any;
  setActiveMenu: (menu: any) => void;
  openSidebarItem: any;
  setOpenSidebarItem: (item: any) => void;
  documentText: string;
  setDocumentText: (text: string) => void;
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;
  isCompact: boolean;
  typingSystemSettings: any;
  setTypingSystemSettings: (settings: any) => void;
  showPipelineMonitor: boolean;
  setShowPipelineMonitor: (show: boolean) => void;
  progressiveSurfaceState: any;
  setProgressiveSurfaceState: (state: any) => void;
  activeProjectTitle: any;
  setActiveProjectTitle: (title: any) => void;
  diagnosticEvents: EditorDiagnosticEvent[];
  setDiagnosticEvents: (events: EditorDiagnosticEvent[]) => void;
}

interface EditorEffectsDeps {
  recordDiagnostic: (title: string, message: string) => void;
  toast: any;
  logger: any;
}

export function useEditorEffects(state: EditorState, deps: EditorEffectsDeps) {
  const { recordDiagnostic, toast, logger } = deps;
  const { recordDiagnostic } = deps;

  // Editor lifecycle
  useEffect(() => {
    const mount = state.editorMountRef.current;
    if (!mount) return;

    const editorArea = new EditorArea({
      mount,
      onContentChange: (text) => state.setDocumentText(text),
      onStatsChange: (nextStats) => state.setStats(nextStats),
      onFormatChange: (format) => state.setCurrentFormat(format),
      onImportError: (message) => {
        recordDiagnostic("فشل تطبيق نظام الشك", message);
        toast({
          title: "فشل تطبيق نظام الشك",
          description: message,
          variant: "destructive",
        });
      },
      onProgressiveStateChange: (state) => state.setProgressiveSurfaceState(state),
    });
    state.editorAreaRef.current = editorArea;

    const snapshot = readAutosaveSnapshot();
    if (canRestoreAutosaveSnapshot(snapshot)) {
      void (applyAutosaveSnapshot(editorArea, snapshot) as Promise<void>)
        .then(() => state.setDocumentText(editorArea.getAllText()))
        .catch((error: unknown) => {
          recordDiagnostic(
            "فشل الاستعادة التلقائية",
            error instanceof Error
              ? error.message
              : "حدث خطأ غير معروف أثناء الاستعادة التلقائية."
          );
          logger.warn("Automatic autosave restore failed", {
            scope: "autosave",
            data: error,
          });
        });
    }

    return () => {
      editorArea.destroy();
      state.editorAreaRef.current = null;
    };
  }, [recordDiagnostic, state]);

  useEffect(
    () =>
      subscribeIsMobile((nextIsMobile) => {
        state.setIsMobile(nextIsMobile);
        if (nextIsMobile) state.setOpenSidebarItem(null);
      }),
    [state]
  );

  useEffect(() => {
    const syncActiveProjectTitle = () =>
      state.setActiveProjectTitle(readActiveProjectTitle());
    syncActiveProjectTitle();
    window.addEventListener("storage", syncActiveProjectTitle);
    window.addEventListener(
      "directors-studio:project-changed",
      syncActiveProjectTitle
    );
    window.addEventListener(
      "directors-editor:project-synced",
      syncActiveProjectTitle
    );
    return () => {
      window.removeEventListener("storage", syncActiveProjectTitle);
      window.removeEventListener(
        "directors-studio:project-changed",
        syncActiveProjectTitle
      );
      window.removeEventListener(
        "directors-editor:project-synced",
        syncActiveProjectTitle
      );
    };
  }, [state]);

  // Auto-save
  useEffect(() => {
    const area = state.editorAreaRef.current;
    if (!area) return;
    scheduleAutoSave<EditorAutosaveSnapshot>(
      "filmlane.autosave.document-text.v1",
      {
        html: area.getAllHtml(),
        text: area.getAllText(),
        updatedAt: new Date().toISOString(),
        version: 2,
      },
      1500
    );
  }, [state.documentText]);

  useEffect(() => {
    saveToStorage("filmlane.typing-system.settings", state.typingSystemSettings);
  }, [state.typingSystemSettings]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent): void => {
      if (
        (event.target as HTMLElement | null)?.closest(
          '[data-app-menu-root="true"]'
        )
      )
        return;
      state.setActiveMenu(null);
    };
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, [state]);

  // Design tokens
  useEffect(() => {
    applyDesignTokens();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = buildKeyHandler(
      state.editorAreaRef,
      state.setShowPipelineMonitor,
      () => state.handleMenuActionRef.current
    );
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [state]);

  // Live idle workflow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const liveIdleDelayMs = minutesToMilliseconds(
      state.typingSystemSettings.liveIdleMinutes
    );
    if (state.typingSystemSettings.typingSystemMode !== "auto-live") {
      if (state.liveTypingWorkflowTimeoutRef.current !== null) {
        window.clearTimeout(state.liveTypingWorkflowTimeoutRef.current);
        state.liveTypingWorkflowTimeoutRef.current = null;
      }
      return;
    }
    const normalizedText = state.documentText.trim();
    if (
      !normalizedText ||
      state.applyingTypingWorkflowRef.current ||
      state.progressiveSurfaceState?.activeRun?.surfaceLocked ||
      normalizedText === state.lastLiveWorkflowTextRef.current
    )
      return;
    if (state.liveTypingWorkflowTimeoutRef.current !== null)
      window.clearTimeout(state.liveTypingWorkflowTimeoutRef.current);
    state.liveTypingWorkflowTimeoutRef.current = window.setTimeout(() => {
      state.liveTypingWorkflowTimeoutRef.current = null;
      // void runDocumentThroughPasteWorkflow({
      //   source: "live-idle",
      //   reviewProfile: "silent-live",
      //   policyProfile: "strict-structure",
      //   suppressToasts: true,
      // });
    }, liveIdleDelayMs);
    return () => {
      if (state.liveTypingWorkflowTimeoutRef.current !== null) {
        window.clearTimeout(state.liveTypingWorkflowTimeoutRef.current);
        state.liveTypingWorkflowTimeoutRef.current = null;
      }
    };
  }, [
    state.documentText,
    state.progressiveSurfaceState?.activeRun?.surfaceLocked,
    // runDocumentThroughPasteWorkflow,
    state.typingSystemSettings,
  ]);
}
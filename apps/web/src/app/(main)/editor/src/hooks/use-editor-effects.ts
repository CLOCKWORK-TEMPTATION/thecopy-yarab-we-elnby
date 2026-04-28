/**
 * @file use-editor-effects.ts
 * @description Hook غلاف يشغّل كل side-effects الخاصة بـ App: دورة حياة
 *   EditorArea، اشتراكات النوافذ، autosave، design tokens، live workflow،
 *   اختصارات لوحة المفاتيح. كل أثر مفصول في hook صغير منفصل.
 */

import { useEffect } from "react";

import { EditorArea, type EditorCommand } from "../components/editor";
import {
  saveToStorage,
  scheduleAutoSave,
  subscribeIsMobile,
  toast as toastFn,
} from "../hooks";
import {
  AUTOSAVE_DRAFT_STORAGE_KEY,
  TYPING_SETTINGS_STORAGE_KEY,
  type EditorAutosaveSnapshot,
} from "../lib/app/constants";
import {
  computeLiveIdleDelayMs,
  type EditorAppRefs,
} from "../lib/app/handlers";
import {
  applyAutosaveSnapshot,
  applyDesignTokens,
  canRestoreAutosaveSnapshot,
  readActiveProjectTitle,
  readAutosaveSnapshot,
} from "../lib/app/utils";

import type { EditorAppStateValues } from "./use-editor-state";
import type { MenuActionId } from "../constants/menu-definitions";
import type { ElementType } from "../extensions/classification-types";
import type { RunDocumentThroughPasteWorkflowOptions } from "../types";
import type { logger as loggerFn } from "../utils/logger";

interface EditorEffectsDeps {
  recordDiagnostic: (title: string, message: string) => void;
  toast: typeof toastFn;
  logger: typeof loggerFn;
  runDocumentThroughPasteWorkflow: (
    options: RunDocumentThroughPasteWorkflowOptions
  ) => Promise<void>;
}

const SHORTCUT_FORMAT_BY_DIGIT_FALLBACK: Record<string, ElementType | null> =
  {};

const useEditorAreaLifecycle = (
  state: EditorAppStateValues,
  refs: EditorAppRefs,
  deps: EditorEffectsDeps
): void => {
  const {
    setStats,
    setCurrentFormat,
    setDocumentText,
    setProgressiveSurfaceState,
  } = state;
  const { editorMountRef, editorAreaRef } = refs;
  const { recordDiagnostic, toast, logger } = deps;

  useEffect(() => {
    const mount = editorMountRef.current;
    if (!mount) return;

    const editorArea = new EditorArea({
      mount,
      onContentChange: (text) => setDocumentText(text),
      onStatsChange: (nextStats) => setStats(nextStats),
      onFormatChange: (format) => setCurrentFormat(format),
      onImportError: (message) => {
        recordDiagnostic("فشل تطبيق نظام الشك", message);
        toast({
          title: "فشل تطبيق نظام الشك",
          description: message,
          variant: "destructive",
        });
      },
      onProgressiveStateChange: (next) => setProgressiveSurfaceState(next),
    });
    editorAreaRef.current = editorArea;

    const snapshot = readAutosaveSnapshot();
    if (canRestoreAutosaveSnapshot(snapshot)) {
      void applyAutosaveSnapshot(editorArea, snapshot)
        .then(() => {
          setDocumentText(editorArea.getAllText());
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "حدث خطأ غير معروف أثناء الاستعادة التلقائية.";
          recordDiagnostic("فشل الاستعادة التلقائية", message);
          logger.warn("Automatic autosave restore failed", {
            scope: "autosave",
            data: error,
          });
        });
    }

    return (): void => {
      editorArea.destroy();
      editorAreaRef.current = null;
    };
  }, [
    recordDiagnostic,
    editorMountRef,
    editorAreaRef,
    setStats,
    setCurrentFormat,
    setDocumentText,
    setProgressiveSurfaceState,
    toast,
    logger,
  ]);
};

const useIsMobileSubscription = (state: EditorAppStateValues): void => {
  const { setOpenSidebarItem } = state;
  useEffect(() => {
    return subscribeIsMobile((nextIsMobile) => {
      if (nextIsMobile) {
        setOpenSidebarItem(null);
      }
    });
  }, [setOpenSidebarItem]);
};

const useActiveProjectTitleSync = (state: EditorAppStateValues): void => {
  const { setActiveProjectTitle } = state;
  useEffect(() => {
    const syncActiveProjectTitle = (): void => {
      setActiveProjectTitle(readActiveProjectTitle());
    };

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

    return (): void => {
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
  }, [setActiveProjectTitle]);
};

const useCloseMenusOnOutsideClick = (state: EditorAppStateValues): void => {
  const { setActiveMenu } = state;
  useEffect(() => {
    const closeMenus = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-app-menu-root="true"]')) {
        return;
      }
      setActiveMenu(null);
    };
    document.addEventListener("click", closeMenus);
    return (): void => document.removeEventListener("click", closeMenus);
  }, [setActiveMenu]);
};

const useTypingSettingsPersistence = (state: EditorAppStateValues): void => {
  const { typingSystemSettings } = state;
  useEffect(() => {
    saveToStorage(TYPING_SETTINGS_STORAGE_KEY, typingSystemSettings);
  }, [typingSystemSettings]);
};

const useAutosaveDraftScheduler = (
  state: EditorAppStateValues,
  refs: EditorAppRefs
): void => {
  const { documentText } = state;
  const { editorAreaRef } = refs;
  useEffect(() => {
    const area = editorAreaRef.current;
    if (!area) return;

    scheduleAutoSave<EditorAutosaveSnapshot>(
      AUTOSAVE_DRAFT_STORAGE_KEY,
      {
        html: area.getAllHtml(),
        text: area.getAllText(),
        updatedAt: new Date().toISOString(),
        version: 2,
      },
      1500
    );
  }, [documentText, editorAreaRef]);
};

const useDesignTokensInit = (): void => {
  useEffect(() => {
    applyDesignTokens();
  }, []);
};

const useLiveTypingWorkflow = (
  state: EditorAppStateValues,
  refs: EditorAppRefs,
  runDocumentThroughPasteWorkflow: EditorEffectsDeps["runDocumentThroughPasteWorkflow"]
): void => {
  const { typingSystemSettings, documentText, progressiveSurfaceState } = state;
  const {
    liveTypingWorkflowTimeoutRef,
    applyingTypingWorkflowRef,
    lastLiveWorkflowTextRef,
  } = refs;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const liveIdleDelayMs = computeLiveIdleDelayMs(typingSystemSettings);
    if (typingSystemSettings.typingSystemMode !== "auto-live") {
      if (liveTypingWorkflowTimeoutRef.current !== null) {
        window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
        liveTypingWorkflowTimeoutRef.current = null;
      }
      return;
    }

    const normalizedText = documentText.trim();
    if (!normalizedText) return;
    if (applyingTypingWorkflowRef.current) return;
    if (progressiveSurfaceState?.activeRun?.surfaceLocked) return;
    if (normalizedText === lastLiveWorkflowTextRef.current) return;

    if (liveTypingWorkflowTimeoutRef.current !== null) {
      window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
    }

    liveTypingWorkflowTimeoutRef.current = window.setTimeout(() => {
      liveTypingWorkflowTimeoutRef.current = null;
      void runDocumentThroughPasteWorkflow({
        source: "live-idle",
        reviewProfile: "silent-live",
        policyProfile: "strict-structure",
        suppressToasts: true,
      });
    }, liveIdleDelayMs);

    return (): void => {
      if (liveTypingWorkflowTimeoutRef.current !== null) {
        window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
        liveTypingWorkflowTimeoutRef.current = null;
      }
    };
  }, [
    documentText,
    progressiveSurfaceState?.activeRun?.surfaceLocked,
    runDocumentThroughPasteWorkflow,
    typingSystemSettings,
    applyingTypingWorkflowRef,
    lastLiveWorkflowTextRef,
    liveTypingWorkflowTimeoutRef,
  ]);
};

interface ShortcutContext {
  area: EditorArea;
  isEditorFocused: boolean;
  dispatchAction: (id: MenuActionId) => Promise<void>;
}

const ACTION_SHORTCUT_KEYS: ReadonlySet<string> = new Set([
  "s",
  "o",
  "n",
  "c",
  "x",
  "v",
]);

const COMMAND_SHORTCUT_KEYS: ReadonlySet<string> = new Set([
  "z",
  "y",
  "b",
  "i",
  "u",
]);

const SHORTCUT_KEY_TO_ACTION: Record<string, MenuActionId> = {
  s: "save-file",
  o: "open-file",
  n: "new-file",
  c: "copy",
  x: "cut",
  v: "paste",
};

const SHORTCUT_KEY_TO_COMMAND: Record<string, EditorCommand | undefined> = {
  z: "undo",
  y: "redo",
  b: "bold",
  i: "italic",
  u: "underline",
};

const handleActionShortcut = (
  key: string,
  ctx: ShortcutContext,
  event: KeyboardEvent
): void => {
  const actionId = SHORTCUT_KEY_TO_ACTION[key];
  if (!actionId) return;

  if (key === "s" || key === "o" || key === "n") {
    event.preventDefault();
    void ctx.dispatchAction(actionId);
    return;
  }

  if (key === "v") {
    if (ctx.isEditorFocused) {
      event.preventDefault();
      void ctx.dispatchAction(actionId);
    }
    return;
  }

  if (ctx.isEditorFocused || ctx.area.hasSelection()) {
    event.preventDefault();
    void ctx.dispatchAction(actionId);
  }
};

const handleCommandShortcut = (
  key: string,
  ctx: ShortcutContext,
  event: KeyboardEvent
): void => {
  if (key === "a") {
    if (ctx.isEditorFocused) {
      event.preventDefault();
      ctx.area.runCommand({ command: "select-all" });
    }
    return;
  }

  const commandName = SHORTCUT_KEY_TO_COMMAND[key];
  if (!commandName) return;
  event.preventDefault();
  ctx.area.runCommand(commandName);
};

const computeIsEditorFocused = (
  area: EditorArea,
  event: KeyboardEvent
): boolean => {
  const targetElement = event.target as HTMLElement | null;
  const activeElement =
    typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)
      : null;
  return Boolean(
    targetElement?.closest(".ProseMirror") ??
    activeElement?.closest(".ProseMirror") ??
    targetElement?.isContentEditable ??
    activeElement?.isContentEditable ??
    area.editor.view.hasFocus()
  );
};

const useGlobalKeyboardShortcuts = (
  state: EditorAppStateValues,
  refs: EditorAppRefs,
  shortcutFormatByDigit: Record<string, ElementType | null>
): void => {
  const { setShowPipelineMonitor } = state;
  const { editorAreaRef, handleMenuActionRef } = refs;

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();

      if (event.shiftKey && key === "m") {
        event.preventDefault();
        setShowPipelineMonitor((prev) => !prev);
        return;
      }

      const area = editorAreaRef.current;
      if (!area) return;

      if (key in shortcutFormatByDigit) {
        event.preventDefault();
        const shortcutFormat = shortcutFormatByDigit[key];
        if (shortcutFormat) {
          area.setFormat(shortcutFormat);
        }
        return;
      }

      const ctx: ShortcutContext = {
        area,
        isEditorFocused: computeIsEditorFocused(area, event),
        dispatchAction: async (id) => {
          await handleMenuActionRef.current?.(id);
        },
      };

      if (ACTION_SHORTCUT_KEYS.has(key)) {
        handleActionShortcut(key, ctx, event);
        return;
      }

      if (key === "a" || COMMAND_SHORTCUT_KEYS.has(key)) {
        handleCommandShortcut(key, ctx, event);
      }
    };

    document.addEventListener("keydown", handleGlobalShortcut, true);
    return (): void =>
      document.removeEventListener("keydown", handleGlobalShortcut, true);
  }, [
    setShowPipelineMonitor,
    editorAreaRef,
    handleMenuActionRef,
    shortcutFormatByDigit,
  ]);
};

export const useEditorEffects = (
  state: EditorAppStateValues,
  refs: EditorAppRefs,
  deps: EditorEffectsDeps,
  shortcutFormatByDigit: Record<
    string,
    ElementType | null
  > = SHORTCUT_FORMAT_BY_DIGIT_FALLBACK
): void => {
  useEditorAreaLifecycle(state, refs, deps);
  useIsMobileSubscription(state);
  useActiveProjectTitleSync(state);
  useCloseMenusOnOutsideClick(state);
  useTypingSettingsPersistence(state);
  useAutosaveDraftScheduler(state, refs);
  useDesignTokensInit();
  useLiveTypingWorkflow(state, refs, deps.runDocumentThroughPasteWorkflow);
  useGlobalKeyboardShortcuts(state, refs, shortcutFormatByDigit);
};

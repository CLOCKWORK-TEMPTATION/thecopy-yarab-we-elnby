/**
 * @file use-app-controllers.ts
 * @description Hook يجمع كل refs و callbacks و memoized handlers الخاصة بـ App
 *   في كائن واحد. يبقي App.tsx غلافًا نحيفًا تحت سقف max-lines-per-function.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";

import { handleMenuAction, type EditorActionsDeps } from "../controllers";
import { toast, useMenuCommandResolver } from "../hooks";
import {
  approveCurrentVersion as approveVersion,
  createHandleLiveIdleMinutesChange,
  createHandleTypingModeChange,
  createRecordDiagnostic,
  dismissProgressiveFailure as dismissFailure,
  restoreAutosaveDraft as restoreDraft,
  runForcedProductionSelfCheck as runSelfCheck,
  runPasteWorkflow,
  type EditorAppRefs,
} from "../lib/app/handlers";
import { logger } from "../utils/logger";

import type { EditorAppStateValues } from "./use-editor-state";
import type { EditorArea } from "../components/editor";
import type { MenuActionId } from "../constants/menu-definitions";
import type {
  RunDocumentThroughPasteWorkflowOptions,
  TypingSystemSettings,
} from "../types";

export interface AppControllers {
  refs: EditorAppRefs;
  editorMountRef: { current: HTMLDivElement | null };
  editorAreaRef: { current: EditorArea | null };
  recordDiagnostic: (title: string, message: string) => void;
  handleTypingModeChange: (
    nextMode: TypingSystemSettings["typingSystemMode"]
  ) => void;
  handleLiveIdleMinutesChange: (nextMinutes: number) => void;
  runDocumentThroughPasteWorkflow: (
    options: RunDocumentThroughPasteWorkflowOptions
  ) => Promise<void>;
  runForcedProductionSelfCheck: (
    trigger: "manual-auto-check" | "manual-reclassify"
  ) => Promise<void>;
  restoreAutosaveDraft: () => Promise<void>;
  approveCurrentVersion: () => void;
  dismissProgressiveFailure: () => void;
  resolveMenuCommand: ReturnType<typeof useMenuCommandResolver>;
  actionDeps: EditorActionsDeps;
  dispatchMenuAction: (actionId: MenuActionId) => Promise<void>;
}

export const useAppControllers = (
  state: EditorAppStateValues
): AppControllers => {
  const editorMountRef = useRef<HTMLDivElement | null>(null);
  const editorAreaRef = useRef<EditorArea | null>(null);
  const liveTypingWorkflowTimeoutRef = useRef<number | null>(null);
  const applyingTypingWorkflowRef = useRef(false);
  const lastLiveWorkflowTextRef = useRef("");
  const handleMenuActionRef = useRef<
    ((actionId: MenuActionId) => Promise<void>) | null
  >(null);

  const refs = useMemo<EditorAppRefs>(
    () => ({
      editorMountRef,
      editorAreaRef,
      liveTypingWorkflowTimeoutRef,
      applyingTypingWorkflowRef,
      lastLiveWorkflowTextRef,
      handleMenuActionRef,
    }),
    []
  );
  const recordDiagnostic = useMemo(
    () => createRecordDiagnostic(state.setDiagnosticEvents),
    [state.setDiagnosticEvents]
  );
  const handleTypingModeChange = useCallback(
    (nextMode: TypingSystemSettings["typingSystemMode"]): void => {
      createHandleTypingModeChange(
        state.setTypingSystemSettings,
        liveTypingWorkflowTimeoutRef,
        logger
      )(nextMode);
    },
    [state.setTypingSystemSettings]
  );
  const handleLiveIdleMinutesChange = useCallback(
    (nextMinutes: number): void => {
      createHandleLiveIdleMinutesChange(state.setTypingSystemSettings)(
        nextMinutes
      );
    },
    [state.setTypingSystemSettings]
  );

  const runDocumentThroughPasteWorkflow = useCallback(
    async (opts: RunDocumentThroughPasteWorkflowOptions): Promise<void> =>
      runPasteWorkflow(refs, opts, { toast, logger, recordDiagnostic }),
    [refs, recordDiagnostic]
  );
  const runForcedProductionSelfCheck = useCallback(
    async (trigger: "manual-auto-check" | "manual-reclassify"): Promise<void> =>
      runSelfCheck(refs, trigger, { toast, logger, recordDiagnostic }),
    [refs, recordDiagnostic]
  );
  const restoreAutosaveDraft = useCallback(
    async (): Promise<void> =>
      restoreDraft(state, refs, { toast, recordDiagnostic, logger }),
    [state, refs, recordDiagnostic]
  );
  const approveCurrentVersion = useCallback(
    (): void => approveVersion(refs, { toast, recordDiagnostic }),
    [refs, recordDiagnostic]
  );
  const dismissProgressiveFailure = useCallback((): void => {
    if (!dismissFailure(refs)) return;
    toast({
      title: "تم إغلاق حالة الفشل",
      description: "حافظنا على آخر نسخة صالحة وأعدنا فتح السطح لتشغيل جديد.",
    });
  }, [refs]);
  const resolveMenuCommand = useMenuCommandResolver(editorAreaRef, toast);

  const actionDeps = useMemo<EditorActionsDeps>(
    () => ({
      getArea: () => editorAreaRef.current,
      toast,
      resolveMenuCommand,
      isProgressiveSurfaceLocked: () =>
        editorAreaRef.current?.isSurfaceLocked() ?? false,
      runDocumentThroughPasteWorkflow,
      runForcedProductionSelfCheck,
      restoreAutosaveDraft,
      recordDiagnostic,
    }),
    [
      resolveMenuCommand,
      runDocumentThroughPasteWorkflow,
      runForcedProductionSelfCheck,
      restoreAutosaveDraft,
      recordDiagnostic,
    ]
  );

  const dispatchMenuAction = useCallback(
    async (actionId: MenuActionId): Promise<void> => {
      state.setActiveMenu(null);
      await handleMenuAction(actionId, actionDeps);
    },
    [state, actionDeps]
  );

  useEffect(() => {
    handleMenuActionRef.current = dispatchMenuAction;
  }, [dispatchMenuAction]);

  return {
    refs,
    editorMountRef,
    editorAreaRef,
    recordDiagnostic,
    handleTypingModeChange,
    handleLiveIdleMinutesChange,
    runDocumentThroughPasteWorkflow,
    runForcedProductionSelfCheck,
    restoreAutosaveDraft,
    approveCurrentVersion,
    dismissProgressiveFailure,
    resolveMenuCommand,
    actionDeps,
    dispatchMenuAction,
  };
};

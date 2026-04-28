"use client";

/**
 * @file App.tsx
 * @description المكون الجذري لتطبيق أفان تيتر — محرر السيناريو العربي.
 */

import React, { useCallback } from "react";

import { DotBackground } from "@/components/ui/dot-background";

import {
  AppDock,
  AppFooter,
  AppHeader,
  AppSidebar,
  PipelineMonitor,
  SettingsPanel,
} from "./components/app-shell";
import { BackgroundGrid } from "./components/ui/BackgroundGrid";
import {
  handleMenuAction,
  handleSidebarItemAction,
  runExport,
  type EditorActionsDeps,
} from "./controllers";
import { toast, useMenuCommandResolver } from "./hooks";
import { useEditorEffects } from "./hooks/use-editor-effects";
import { useEditorState } from "./hooks/use-editor-state";
import {
  LOCKED_EDITOR_FONT_LABEL,
  LOCKED_EDITOR_SIZE_LABEL,
  SUPPORTED_LEGACY_FORMAT_COUNT,
  CLASSIFIER_OPTION_COUNT,
  ACTION_BLOCK_SPACING,
  getConstants,
} from "./lib/app/constants";
import {
  runPasteWorkflow,
  runForcedProductionSelfCheck as runSelfCheck,
  restoreAutosaveDraft as restoreDraft,
  approveCurrentVersion as approveVersion,
  dismissProgressiveFailure as dismissFailure,
  createRecordDiagnostic,
  createHandleTypingModeChange,
  createHandleLiveIdleMinutesChange,
} from "./lib/app/handlers";
import { type RunDocumentThroughPasteWorkflowOptions } from "./types";
import { resolveFileImportExtractEndpoint } from "./utils/backend-endpoints";
import { logger } from "./utils/logger";

import type { MenuActionId } from "./constants/menu-definitions";

export function App(): React.JSX.Element {
  const state = useEditorState();
  const recordDiagnostic = useCallback(
    createRecordDiagnostic(state.setDiagnosticEvents),
    [state.setDiagnosticEvents]
  );
  useEditorEffects(state, { recordDiagnostic, toast, logger });

  const handleTypingModeChange = createHandleTypingModeChange(
    state.setTypingSystemSettings,
    state.liveTypingWorkflowTimeoutRef,
    logger
  );

  const handleLiveIdleMinutesChange = createHandleLiveIdleMinutesChange(
    state.setTypingSystemSettings
  );

  const runDocumentThroughPasteWorkflow = useCallback(
    async (options: RunDocumentThroughPasteWorkflowOptions): Promise<void> => {
      await runPasteWorkflow(state, options, { toast, logger });
    },
    [state, toast, logger]
  );

  const runForcedProductionSelfCheck = useCallback(
    async (
      trigger: "manual-auto-check" | "manual-reclassify"
    ): Promise<void> => {
      await runSelfCheck(state, trigger, { toast, logger });
    },
    [state, toast, logger]
  );

  const restoreAutosaveDraft = useCallback(async (): Promise<void> => {
    await restoreDraft(state, { toast });
  }, [state, toast]);

  const approveCurrentVersion = useCallback((): void => {
    approveVersion(state, { toast });
  }, [state, toast]);

  const dismissProgressiveFailure = useCallback((): void => {
    dismissFailure(state);
    toast({
      title: "تم إغلاق حالة الفشل",
      description: "حافظنا على آخر نسخة صالحة وأعدنا فتح السطح لتشغيل جديد.",
    });
  }, [state]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = buildKeyHandler(
      editorAreaRef,
      setShowPipelineMonitor,
      () => handleMenuActionRef.current
    );
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);

  const resolveMenuCommand = useMenuCommandResolver(state.editorAreaRef, toast);
  const actionDeps: EditorActionsDeps = {
    getArea: () => state.editorAreaRef.current,
    toast,
    resolveMenuCommand,
    isProgressiveSurfaceLocked: () =>
      state.editorAreaRef.current?.isSurfaceLocked() ?? false,
    runDocumentThroughPasteWorkflow,
    runForcedProductionSelfCheck,
    restoreAutosaveDraft,
    recordDiagnostic,
  };
  const dispatchMenuAction = async (actionId: MenuActionId): Promise<void> => {
    state.setActiveMenu(null);
    await handleMenuAction(actionId, actionDeps);
  };
  state.handleMenuActionRef.current = dispatchMenuAction;

  const {
    FORMAT_LABEL_BY_TYPE,
    screenplayFormats,
    semanticColors,
    gradients,
    brandColors,
    MENU_SECTIONS,
    SIDEBAR_SECTIONS,
    DOCK_BUTTONS,
    EDITOR_CANVAS_TOP_OFFSET_PX,
    EDITOR_CANVAS_BOTTOM_OFFSET_PX,
    EDITOR_CANVAS_LEFT_GUTTER_PX,
    EDITOR_CANVAS_RIGHT_RESERVE_PX,
    EDITOR_CANVAS_WIDTH_PX,
    EDITOR_CANVAS_COMPACT_GUTTER_PX,
    EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX,
  } = getConstants();
  const currentFormatLabel = currentFormat
    ? (FORMAT_LABEL_BY_TYPE as Record<string, string>)[currentFormat]
    : "—";
  const fileImportBackendEndpoint = resolveFileImportExtractEndpoint();
  const hasFileImportBackend = fileImportBackendEndpoint.length > 0;

  return (
    <div
      className="editor-modern-floating app-root flex h-screen flex-col overflow-hidden font-['Cairo'] selection:bg-[color:var(--mf-accent)]/25"
      dir="rtl"
      data-testid="app-root"
    >
      <BackgroundGrid />
      <AppHeader
        menuSections={MENU_SECTIONS}
        activeMenu={state.activeMenu}
        onToggleMenu={(sectionLabel) =>
          state.setActiveMenu((prev) =>
            prev === sectionLabel ? null : sectionLabel
          )
        }
        activeProjectTitle={state.activeProjectTitle}
        progressiveSurfaceState={state.progressiveSurfaceState}
        onApproveVisibleVersion={() => void approveCurrentVersion()}
        onDismissFailure={dismissProgressiveFailure}
        onAction={(actionId) =>
          void dispatchMenuAction(actionId as MenuActionId)
        }
        infoDotColor={(semanticColors as { info: string }).info}
        brandGradient={(gradients as { jungle: string }).jungle}
        onlineDotColor={(brandColors as { jungleGreen: string }).jungleGreen}
      />
      <div
        className="app-main relative z-10 flex flex-1 overflow-hidden"
        suppressHydrationWarning
      >
        <div className="app-stage relative flex min-h-full min-w-0 flex-1">
          {!isCompact && (
            <AppSidebar
              sections={SIDEBAR_SECTIONS}
              openSectionId={state.openSidebarItem}
              isMobile={state.isMobile}
              documentText={state.documentText}
              onEditorSearchJump={(query) => {
                const area = state.editorAreaRef.current;
                if (!area) return;
                area.findAndFocus(query);
              }}
              onToggleSection={(sectionId) =>
                state.setOpenSidebarItem((prev) =>
                  prev === sectionId ? null : sectionId
                )
              }
              onItemAction={(sectionId, itemLabel) =>
                void handleSidebarItemAction(sectionId, itemLabel, actionDeps)
              }
              settingsPanel={
                <SettingsPanel
                  typingSystemSettings={state.typingSystemSettings}
                  onTypingModeChange={handleTypingModeChange}
                  onLiveIdleMinutesChange={handleLiveIdleMinutesChange}
                  onRunExportClassified={() =>
                    void runExport("classified", actionDeps, "النص_المصنف")
                  }
                  onRunProcessNow={() =>
                    void runDocumentThroughPasteWorkflow({
                      source: "manual-deferred",
                      reviewProfile: "interactive",
                      policyProfile: "strict-structure",
                    })
                  }
                  lockedEditorFontLabel={LOCKED_EDITOR_FONT_LABEL}
                  lockedEditorSizeLabel={LOCKED_EDITOR_SIZE_LABEL}
                  supportedLegacyFormatCount={SUPPORTED_LEGACY_FORMAT_COUNT}
                  classifierOptionCount={CLASSIFIER_OPTION_COUNT}
                  actionBlockSpacing={ACTION_BLOCK_SPACING}
                  hasFileImportBackend={hasFileImportBackend}
                />
              }
            />
          )}
          <main className="app-editor-main relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppDock
              buttons={DOCK_BUTTONS}
              isMobile={state.isMobile}
              isCompact={state.isCompact}
              onAction={(actionId) =>
                void dispatchMenuAction(actionId as MenuActionId)
              }
            />
            <div
              role="button"
              tabIndex={0}
              className="app-editor-scroll scrollbar-none relative flex flex-1 justify-center overflow-x-hidden overflow-y-auto"
              style={{
                paddingTop: `${EDITOR_CANVAS_TOP_OFFSET_PX}px`,
                paddingRight: `${isCompact ? EDITOR_CANVAS_COMPACT_GUTTER_PX : EDITOR_CANVAS_RIGHT_RESERVE_PX}px`,
                paddingLeft: `${isCompact ? EDITOR_CANVAS_COMPACT_GUTTER_PX : EDITOR_CANVAS_LEFT_GUTTER_PX}px`,
                paddingBottom: `${EDITOR_CANVAS_BOTTOM_OFFSET_PX}px`,
              }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest(".ProseMirror")) return;
                state.editorAreaRef.current?.focusEditor();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const target = e.target as HTMLElement;
                  if (target.closest(".ProseMirror")) return;
                  state.editorAreaRef.current?.focusEditor();
                }
              }}
              style={{
                paddingTop: `${EDITOR_CANVAS_TOP_OFFSET_PX}px`,
                paddingRight: `${state.isCompact ? EDITOR_CANVAS_COMPACT_GUTTER_PX : EDITOR_CANVAS_RIGHT_RESERVE_PX}px`,
                paddingLeft: `${state.isCompact ? EDITOR_CANVAS_COMPACT_GUTTER_PX : EDITOR_CANVAS_LEFT_GUTTER_PX}px`,
                paddingBottom: `${EDITOR_CANVAS_BOTTOM_OFFSET_PX}px`,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const target = e.target as HTMLElement;
                  if (target.closest(".ProseMirror")) return;
                  editorAreaRef.current?.focusEditor();
                }
              }}
            >
              <DotBackground />
              <div
                className="app-editor-shell relative mx-auto w-full pb-20"
                style={{
                  maxWidth: `${state.isCompact ? EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX : EDITOR_CANVAS_WIDTH_PX}px`,
                  minWidth: `${state.isCompact ? EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX : EDITOR_CANVAS_WIDTH_PX}px`,
                }}
              >
                <div
                  ref={state.editorMountRef}
                  className="editor-area app-editor-host"
                  data-testid="editor-area"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
      <AppFooter
        stats={state.stats}
        currentFormatLabel={currentFormatLabel}
        isMobile={state.isMobile}
      />
      <PipelineMonitor
        visible={state.showPipelineMonitor}
        progressiveSurfaceState={state.progressiveSurfaceState}
        onDismissFailure={dismissProgressiveFailure}
        onClose={() => state.setShowPipelineMonitor(false)}
      />
      {state.diagnosticEvents.length > 0 ? (
        <aside
          className="editor-diagnostics-log fixed right-4 bottom-20 z-50 w-[min(92vw,420px)] rounded-2xl border border-red-500/25 bg-red-950/85 p-3 text-right text-red-50 shadow-2xl backdrop-blur-xl"
          data-testid="editor-diagnostics-log"
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 text-xs font-bold">سجل تشخيص المحرر</div>
          <div className="space-y-2">
            {state.diagnosticEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <div className="text-xs font-bold">{event.title}</div>
                <div className="mt-1 text-[11px] leading-5 text-red-100/85">
                  {event.message}
                </div>
              </div>
            ))}
          </div>
        </aside>
      ) : null}
      <div className="sr-only">
        {(screenplayFormats as { id: string; label: string }[]).map(
          (format) => (
            <span key={format.id}>{format.label}</span>
          )
        )}
      </div>
    </div>
  );
}

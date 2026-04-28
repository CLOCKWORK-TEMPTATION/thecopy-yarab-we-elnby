/**
 * @file EditorAppLayout.tsx
 * @description كل JSX الخاص بالشل العلوي للتطبيق مفصول عن App.tsx ليبقى الأخير
 *   تحت سقف max-lines-per-function. يتلقى كل ما يحتاج عبر props.
 */

import React from "react";

import { DotBackground } from "@/components/ui/dot-background";

import { handleSidebarItemAction, runExport } from "../../controllers";
import { BackgroundGrid } from "../ui/BackgroundGrid";

import {
  AppDock,
  AppFooter,
  AppHeader,
  AppSidebar,
  PipelineMonitor,
  SettingsPanel,
} from "./index";

import type { MenuActionId } from "../../constants/menu-definitions";
import type { AppControllers } from "../../hooks/use-app-controllers";
import type { EditorAppStateValues } from "../../hooks/use-editor-state";
import type { EditorAppConstants } from "../../lib/app/constants";

export interface EditorAppLayoutProps {
  state: EditorAppStateValues;
  controllers: AppControllers;
  constants: EditorAppConstants;
  uiSettings: {
    lockedEditorFontLabel: string;
    lockedEditorSizeLabel: string;
    supportedLegacyFormatCount: number;
    classifierOptionCount: number;
    actionBlockSpacing: string;
    hasFileImportBackend: boolean;
  };
  currentFormatLabel: string;
}

interface EditorCanvasProps {
  isCompact: boolean;
  constants: EditorAppConstants;
  controllers: AppControllers;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  isCompact,
  constants,
  controllers,
}) => {
  const { editorMountRef, editorAreaRef } = controllers;
  const {
    EDITOR_CANVAS_TOP_OFFSET_PX,
    EDITOR_CANVAS_BOTTOM_OFFSET_PX,
    EDITOR_CANVAS_LEFT_GUTTER_PX,
    EDITOR_CANVAS_RIGHT_RESERVE_PX,
    EDITOR_CANVAS_WIDTH_PX,
    EDITOR_CANVAS_COMPACT_GUTTER_PX,
    EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX,
  } = constants;

  return (
    <div
      role="button"
      tabIndex={0}
      className="app-editor-scroll scrollbar-none relative flex flex-1 justify-center overflow-x-hidden overflow-y-auto"
      style={{
        paddingTop: `${String(EDITOR_CANVAS_TOP_OFFSET_PX)}px`,
        paddingRight: `${String(
          isCompact
            ? EDITOR_CANVAS_COMPACT_GUTTER_PX
            : EDITOR_CANVAS_RIGHT_RESERVE_PX
        )}px`,
        paddingLeft: `${String(
          isCompact
            ? EDITOR_CANVAS_COMPACT_GUTTER_PX
            : EDITOR_CANVAS_LEFT_GUTTER_PX
        )}px`,
        paddingBottom: `${String(EDITOR_CANVAS_BOTTOM_OFFSET_PX)}px`,
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".ProseMirror")) return;
        editorAreaRef.current?.focusEditor();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const target = e.target as HTMLElement;
        if (target.closest(".ProseMirror")) return;
        editorAreaRef.current?.focusEditor();
      }}
    >
      <DotBackground />
      <div
        className="app-editor-shell relative mx-auto w-full pb-20"
        style={{
          maxWidth: `${String(
            isCompact
              ? EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX
              : EDITOR_CANVAS_WIDTH_PX
          )}px`,
          minWidth: `${String(
            isCompact
              ? EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX
              : EDITOR_CANVAS_WIDTH_PX
          )}px`,
        }}
      >
        <div
          ref={editorMountRef}
          className="editor-area app-editor-host"
          data-testid="editor-area"
        />
      </div>
    </div>
  );
};

const EditorSidebarPanel: React.FC<EditorAppLayoutProps> = ({
  state,
  controllers,
  constants,
  uiSettings,
}) => (
  <AppSidebar
    sections={constants.SIDEBAR_SECTIONS}
    openSectionId={state.openSidebarItem}
    isMobile={state.isMobile}
    documentText={state.documentText}
    onEditorSearchJump={(query) =>
      controllers.editorAreaRef.current?.findAndFocus(query)
    }
    onToggleSection={(sectionId) =>
      state.setOpenSidebarItem((prev) =>
        prev === sectionId ? null : sectionId
      )
    }
    onItemAction={(sectionId, itemLabel) => {
      void handleSidebarItemAction(
        sectionId,
        itemLabel,
        controllers.actionDeps
      );
    }}
    settingsPanel={
      <SettingsPanel
        typingSystemSettings={state.typingSystemSettings}
        onTypingModeChange={controllers.handleTypingModeChange}
        onLiveIdleMinutesChange={controllers.handleLiveIdleMinutesChange}
        onRunExportClassified={() => {
          void runExport("classified", controllers.actionDeps, "النص_المصنف");
        }}
        onRunProcessNow={() => {
          void controllers.runDocumentThroughPasteWorkflow({
            source: "manual-deferred",
            reviewProfile: "interactive",
            policyProfile: "strict-structure",
          });
        }}
        lockedEditorFontLabel={uiSettings.lockedEditorFontLabel}
        lockedEditorSizeLabel={uiSettings.lockedEditorSizeLabel}
        supportedLegacyFormatCount={uiSettings.supportedLegacyFormatCount}
        classifierOptionCount={uiSettings.classifierOptionCount}
        actionBlockSpacing={uiSettings.actionBlockSpacing}
        hasFileImportBackend={uiSettings.hasFileImportBackend}
      />
    }
  />
);

const EditorMainArea: React.FC<EditorAppLayoutProps> = (props) => {
  const { state, controllers, constants } = props;
  const { isCompact, isMobile } = state;
  return (
    <div className="app-stage relative flex min-h-full min-w-0 flex-1">
      {!isCompact && <EditorSidebarPanel {...props} />}
      <main className="app-editor-main relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppDock
          buttons={constants.DOCK_BUTTONS}
          isMobile={isMobile}
          isCompact={isCompact}
          onAction={(actionId) => {
            void controllers.dispatchMenuAction(actionId as MenuActionId);
          }}
        />
        <EditorCanvas
          isCompact={isCompact}
          constants={constants}
          controllers={controllers}
        />
      </main>
    </div>
  );
};

const EditorDiagnosticsAside: React.FC<{
  events: EditorAppStateValues["diagnosticEvents"];
}> = ({ events }) => {
  if (events.length === 0) return null;
  return (
    <aside
      className="editor-diagnostics-log fixed right-4 bottom-20 z-50 w-[min(92vw,420px)] rounded-2xl border border-red-500/25 bg-red-950/85 p-3 text-right text-red-50 shadow-2xl backdrop-blur-xl"
      data-testid="editor-diagnostics-log"
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 text-xs font-bold">سجل تشخيص المحرر</div>
      <div className="space-y-2">
        {events.map((event) => (
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
  );
};

export const EditorAppLayout: React.FC<EditorAppLayoutProps> = (props) => {
  const { state, controllers, constants, currentFormatLabel } = props;
  const { semanticColors, gradients, brandColors, MENU_SECTIONS } = constants;

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
        onApproveVisibleVersion={controllers.approveCurrentVersion}
        onDismissFailure={controllers.dismissProgressiveFailure}
        onAction={(actionId) => {
          void controllers.dispatchMenuAction(actionId as MenuActionId);
        }}
        infoDotColor={semanticColors.info}
        brandGradient={gradients.jungle}
        onlineDotColor={brandColors.jungleGreen}
      />
      <div
        className="app-main relative z-10 flex flex-1 overflow-hidden"
        suppressHydrationWarning
      >
        <EditorMainArea {...props} />
      </div>
      <AppFooter
        stats={state.stats}
        currentFormatLabel={currentFormatLabel}
        isMobile={state.isMobile}
      />
      <PipelineMonitor
        visible={state.showPipelineMonitor}
        progressiveSurfaceState={state.progressiveSurfaceState}
        onDismissFailure={controllers.dismissProgressiveFailure}
        onClose={() => state.setShowPipelineMonitor(false)}
      />
      <EditorDiagnosticsAside events={state.diagnosticEvents} />
      <div className="sr-only">
        {constants.screenplayFormats.map((format) => (
          <span key={format.id}>{format.label}</span>
        ))}
      </div>
    </div>
  );
};

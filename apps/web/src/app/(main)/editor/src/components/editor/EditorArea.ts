import { definedProps } from "@/lib/defined-props";
import {
  computeTaggedScenarioSourceHash,
  createTaggedScenarioSnapshot,
  persistTaggedScenarioSnapshot,
} from "@/lib/tagged-scenario-snapshot";

import { createScreenplayEditor } from "../../editor";
import {
  applyPasteClassifierFlowToView,
  PASTE_CLASSIFIER_ERROR_EVENT,
} from "../../extensions/paste-classifier";
import { pipelineRecorder } from "../../extensions/pipeline-recorder";
import { maybeReconstructUnstructured } from "../../pipeline/unstructured";
import { CharacterWidowFixer } from "../../utils/character-widow-fix";
import {
  copyToClipboard,
  cutToClipboard,
  pasteFromClipboard,
} from "../../utils/editor-clipboard";
import { EditorPageModel } from "../../utils/editor-page-model";
import {
  htmlToScreenplayBlocks,
  type ScreenplayBlock,
} from "../../utils/file-import";
import { logger } from "../../utils/logger";

import { buildEditorMount } from "./editor-area-dom-setup";
import { captureTaggedScenarioElements } from "./editor-area-element-capture";
import {
  runEditorCommand,
  setEditorFormat,
  getEditorCurrentFormat,
  getEditorCurrentFormatLabel,
  findTextInEditor,
  countTextOccurrences,
  extractPasteClassifierErrorMessage,
  computeDocumentStats,
} from "./editor-area-format-utils";
import { ProgressiveSurfaceManager } from "./editor-area-progressive-manager";

import type {
  DocumentStats,
  EditorAreaProps,
  EditorCommand,
  EditorHandle,
  FileImportMode,
  ImportClassificationContext,
  ProgressiveSurfaceState,
  TaggedScenarioApprovalContext,
} from "./editor-area.types";
import type { ElementType } from "../../extensions/classification-types";
import type {
  ClipboardOrigin,
  EditorClipboardOperationResult,
} from "../../types/editor-clipboard";
import type { RunEditorCommandOptions } from "../../types/editor-engine";
import type { ReceptionSourceType } from "../../types/unified-reception";

const normalizeOptionalScenarioId = (
  value: string | undefined
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized;
};

/**
 * @description المكون الرئيسي لمنطقة تحرير السيناريو.
 * يُفوِّض إدارة السطح التدريجي إلى ProgressiveSurfaceManager
 * وعمليات التنسيق إلى editor-area-format-utils.
 */
export class EditorArea implements EditorHandle {
  readonly editor;

  private readonly props: EditorAreaProps;
  private readonly body: HTMLDivElement;
  private readonly hasPagesExtension: boolean;
  private readonly characterWidowFixer = new CharacterWidowFixer();
  private readonly pageModel: EditorPageModel;
  private readonly progressiveManager: ProgressiveSurfaceManager;
  private hasRequestedProductionSelfCheck = false;
  private removePipelineSubscription: (() => void) | null = null;

  constructor(props: EditorAreaProps) {
    this.props = props;
    this.body = buildEditorMount(props.mount);
    this.editor = createScreenplayEditor(this.body);

    this.hasPagesExtension = this.editor.extensionManager.extensions.some(
      (extension) => extension.name === "pages"
    );

    this.pageModel = new EditorPageModel(
      this.editor,
      this.body,
      this.hasPagesExtension,
      () => {
        this.scheduleCharacterWidowFix();
        this.emitState();
      }
    );

    this.progressiveManager = new ProgressiveSurfaceManager(
      this.editor,
      this.body,
      definedProps({
        onProgressiveStateChange: props.onProgressiveStateChange,
      })
    );

    this.editor.on("update", this.handleEditorUpdate);
    this.editor.on("selectionUpdate", this.handleSelectionUpdate);
    this.editor.on("transaction", this.handleSelectionUpdate);
    this.body.addEventListener("keydown", this.handleEditorClipboardShortcut, {
      capture: true,
    });
    if (typeof window !== "undefined") {
      window.addEventListener(
        PASTE_CLASSIFIER_ERROR_EVENT,
        this.handlePasteClassifierError
      );
    }
    this.removePipelineSubscription = pipelineRecorder.subscribe(
      this.progressiveManager.handlePipelineEvent
    );

    this.pageModel.bindObservers();
    this.pageModel.refreshPageModel(true);
    this.emitState();
    this.progressiveManager.applySurfaceLock(false);

    if (process.env.NODE_ENV === "development") {
      void import("../../extensions/pipeline-diagnostics").then(
        ({ registerPipelineDiagnostics }) => {
          registerPipelineDiagnostics(() => this.getAllText());
        }
      );
    }
  }

  // ============================================
  // قراءة المحتوى
  // ============================================

  getAllText = (): string => this.editor.getText();

  getAllHtml = (): string => this.editor.getHTML();

  focusEditor = (): void => {
    this.editor.commands.focus("end");
  };

  // ============================================
  // تفويض للـ format-utils
  // ============================================

  findAndFocus = (query: string): boolean =>
    findTextInEditor(this.editor, query);

  countTextMatches = (query: string): number =>
    countTextOccurrences(this.getAllText(), query);

  runCommand = (
    commandInput: EditorCommand | RunEditorCommandOptions
  ): boolean => runEditorCommand(this.editor, commandInput);

  setFormat = (format: ElementType): boolean =>
    setEditorFormat(this.editor, format);

  getCurrentFormat = (): ElementType | null =>
    getEditorCurrentFormat(this.editor);

  getCurrentFormatLabel = (): string =>
    getEditorCurrentFormatLabel(this.editor);

  // ============================================
  // تفويض للـ ProgressiveSurfaceManager
  // ============================================

  isSurfaceLocked = (): boolean => this.progressiveManager.isSurfaceLocked();

  getProgressiveSurfaceState = (): ProgressiveSurfaceState | null =>
    this.progressiveManager.getState();

  beginProgressivePreparation = (params: {
    intakeKind: "file-open" | "paste";
    sourceType: ReceptionSourceType;
    fileName?: string | null;
  }): void => {
    this.progressiveManager.beginProgressivePreparation(params);
  };

  cancelProgressivePreparation = (): void => {
    this.progressiveManager.cancelProgressivePreparation();
  };

  approveCurrentVersion = async (
    context?: TaggedScenarioApprovalContext
  ): Promise<void> => {
    const approvedVersion = this.progressiveManager.approveCurrentVersion();
    const sourceText = approvedVersion.text;
    const sourceHash = computeTaggedScenarioSourceHash(sourceText);
    const scenarioId =
      normalizeOptionalScenarioId(context?.scenarioId) ??
      `editor-draft-${sourceHash.replace("fnv1a:", "")}`;

    const snapshot = createTaggedScenarioSnapshot({
      scenarioId,
      ...(context?.scenarioTitle !== undefined
        ? { title: context.scenarioTitle }
        : {}),
      source: "editor-approved",
      sourceText,
      approvedAt: approvedVersion.createdAt,
      approvedVersionId: approvedVersion.visibleVersionId,
      elements: captureTaggedScenarioElements(
        this.editor,
        approvedVersion.runId,
        approvedVersion.visibleVersionId
      ),
    });

    await persistTaggedScenarioSnapshot(snapshot);
  };

  dismissProgressiveFailure = (): boolean =>
    this.progressiveManager.dismissProgressiveFailure();

  // ============================================
  // عمليات المحتوى
  // ============================================

  clear = (): void => {
    if (this.isSurfaceLocked()) return;
    this.progressiveManager.resetState();
    this.editor.commands.setContent('<div data-type="action"></div>');
    this.editor.commands.focus("start");
    this.pageModel.refreshPageModel(true);
    this.emitState();
    this.props.onContentChange?.(this.getAllText());
    this.progressiveManager.emitCurrentState();
  };

  importClassifiedText = async (
    text: string,
    mode: FileImportMode = "replace",
    context?: ImportClassificationContext
  ): Promise<void> => {
    this.checkSurfaceLockForImport();

    this.editor.commands.focus(mode === "replace" ? "start" : "end");

    const { resolvedText, resolvedContext } = this.resolveUnstructured(
      text,
      context
    );

    const applied = await this.applyClassifierFlow(
      resolvedText,
      mode,
      resolvedContext
    );
    if (!applied) return;

    this.editor.commands.focus(mode === "replace" ? "start" : "end");
    this.pageModel.refreshPageModel(true);
    this.scheduleCharacterWidowFix();
    this.emitState();
    this.requestProductionSelfCheck();

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        this.pageModel.refreshPageModel(true);
        this.scheduleCharacterWidowFix();
        this.emitState();
      });
    }
  };

  importStructuredBlocks = async (
    blocks: ScreenplayBlock[],
    mode: FileImportMode = "replace"
  ): Promise<void> => {
    this.checkSurfaceLockForImport();

    if (!blocks || blocks.length === 0) return;

    const sourceText = blocks
      .map((block) => (block.text ?? "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!sourceText) return;

    await this.importClassifiedText(sourceText, mode, {
      structuredHints: blocks,
    });
  };

  getBlocks = (): ScreenplayBlock[] =>
    htmlToScreenplayBlocks(this.getAllHtml());

  hasSelection = (): boolean => !this.editor.state.selection.empty;

  copySelectionToClipboard =
    async (): Promise<EditorClipboardOperationResult> => {
      const selectionOnly = this.hasSelection();
      return copyToClipboard(this.editor, selectionOnly);
    };

  cutSelectionToClipboard =
    async (): Promise<EditorClipboardOperationResult> => {
      return cutToClipboard(this.editor);
    };

  pasteFromClipboard = async (
    origin: ClipboardOrigin
  ): Promise<EditorClipboardOperationResult> => {
    if (this.isSurfaceLocked()) {
      throw new Error(
        "لا يمكن بدء لصق جديد قبل استقرار النسخة الحالية أو تنفيذ استرداد صريح بعد الفشل."
      );
    }

    return pasteFromClipboard(
      origin,
      (
        text: string,
        mode: "insert",
        context?: { classificationProfile?: "paste" | "generic-open" }
      ) => this.importClassifiedText(text, mode, context),
      (blocks: ScreenplayBlock[], mode: "insert") =>
        this.importStructuredBlocks(blocks, mode)
    );
  };

  // ============================================
  // التدمير
  // ============================================

  destroy(): void {
    this.editor.off("update", this.handleEditorUpdate);
    this.editor.off("selectionUpdate", this.handleSelectionUpdate);
    this.editor.off("transaction", this.handleSelectionUpdate);
    this.body.removeEventListener(
      "keydown",
      this.handleEditorClipboardShortcut,
      { capture: true }
    );
    if (typeof window !== "undefined") {
      window.removeEventListener(
        PASTE_CLASSIFIER_ERROR_EVENT,
        this.handlePasteClassifierError
      );
    }
    this.characterWidowFixer.cancel();
    this.pageModel.disconnectObservers();
    this.removePipelineSubscription?.();
    this.removePipelineSubscription = null;
    this.editor.destroy();
  }

  // ============================================
  // المعالجات الداخلية
  // ============================================

  private readonly handleEditorUpdate = (): void => {
    this.pageModel.refreshPageModel();
    this.scheduleCharacterWidowFix();
    this.emitState();
    this.props.onContentChange?.(this.getAllText());
  };

  private readonly handleSelectionUpdate = (): void => {
    const current = this.getCurrentFormat();
    this.props.onFormatChange?.(current);
  };

  private readonly handleEditorClipboardShortcut = (
    event: KeyboardEvent
  ): void => {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key !== "a" && key !== "c" && key !== "x" && key !== "v") return;

    event.preventDefault();
    event.stopPropagation();

    if (key === "a") {
      this.runCommand({ command: "select-all" });
      return;
    }

    if (key === "c") {
      void this.copySelectionToClipboard().then((result) => {
        if (!result.ok) this.props.onImportError?.(result.message);
      });
      return;
    }

    if (key === "x") {
      void this.cutSelectionToClipboard().then((result) => {
        if (!result.ok) this.props.onImportError?.(result.message);
      });
      return;
    }

    void this.pastePlainTextFromKeyboard().catch((error: unknown) => {
      this.props.onImportError?.(
        error instanceof Error
          ? error.message
          : "فشل الوصول إلى الحافظة من اختصار لوحة المفاتيح."
      );
    });
  };

  private readonly pastePlainTextFromKeyboard = async (): Promise<void> => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      throw new Error("واجهة القراءة من الحافظة غير متاحة.");
    }

    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      throw new Error("لا يوجد نص قابل للصق في الحافظة.");
    }

    const inserted = this.editor.chain().focus().insertContent(text).run();
    if (!inserted) {
      throw new Error("تعذر إدراج النص من اختصار لوحة المفاتيح.");
    }

    this.pageModel.refreshPageModel(true);
    this.scheduleCharacterWidowFix();
    this.emitState();
    this.props.onContentChange?.(this.getAllText());
  };

  private readonly handlePasteClassifierError = (event: Event): void => {
    const message = extractPasteClassifierErrorMessage(event);
    this.props.onImportError?.(message);
  };

  // ============================================
  // الدوال المساعدة الخاصة
  // ============================================

  private checkSurfaceLockForImport(): void {
    const activeRun = this.progressiveManager.getState()?.activeRun;
    const isPreparationLock =
      activeRun?.status === "started" &&
      !activeRun.currentVisibleVersionId &&
      !this.progressiveManager.getState()?.visibleVersion;

    if (this.isSurfaceLocked() && !isPreparationLock) {
      throw new Error(
        "لا يمكن بدء تشغيل جديد قبل استقرار النسخة الحالية أو تنفيذ استرداد صريح بعد الفشل."
      );
    }
  }

  private resolveUnstructured(
    text: string,
    context: ImportClassificationContext | undefined
  ): {
    resolvedText: string;
    resolvedContext: ImportClassificationContext | undefined;
  } {
    const skipUnstructured =
      context?.classificationProfile === "paste" ||
      ((context?.structuredHints && context.structuredHints.length > 0) ??
        false) ||
      ((context?.schemaElements && context.schemaElements.length > 0) ??
        false) ||
      context?.sourceFileType === "doc" ||
      context?.sourceFileType === "docx";

    if (skipUnstructured) {
      return { resolvedText: text, resolvedContext: context };
    }

    const unstructured = maybeReconstructUnstructured(text, {
      threshold: 0.7,
      replaceBullets: true,
    });

    if (!unstructured.applied) {
      return { resolvedText: text, resolvedContext: context };
    }

    const existingHints = context?.structuredHints ?? [];
    const mergedHints = unstructured.structuredBlocks.concat(existingHints);
    return {
      resolvedText: unstructured.structuredText,
      resolvedContext: { ...(context ?? {}), structuredHints: mergedHints },
    };
  }

  private async applyClassifierFlow(
    text: string,
    mode: FileImportMode,
    context: ImportClassificationContext | undefined
  ): Promise<boolean> {
    const state = this.editor.view.state;
    const replaceAllFrom = 0;
    const replaceAllTo = state.doc.content.size;
    const from = mode === "replace" ? replaceAllFrom : state.selection.from;
    const to = mode === "replace" ? replaceAllTo : state.selection.to;

    return applyPasteClassifierFlowToView(
      this.editor.view,
      text,
      definedProps({
        from,
        to,
        classificationProfile: context?.classificationProfile,
        sourceFileType: context?.sourceFileType,
        sourceMethod: context?.sourceMethod,
        structuredHints: context?.structuredHints,
        schemaElements: context?.schemaElements,
        rawExtractedText: context?.rawExtractedText,
        fileName: context?.fileName,
        firstVisibleSourceKind: context?.firstVisibleSourceKind,
      })
    );
  }

  private requestProductionSelfCheck(): void {
    if (this.hasRequestedProductionSelfCheck) return;
    this.hasRequestedProductionSelfCheck = true;

    void import("../../extensions/production-self-check")
      .then(({ runProductionSelfCheck }) =>
        runProductionSelfCheck({ trigger: "editor-import", force: false })
      )
      .catch((error) => {
        logger.warn("Production self-check failed during editor import path", {
          scope: "editor-area",
          data: error,
        });
      });
  }

  private scheduleCharacterWidowFix(): void {
    this.characterWidowFixer.schedule(this.editor);
  }

  private emitState(): void {
    const text = this.getAllText();
    const html = this.getAllHtml();
    const stats: DocumentStats = computeDocumentStats(
      text,
      html,
      this.pageModel.estimatedPagesCount
    );
    this.props.onStatsChange?.(stats);
    this.props.onFormatChange?.(this.getCurrentFormat());
  }
}

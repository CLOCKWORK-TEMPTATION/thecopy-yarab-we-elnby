import { definedProps } from "@/lib/defined-props";
import type { Node as PmNode } from "@tiptap/pm/model";
import { createScreenplayEditor, SCREENPLAY_ELEMENTS } from "../../editor";
import {
  applyPasteClassifierFlowToView,
  PASTE_CLASSIFIER_ERROR_EVENT,
} from "../../extensions/paste-classifier";
import {
  isElementType,
  type ElementType,
} from "../../extensions/classification-types";
import {
  pipelineRecorder,
  type PipelineEvent,
} from "../../extensions/pipeline-recorder";
import {
  htmlToScreenplayBlocks,
  type ScreenplayBlock,
} from "../../utils/file-import";
import { maybeReconstructUnstructured } from "../../pipeline/unstructured";
import { type ClipboardOrigin } from "../../types/editor-clipboard";
import type { RunEditorCommandOptions } from "../../types/editor-engine";
import type {
  DocumentStats,
  EditorAreaProps,
  EditorCommand,
  EditorHandle,
  FileImportMode,
  ImportClassificationContext,
  ProgressiveSurfaceState,
} from "./editor-area.types";
import { logger } from "../../utils/logger";
import {
  copyToClipboard,
  cutToClipboard,
  pasteFromClipboard,
} from "../../utils/editor-clipboard";
import { CharacterWidowFixer } from "../../utils/character-widow-fix";
import {
  applyLayoutMetrics,
  applyEditorTypography,
} from "../../utils/editor-layout";
import { EditorPageModel } from "../../utils/editor-page-model";
import type {
  FailureRecoveryAction,
  ProgressiveElement,
  ProgressiveReviewRun,
  ProgressiveRunStatus,
  ReceptionSourceType,
  VisibleVersion,
  VisibleVersionStage,
} from "../../types/unified-reception";

const commandNameByFormat: Record<ElementType, string> = {
  action: "setAction",
  dialogue: "setDialogue",
  character: "setCharacter",
  scene_header_1: "setSceneHeaderTopLine",
  scene_header_2: "setSceneHeaderTopLine",
  scene_header_3: "setSceneHeader3",
  scene_header_top_line: "setSceneHeaderTopLine",
  transition: "setTransition",
  parenthetical: "setParenthetical",
  basmala: "setBasmala",
};

const formatLabelByType: Record<ElementType, string> = {
  action: "حدث / وصف",
  dialogue: "حوار",
  character: "شخصية",
  scene_header_1: "رأس المشهد (1)",
  scene_header_2: "رأس المشهد (2)",
  scene_header_3: "رأس المشهد (3)",
  scene_header_top_line: "سطر رأس المشهد",
  transition: "انتقال",
  parenthetical: "تعليمات حوار",
  basmala: "بسملة",
};

/**
 * @description المكون الرئيسي لمنطقة تحرير السيناريو. يدير كائن Tiptap ومزامنة التنسيقات ويراقب تغييرات الصفحة (Layout).
 *
 * @complexity الزمنية: O(1) للتهيئة الأساسية | المكانية: O(n) استناداً لحجم المستند.
 *
 * @sideEffects
 *   - يتفاعل بشكل كثيف مع الـ DOM (تحديث أحجام، ومراقبة تغيرات).
 *   - قد يُنشأ ResizeObserver.
 *
 * @usedBy
 *   - `ScreenplayEditor` لربط منطقة الكتابة بالترويسة وأدوات أخرى.
 *
 * @example
 * ```typescript
 * const area = new EditorArea({ mount: div, onContentChange: (text) => console.log(text) });
 * area.getHandle().clear();
 * ```
 */
export class EditorArea implements EditorHandle {
  readonly editor;

  private readonly props: EditorAreaProps;
  private readonly body: HTMLDivElement;
  private readonly hasPagesExtension: boolean;
  private readonly characterWidowFixer = new CharacterWidowFixer();
  private readonly pageModel: EditorPageModel;
  private hasRequestedProductionSelfCheck = false;
  private progressiveSurfaceState: ProgressiveSurfaceState | null = null;
  private visibleVersionSequence = 0;
  private removePipelineSubscription: (() => void) | null = null;

  constructor(props: EditorAreaProps) {
    this.props = props;

    const sheet = document.createElement("div");
    sheet.className = "screenplay-sheet filmlane-sheet-paged";
    sheet.style.height = "auto";
    sheet.style.overflow = "hidden";
    sheet.style.minHeight = "var(--page-height)";
    // — دلالة بصرية/وصفية للقراء الآليين عن كون اللوحة ورقة سيناريو —
    sheet.setAttribute("role", "document");
    sheet.setAttribute("aria-label", "ورقة السيناريو");
    sheet.setAttribute("lang", "ar");

    const body = document.createElement("div");
    body.className = "screenplay-sheet__body";
    // — A11Y-09: تعريف دلالي لمنطقة التحرير لتقنيات قراءة الشاشة —
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-multiline", "true");
    body.setAttribute("aria-label", "محرر السيناريو");
    body.setAttribute("aria-describedby", "screenplay-editor-hint");
    body.setAttribute("spellcheck", "true");
    body.setAttribute("lang", "ar");

    // — تلميح مخفي بصريًا لقراء الشاشة يفسر كيفية استخدام المحرر —
    const hint = document.createElement("span");
    hint.id = "screenplay-editor-hint";
    hint.className = "sr-only";
    hint.textContent =
      "محرر نصي متعدد الأسطر لكتابة السيناريو. استخدم Ctrl+0 حتى Ctrl+7 لتبديل نوع العنصر. اضغط Tab للخروج من المحرر.";

    applyLayoutMetrics(sheet);
    applyEditorTypography(body);
    sheet.appendChild(body);

    props.mount.innerHTML = "";
    props.mount.appendChild(hint);
    props.mount.appendChild(sheet);

    this.body = body;

    this.editor = createScreenplayEditor(body);
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

    this.editor.on("update", this.handleEditorUpdate);
    this.editor.on("selectionUpdate", this.handleSelectionUpdate);
    this.editor.on("transaction", this.handleSelectionUpdate);
    if (typeof window !== "undefined") {
      window.addEventListener(
        PASTE_CLASSIFIER_ERROR_EVENT,
        this.handlePasteClassifierError as EventListener
      );
    }
    this.removePipelineSubscription = pipelineRecorder.subscribe(
      this.handlePipelineEvent
    );

    this.pageModel.bindObservers();
    this.pageModel.refreshPageModel(true);
    this.emitState();
    this.applySurfaceLock(false);

    if (process.env["NODE_ENV"] === "development") {
      void import("../../extensions/pipeline-diagnostics").then(
        ({ registerPipelineDiagnostics }) => {
          registerPipelineDiagnostics(() => this.getAllText());
        }
      );
    }
  }

  getAllText = (): string => this.editor.getText();

  getAllHtml = (): string => this.editor.getHTML();

  focusEditor = (): void => {
    this.editor.commands.focus("end");
  };

  clear = (): void => {
    if (this.isSurfaceLocked()) return;
    this.progressiveSurfaceState = null;
    this.editor.commands.setContent('<div data-type="action"></div>');
    this.editor.commands.focus("start");
    this.pageModel.refreshPageModel(true);
    this.emitState();
    this.emitProgressiveState();
  };

  beginProgressivePreparation = (params: {
    intakeKind: "file-open" | "paste";
    sourceType: ReceptionSourceType;
    fileName?: string | null;
  }): void => {
    const runId = this.createClientId("preparing-run");

    this.progressiveSurfaceState = {
      activeRun: {
        runId,
        intakeKind: params.intakeKind,
        sourceType: params.sourceType,
        fileName: params.fileName ?? null,
        startedAt: new Date().toISOString(),
        status: "started",
        currentVisibleVersionId: null,
        finalSettledVersionId: null,
        surfaceLocked: true,
        latestFailureStage: null,
        latestFailureCode: null,
        latestFailureMessage: null,
        failureRecoveryRequired: false,
        firstVisibleSourceKind: null,
      },
      visibleVersion: null,
      visibleElements: [],
      failureRecoveryAction: null,
    };

    this.applySurfaceLock(true);
    this.emitProgressiveState();
  };

  cancelProgressivePreparation = (): void => {
    const activeRun = this.progressiveSurfaceState?.activeRun;
    const visibleVersion = this.progressiveSurfaceState?.visibleVersion;

    if (!activeRun) return;
    if (activeRun.currentVisibleVersionId || visibleVersion) return;

    this.progressiveSurfaceState = null;
    this.applySurfaceLock(false);
    this.emitProgressiveState();
  };

  runCommand = (
    commandInput: EditorCommand | RunEditorCommandOptions
  ): boolean => {
    const command =
      typeof commandInput === "string" ? commandInput : commandInput.command;

    switch (command) {
      case "bold":
        return this.editor.chain().focus().toggleBold().run();
      case "italic":
        return this.editor.chain().focus().toggleItalic().run();
      case "underline":
        return this.editor.chain().focus().toggleUnderline().run();
      case "align-right":
        return this.applyTextAlignCommand("right");
      case "align-center":
        return this.applyTextAlignCommand("center");
      case "align-left":
        return this.applyTextAlignCommand("left");
      case "undo": {
        const undo = (this.editor.commands as Record<string, unknown>)["undo"];
        return typeof undo === "function" ? (undo as () => boolean)() : false;
      }
      case "redo": {
        const redo = (this.editor.commands as Record<string, unknown>)["redo"];
        return typeof redo === "function" ? (redo as () => boolean)() : false;
      }
      case "select-all":
        this.editor.commands.selectAll();
        return true;
      case "focus-end":
        this.editor.commands.focus("end");
        return true;
      default:
        return false;
    }
  };

  private applyTextAlignCommand(
    alignment: "left" | "center" | "right"
  ): boolean {
    const chain = this.editor.chain().focus() as unknown as {
      setTextAlign?: (value: "left" | "center" | "right") => {
        run: () => boolean;
      };
      run: () => boolean;
    };

    if (typeof chain.setTextAlign === "function") {
      const result = chain.setTextAlign(alignment).run();
      if (result) return true;
    }

    const setTextAlign = (this.editor.commands as Record<string, unknown>)[
      "setTextAlign"
    ];
    if (typeof setTextAlign === "function") {
      const result = (
        setTextAlign as (value: "left" | "center" | "right") => boolean
      )(alignment);
      if (result) return true;
    }

    return this.applyTextAlignDomFallback(alignment);
  }

  private applyTextAlignDomFallback(
    alignment: "left" | "center" | "right"
  ): boolean {
    const domSelection =
      typeof window !== "undefined" && typeof window.getSelection === "function"
        ? window.getSelection()
        : null;

    let targetElement: HTMLElement | null = null;
    const anchorNode = domSelection?.anchorNode ?? null;

    if (anchorNode) {
      const anchorElement =
        anchorNode instanceof HTMLElement
          ? anchorNode
          : anchorNode.parentElement;
      targetElement =
        anchorElement?.closest<HTMLElement>("[data-type]") ?? null;
    }

    if (!targetElement) {
      const fromPos = this.editor.state.selection.from;
      const nodeAtPos = this.editor.view.nodeDOM(fromPos);
      const baseElement =
        nodeAtPos instanceof HTMLElement
          ? nodeAtPos
          : (nodeAtPos?.parentElement ?? null);
      targetElement = baseElement?.closest<HTMLElement>("[data-type]") ?? null;
    }

    if (!targetElement) return false;

    targetElement.style.textAlign = alignment;
    if (targetElement.getAttribute("data-type") === "action") {
      if (alignment === "right") {
        targetElement.style.textAlignLast = "right";
        targetElement.style.setProperty("text-justify", "inter-word");
      } else {
        targetElement.style.textAlignLast = "auto";
        targetElement.style.setProperty("text-justify", "auto");
      }
    }

    return true;
  }

  setFormat = (format: ElementType): boolean => {
    const commandName = commandNameByFormat[format];
    const command = (this.editor.commands as Record<string, unknown>)[
      commandName
    ];
    if (typeof command !== "function") return false;
    return (command as () => boolean)();
  };

  getCurrentFormat = (): ElementType | null => {
    for (const item of SCREENPLAY_ELEMENTS) {
      if (!isElementType(item.name)) continue;
      if (this.editor.isActive(item.name)) return item.name;
    }
    return null;
  };

  getCurrentFormatLabel = (): string => {
    const format = this.getCurrentFormat();
    return format ? formatLabelByType[format] : "—";
  };

  importClassifiedText = async (
    text: string,
    mode: FileImportMode = "replace",
    context?: ImportClassificationContext
  ): Promise<void> => {
    const activeRun = this.progressiveSurfaceState?.activeRun;
    const isPreparationLock =
      activeRun?.status === "started" &&
      !activeRun.currentVisibleVersionId &&
      !this.progressiveSurfaceState?.visibleVersion;

    if (this.isSurfaceLocked() && !isPreparationLock) {
      throw new Error(
        "لا يمكن بدء تشغيل جديد قبل استقرار النسخة الحالية أو تنفيذ استرداد صريح بعد الفشل."
      );
    }

    // ضمان تفعيل دورة القياس في امتداد الصفحات قبل/بعد إدراج النص.
    this.editor.commands.focus(mode === "replace" ? "start" : "end");

    // الـ unstructured pipeline يتنادى بس لما النص فعلاً unstructured:
    // - مش paste عادي (classificationProfile !== "paste")
    // - مفيش structuredHints جاهزة من المصدر
    // - مش ملف doc/docx (اللي عنده بنية أصلاً)
    const skipUnstructured =
      context?.classificationProfile === "paste" ||
      (context?.structuredHints && context.structuredHints.length > 0) ||
      (context?.schemaElements && context.schemaElements.length > 0) ||
      context?.sourceFileType === "doc" ||
      context?.sourceFileType === "docx";

    if (!skipUnstructured) {
      const unstructured = maybeReconstructUnstructured(text, {
        threshold: 0.7,
        replaceBullets: true,
      });

      if (unstructured.applied) {
        const existingHints = context?.structuredHints ?? [];
        const mergedHints = unstructured.structuredBlocks.concat(existingHints);

        text = unstructured.structuredText;
        context = {
          ...(context ?? {}),
          structuredHints: mergedHints,
        };
      }
    }

    const state = this.editor.view.state;
    const replaceAllFrom = 0;
    const replaceAllTo = state.doc.content.size;
    const from = mode === "replace" ? replaceAllFrom : state.selection.from;
    const to = mode === "replace" ? replaceAllTo : state.selection.to;

    const applied = await applyPasteClassifierFlowToView(
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
    const activeRun = this.progressiveSurfaceState?.activeRun;
    const isPreparationLock =
      activeRun?.status === "started" &&
      !activeRun.currentVisibleVersionId &&
      !this.progressiveSurfaceState?.visibleVersion;

    if (this.isSurfaceLocked() && !isPreparationLock) {
      throw new Error(
        "لا يمكن بدء تشغيل جديد قبل استقرار النسخة الحالية أو تنفيذ استرداد صريح بعد الفشل."
      );
    }

    if (!blocks || blocks.length === 0) return;

    const sourceText = blocks
      .map((block) => (block.text ?? "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!sourceText) return;

    // تمرير البلوكات الأصلية كـ structuredHints عشان الـ paste-classifier
    // يستفيد منها + يتخطى الـ unstructured pipeline تلقائياً
    await this.importClassifiedText(sourceText, mode, {
      structuredHints: blocks,
    });
  };

  getBlocks = (): ScreenplayBlock[] =>
    htmlToScreenplayBlocks(this.getAllHtml());

  hasSelection = (): boolean => !this.editor.state.selection.empty;

  copySelectionToClipboard = async (): Promise<boolean> => {
    const selectionOnly = this.hasSelection();
    return copyToClipboard(this.editor, selectionOnly);
  };

  cutSelectionToClipboard = async (): Promise<boolean> => {
    return cutToClipboard(this.editor);
  };

  pasteFromClipboard = async (origin: ClipboardOrigin): Promise<boolean> => {
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

  isSurfaceLocked = (): boolean =>
    this.progressiveSurfaceState?.activeRun?.surfaceLocked ?? false;

  getProgressiveSurfaceState = (): ProgressiveSurfaceState | null =>
    this.progressiveSurfaceState;

  approveCurrentVersion = async (): Promise<void> => {
    const progressiveState = this.progressiveSurfaceState;
    const activeRun = progressiveState?.activeRun;
    const visibleVersion = progressiveState?.visibleVersion;

    if (!progressiveState || !activeRun || !visibleVersion) {
      throw new Error("لا توجد نسخة جاهزة للموافقة.");
    }

    if (activeRun.status !== "settled" || !visibleVersion.approvalEligible) {
      throw new Error(
        "لا تصبح الموافقة متاحة إلا بعد اكتمال المراجعة النهائية واستقرار النسخة."
      );
    }

    const approvalToken = visibleVersion.approvalToken;
    if (!approvalToken) {
      throw new Error("رمز الموافقة الحالي غير صالح أو صار قديماً.");
    }

    const approvedAt = new Date().toISOString();
    const approvedVersionId = this.createClientId("approved-version");
    const topLevelNodes = this.captureTopLevelNodes();

    if (topLevelNodes.length === 0) {
      throw new Error("لا توجد عناصر ظاهرة لوضع علامة الموافقة عليها.");
    }

    let transaction = this.editor.state.tr;

    for (const nodeEntry of topLevelNodes) {
      transaction = transaction.setNodeMarkup(nodeEntry.pos, undefined, {
        ...nodeEntry.node.attrs,
        approvalState: "approved",
        approvedVersionId,
        approvedAt,
      });
    }

    this.editor.view.dispatch(transaction);

    const approvedElements = this.captureVisibleElements(
      activeRun.runId,
      approvedVersionId
    ).map((element) => ({
      ...element,
      approvalState: "approved" as const,
      approvedVersionId,
    }));

    const approvedVersion: VisibleVersion = {
      visibleVersionId: approvedVersionId,
      runId: activeRun.runId,
      stage: "approved",
      text: this.getAllText(),
      elements: approvedElements,
      elementCount: approvedElements.length,
      createdAt: approvedAt,
      replacesVersionId: visibleVersion.visibleVersionId,
      isVisible: true,
      isSettled: true,
      approvalEligible: false,
      approvalToken: null,
    };

    this.progressiveSurfaceState = {
      ...progressiveState,
      activeRun: {
        ...activeRun,
        status: "approved",
        currentVisibleVersionId: approvedVersion.visibleVersionId,
        finalSettledVersionId:
          activeRun.finalSettledVersionId ?? visibleVersion.visibleVersionId,
        surfaceLocked: false,
        failureRecoveryRequired: false,
      },
      visibleVersion: approvedVersion,
      visibleElements: approvedElements,
    };

    pipelineRecorder.logApproval({
      runId: activeRun.runId,
      approvedVersionId,
      replacesVersionId: visibleVersion.visibleVersionId,
      elementCount: approvedElements.length,
      approvedAt,
    });

    this.applySurfaceLock(false);
    this.emitProgressiveState();
  };

  dismissProgressiveFailure = (): boolean => {
    const progressiveState = this.progressiveSurfaceState;
    const activeRun = progressiveState?.activeRun;
    const visibleVersion = progressiveState?.visibleVersion;

    if (
      !progressiveState ||
      !activeRun ||
      !visibleVersion ||
      activeRun.status !== "failed-after-visible"
    ) {
      return false;
    }

    const recoveryAction: FailureRecoveryAction = {
      recoveryId: this.createClientId("recovery"),
      runId: activeRun.runId,
      visibleVersionId: visibleVersion.visibleVersionId,
      actionKind: "dismiss-failure",
      resolvedAt: new Date().toISOString(),
    };

    this.progressiveSurfaceState = {
      ...progressiveState,
      activeRun: {
        ...activeRun,
        surfaceLocked: false,
        failureRecoveryRequired: false,
      },
      failureRecoveryAction: recoveryAction,
    };

    this.applySurfaceLock(false);
    this.emitProgressiveState();
    return true;
  };

  destroy(): void {
    this.editor.off("update", this.handleEditorUpdate);
    this.editor.off("selectionUpdate", this.handleSelectionUpdate);
    this.editor.off("transaction", this.handleSelectionUpdate);
    if (typeof window !== "undefined") {
      window.removeEventListener(
        PASTE_CLASSIFIER_ERROR_EVENT,
        this.handlePasteClassifierError as EventListener
      );
    }
    this.characterWidowFixer.cancel();
    this.pageModel.disconnectObservers();
    this.removePipelineSubscription?.();
    this.removePipelineSubscription = null;
    this.editor.destroy();
  }

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

  private readonly handlePasteClassifierError = (event: Event): void => {
    const customEvent = event as CustomEvent<{ message?: unknown }>;
    const rawMessage = customEvent.detail?.message;
    const message =
      typeof rawMessage === "string" && rawMessage.trim().length > 0
        ? rawMessage
        : "تعذر تطبيق نظام الشك على النص الملصوق.";
    this.props.onImportError?.(message);
  };

  private readonly handlePipelineEvent = (event: PipelineEvent): void => {
    switch (event.kind) {
      case "run-start": {
        const sourceType = this.normalizeReceptionSourceType(event.sourceType);
        this.visibleVersionSequence = 0;
        this.progressiveSurfaceState = {
          activeRun: {
            runId: event.runId,
            intakeKind: event.intakeKind ?? "paste",
            sourceType,
            fileName: event.fileName ?? null,
            startedAt: new Date().toISOString(),
            status: "started",
            currentVisibleVersionId: null,
            finalSettledVersionId: null,
            surfaceLocked: true,
            latestFailureStage: null,
            latestFailureCode: null,
            latestFailureMessage: null,
            failureRecoveryRequired: false,
            firstVisibleSourceKind: null,
          },
          visibleVersion: null,
          visibleElements: [],
          failureRecoveryAction: null,
        };
        this.applySurfaceLock(true);
        this.emitProgressiveState();
        return;
      }

      case "snapshot": {
        const progressiveState = this.progressiveSurfaceState;
        const activeRun = progressiveState?.activeRun;
        if (!progressiveState || !activeRun) return;

        const mappedRunStatus = this.mapSnapshotStageToRunStatus(event.stage);
        const mappedVisibleStage = this.mapSnapshotStageToVisibleStage(
          event.stage,
          activeRun.sourceType
        );
        if (!mappedRunStatus || !mappedVisibleStage) return;

        const nextVisibleVersion = this.createVisibleVersion(
          activeRun,
          mappedVisibleStage,
          mappedRunStatus === "settled",
          event.stage === "settled",
          event.metadata
        );

        this.progressiveSurfaceState = {
          ...progressiveState,
          activeRun: {
            ...activeRun,
            status: mappedRunStatus,
            currentVisibleVersionId: nextVisibleVersion.visibleVersionId,
            finalSettledVersionId:
              mappedRunStatus === "settled"
                ? nextVisibleVersion.visibleVersionId
                : (activeRun.finalSettledVersionId ?? null),
            surfaceLocked: mappedRunStatus !== "settled",
            ...definedProps({
              firstVisibleSourceKind:
                activeRun.firstVisibleSourceKind ??
                this.resolveFirstVisibleSourceKind(
                  activeRun.sourceType,
                  event.metadata
                ),
            }),
          },
          visibleVersion: nextVisibleVersion,
          visibleElements: nextVisibleVersion.elements,
          failureRecoveryAction: progressiveState.failureRecoveryAction,
        };

        this.applySurfaceLock(mappedRunStatus !== "settled");
        this.emitProgressiveState();
        return;
      }

      case "run-failure": {
        const activeRun = this.progressiveSurfaceState?.activeRun;
        if (!activeRun) return;

        this.progressiveSurfaceState = {
          ...(this.progressiveSurfaceState as ProgressiveSurfaceState),
          activeRun: {
            ...activeRun,
            status: "failed-after-visible",
            surfaceLocked: true,
            latestFailureCode: event.code ?? null,
            latestFailureMessage: event.message,
            failureRecoveryRequired: true,
            ...definedProps({
              latestFailureStage: this.normalizeFailureStage(event.stage),
            }),
          },
        };
        this.applySurfaceLock(true);
        this.emitProgressiveState();
        return;
      }

      case "run-end": {
        const activeRun = this.progressiveSurfaceState?.activeRun;
        const visibleVersion = this.progressiveSurfaceState?.visibleVersion;
        if (!activeRun || !visibleVersion) return;

        if (event.outcome === "failed-after-visible") {
          this.applySurfaceLock(true);
          this.emitProgressiveState();
          return;
        }

        const settledVersion =
          visibleVersion.stage === "settled"
            ? visibleVersion
            : {
                ...visibleVersion,
                stage: "settled" as const,
                isSettled: true,
                approvalEligible: true,
                approvalToken:
                  visibleVersion.approvalToken ??
                  this.createClientId("approval"),
              };

        this.progressiveSurfaceState = {
          ...(this.progressiveSurfaceState as ProgressiveSurfaceState),
          activeRun: {
            ...activeRun,
            status: "settled",
            currentVisibleVersionId: settledVersion.visibleVersionId,
            finalSettledVersionId: settledVersion.visibleVersionId,
            surfaceLocked: false,
            failureRecoveryRequired: false,
          },
          visibleVersion: settledVersion,
          visibleElements: settledVersion.elements,
        };
        this.applySurfaceLock(false);
        this.emitProgressiveState();
        return;
      }

      default:
        return;
    }
  };

  private emitProgressiveState(): void {
    this.props.onProgressiveStateChange?.(this.progressiveSurfaceState);
  }

  private applySurfaceLock(locked: boolean): void {
    this.editor.setEditable(!locked);
    this.body.dataset["surfaceLocked"] = locked ? "true" : "false";
  }

  private createVisibleVersion(
    run: ProgressiveReviewRun,
    stage: VisibleVersionStage,
    isSettled: boolean,
    approvalEligible: boolean,
    metadata?: Record<string, unknown>
  ): VisibleVersion {
    const previousVersionId =
      this.progressiveSurfaceState?.visibleVersion?.visibleVersionId ?? null;
    const visibleVersionId = this.createClientId("visible-version");
    const elements = this.captureVisibleElements(run.runId, visibleVersionId);

    return {
      visibleVersionId,
      runId: run.runId,
      stage,
      text: this.getAllText(),
      elements,
      elementCount: elements.length,
      createdAt: new Date().toISOString(),
      replacesVersionId: previousVersionId,
      isVisible: true,
      isSettled,
      approvalEligible,
      approvalToken: approvalEligible
        ? this.createClientId("approval")
        : this.resolveApprovalToken(metadata),
    };
  }

  private captureVisibleElements(
    runId: string,
    visibleVersionId: string
  ): ProgressiveElement[] {
    const elements: ProgressiveElement[] = [];
    let orderIndex = 0;

    this.editor.state.doc.forEach((node) => {
      const nodeText = node.textContent ?? "";
      const elementId =
        typeof node.attrs["elementId"] === "string" &&
        node.attrs["elementId"].trim().length > 0
          ? node.attrs["elementId"]
          : `${runId}:element:${orderIndex}`;
      const approvalState =
        node.attrs["approvalState"] === "approved" ? "approved" : "unapproved";
      const approvedVersionId =
        typeof node.attrs["approvedVersionId"] === "string" &&
        node.attrs["approvedVersionId"].trim().length > 0
          ? node.attrs["approvedVersionId"]
          : null;

      elements.push({
        elementId,
        runId,
        visibleVersionId,
        orderIndex,
        text: nodeText,
        normalizedText: nodeText.replace(/\s+/g, " ").trim(),
        elementType: node.type.name,
        expectedCurrentText: nodeText,
        reviewEligibility: "reviewable",
        nonReviewableReason: null,
        approvalState,
        approvedVersionId,
      });
      orderIndex += 1;
    });

    return elements;
  }

  private captureTopLevelNodes(): Array<{
    pos: number;
    node: PmNode;
  }> {
    const nodes: Array<{
      pos: number;
      node: PmNode;
    }> = [];

    this.editor.state.doc.forEach((_node, offset) => {
      const resolvedNode = this.editor.state.doc.nodeAt(offset);
      if (!resolvedNode) return;
      nodes.push({ pos: offset, node: resolvedNode });
    });

    return nodes;
  }

  private createClientId(prefix: string): string {
    this.visibleVersionSequence += 1;
    return `${prefix}-${Date.now()}-${this.visibleVersionSequence}`;
  }

  private mapSnapshotStageToRunStatus(
    stage: string
  ): ProgressiveRunStatus | null {
    switch (stage) {
      case "preview-literal":
        return "initial-visible";
      case "karank-visible":
        return "karank-visible";
      case "render-first":
        return "local-complete";
      case "suspicion-model":
        return "suspicion-complete";
      case "final-review":
        return "final-complete";
      case "settled":
        return "settled";
      default:
        return null;
    }
  }

  private mapSnapshotStageToVisibleStage(
    stage: string,
    sourceType: ReceptionSourceType
  ): VisibleVersionStage | null {
    switch (stage) {
      case "preview-literal":
        return sourceType === "paste" ? "user-paste" : "extracted";
      case "karank-visible":
        return "karank";
      case "render-first":
        return "local-classified";
      case "suspicion-model":
        return "suspicion-reviewed";
      case "final-review":
        return "final-reviewed";
      case "settled":
        return "settled";
      default:
        return null;
    }
  }

  private resolveFirstVisibleSourceKind(
    sourceType: ReceptionSourceType,
    metadata?: Record<string, unknown>
  ): NonNullable<ProgressiveReviewRun["firstVisibleSourceKind"]> {
    if (metadata?.["firstVisibleSourceKind"] === "user-paste") {
      return "user-paste";
    }
    if (metadata?.["firstVisibleSourceKind"] === "ocr") {
      return "ocr";
    }
    if (sourceType === "paste") return "user-paste";
    if (
      sourceType === "pdf" &&
      metadata?.["firstVisibleSourceKind"] !== "direct-extraction"
    ) {
      return "ocr";
    }
    return "direct-extraction";
  }

  private resolveApprovalToken(
    metadata?: Record<string, unknown>
  ): string | null {
    return typeof metadata?.["approvalToken"] === "string"
      ? (metadata["approvalToken"] as string)
      : null;
  }

  private normalizeReceptionSourceType(value?: string): ReceptionSourceType {
    if (value === "doc" || value === "docx" || value === "pdf") {
      return value;
    }
    return "paste";
  }

  private normalizeFailureStage(
    stage: string
  ): NonNullable<ProgressiveReviewRun["latestFailureStage"]> {
    if (
      stage === "extraction" ||
      stage === "karank" ||
      stage === "approval-marking" ||
      stage === "suspicion-review" ||
      stage === "final-review"
    ) {
      return stage;
    }
    if (stage === "local-classification") {
      return stage;
    }
    return "final-review";
  }

  private requestProductionSelfCheck(): void {
    if (this.hasRequestedProductionSelfCheck) return;
    this.hasRequestedProductionSelfCheck = true;

    void import("../../extensions/production-self-check")
      .then(({ runProductionSelfCheck }) =>
        runProductionSelfCheck({
          trigger: "editor-import",
          force: false,
        })
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
    const words = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
    const characters = text.replace(/\s+/g, "").length;
    const pages = this.pageModel.estimatedPagesCount;

    const html = this.getAllHtml();
    const scenes = (
      html.match(
        /data-type="scene_header_top_line"|data-type="scene_header_3"/g
      ) ?? []
    ).length;

    const stats: DocumentStats = {
      words,
      characters,
      pages,
      scenes,
    };

    this.props.onStatsChange?.(stats);
    this.props.onFormatChange?.(this.getCurrentFormat());
  }
}

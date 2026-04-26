/**
 * @module controllers/editor-actions-controller
 * @description متحكم أوامر القوائم وعمليات الملفات والتصدير.
 *   مستخرج من `App.tsx` لتطبيق مبدأ المسؤولية الواحدة.
 */
import { definedProps } from "@/lib/defined-props";

import {
  FORMAT_CYCLE_ORDER,
  FORMAT_LABEL_BY_TYPE,
  LIBRARY_ACTION_BY_ITEM,
  PROJECT_TEMPLATE_BY_NAME,
  ensureDocxFilename,
  formatPdfOcrIssueDescription,
} from "../constants/format-mappings";
import { pipelineRecorder } from "../extensions/pipeline-recorder";
import { loadFromStorage, saveToStorage } from "../hooks";
import {
  ACCEPTED_FILE_EXTENSIONS,
  getFileType,
  type EditorEngineAdapter,
  type ReceptionSourceType,
  type RunDocumentThroughPasteWorkflowOptions,
} from "../types";
import {
  buildFileOpenPipelineAction,
  extractImportedFile,
  probeBackendPdfOcrReadiness,
  pickImportFile,
  resolveBackendExtractionTimeoutMs,
} from "../utils/file-import";
import { logger } from "../utils/logger";

import type { MenuToastPayload } from "./insert-menu-controller";
import type { EditorArea, FileImportMode } from "../components/editor";
import type { MenuActionId, ExportFormat } from "../constants/menu-definitions";

interface EditorAutosaveSnapshot {
  html?: string;
  text: string;
  updatedAt: string;
  version?: 2;
}

const AUTOSAVE_DRAFT_STORAGE_KEY = "filmlane.autosave.document-text.v1";

const toReceptionSourceType = (
  fileType: ReturnType<typeof getFileType>
): ReceptionSourceType =>
  fileType === "doc" || fileType === "docx" || fileType === "pdf"
    ? fileType
    : "paste";

export interface EditorActionsDeps {
  getArea: () => EditorArea | null;
  toast: (payload: MenuToastPayload) => void;
  resolveMenuCommand: (actionId: string) => boolean;
  isProgressiveSurfaceLocked: () => boolean;
  runDocumentThroughPasteWorkflow: (
    options: RunDocumentThroughPasteWorkflowOptions
  ) => Promise<void>;
  runForcedProductionSelfCheck: (
    trigger: "manual-auto-check" | "manual-reclassify"
  ) => Promise<void>;
  restoreAutosaveDraft: () => Promise<void>;
  recordDiagnostic: (title: string, message: string) => void;
}

export const openFile = async (
  mode: FileImportMode,
  deps: Pick<
    EditorActionsDeps,
    "getArea" | "toast" | "isProgressiveSurfaceLocked" | "recordDiagnostic"
  >
): Promise<void> => {
  if (deps.isProgressiveSurfaceLocked()) {
    deps.toast({
      title:
        mode === "replace"
          ? "التشغيل الحالي لم يستقر بعد"
          : "التشغيل الحالي لم يستقر بعد",
      description:
        "لا يمكن بدء فتح أو إدراج ملف جديد قبل استقرار النسخة الحالية أو تنفيذ استرداد صريح بعد الفشل.",
      variant: "destructive",
    });
    return;
  }

  const area = deps.getArea();
  if (!area) return;

  const file = await pickImportFile(ACCEPTED_FILE_EXTENSIONS);
  if (!file) return;

  try {
    const detectedFileType = getFileType(file.name);
    area.beginProgressivePreparation({
      intakeKind: "file-open",
      sourceType: toReceptionSourceType(detectedFileType),
      fileName: file.name,
    });

    logger.info("File import pipeline started", {
      scope: "file-import",
      data: {
        filename: file.name,
        mode,
        strategy: "backend-only-strict",
        pipeline: "frontend-open->backend-extract->editor-apply",
      },
    });

    if (detectedFileType === "pdf") {
      const readiness = await probeBackendPdfOcrReadiness();
      if (!readiness.ready) {
        const readinessMessage = formatPdfOcrIssueDescription(
          readiness.errorCode,
          readiness.errorMessage
        );

        deps.toast({
          title: mode === "replace" ? "تعذر فتح الملف" : "تعذر إدراج الملف",
          description: readinessMessage,
          variant: "destructive",
        });
        deps.recordDiagnostic(
          mode === "replace" ? "تعذر فتح الملف" : "تعذر إدراج الملف",
          readinessMessage
        );

        logger.warn("PDF import blocked by OCR readiness", {
          scope: "file-import",
          data: {
            filename: file.name,
            mode,
            readiness,
          },
        });
        area.cancelProgressivePreparation();
        return;
      }
    }

    const extractStart = performance.now();
    pipelineRecorder.logFileOpen(
      file.name,
      detectedFileType ?? "unknown",
      mode
    );
    const backendTimeoutMs = resolveBackendExtractionTimeoutMs(
      detectedFileType ?? "txt",
      file.size
    );
    const extraction = await extractImportedFile(file, {
      backend: { timeoutMs: backendTimeoutMs },
    });
    pipelineRecorder.logFileExtractDone({
      fileName: file.name,
      method: extraction.method,
      usedOcr: extraction.usedOcr,
      textLength: extraction.text.length,
      schemaElementCount: extraction.schemaElements?.length ?? 0,
      latencyMs: Math.round(performance.now() - extractStart),
    });

    const action = buildFileOpenPipelineAction(extraction, mode);
    let appliedPipeline = "paste-classifier" as const;

    if (action.kind === "reject") {
      area.cancelProgressivePreparation();
      deps.toast(action.toast);
      return;
    }

    if (action.kind === "import-structured-blocks") {
      await area.importStructuredBlocks(action.blocks, mode);
    } else {
      await area.importClassifiedText(action.text, mode, {
        fileName: file.name,
        sourceFileType: extraction.fileType,
        sourceMethod: extraction.method,
        classificationProfile: "generic-open",
        ...definedProps({
          schemaElements: extraction.schemaElements,
          rawExtractedText: extraction.rawExtractedText,
          firstVisibleSourceKind: extraction.firstVisibleSourceKind,
        }),
      });
      appliedPipeline = "paste-classifier";
    }

    logger.info("File import pipeline completed", {
      scope: "file-import",
      data: {
        ...action.telemetry,
        appliedPipeline,
      },
    });
  } catch (error) {
    area.cancelProgressivePreparation();
    const rawMessage =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف أثناء فتح الملف.";
    const extractionErrorCode =
      typeof (error as { errorCode?: unknown })?.errorCode === "string"
        ? ((error as { errorCode?: string }).errorCode ?? "").trim()
        : "";

    const normalizedMessage = extractionErrorCode
      ? formatPdfOcrIssueDescription(extractionErrorCode, rawMessage)
      : rawMessage;

    const backendRelatedFailure =
      /failed to fetch|backend|connection|timed out|err_connection_refused|vite_file_import_backend_url/i.test(
        normalizedMessage
      );
    const message = backendRelatedFailure
      ? `${normalizedMessage}\nفي التطوير المحلي: استخدم pnpm dev (يشغّل backend تلقائيًا).`
      : normalizedMessage;
    deps.toast({
      title: mode === "replace" ? "تعذر فتح الملف" : "تعذر إدراج الملف",
      description: message,
      variant: "destructive",
    });
    deps.recordDiagnostic(
      mode === "replace" ? "تعذر فتح الملف" : "تعذر إدراج الملف",
      message
    );
    logger.error("File import pipeline failed", {
      scope: "file-import",
      data: error,
    });
  }
};

export const runExport = async (
  format: ExportFormat,
  deps: Pick<EditorActionsDeps, "getArea" | "toast" | "recordDiagnostic">,
  fileBase?: string
): Promise<void> => {
  const area = deps.getArea();
  if (!area) return;

  const html = area.getAllHtml().trim();
  if (!html) {
    deps.toast({
      title: "لا يوجد محتوى",
      description: "اكتب شيئًا أولًا قبل الحفظ.",
      variant: "destructive",
    });
    return;
  }

  try {
    const blocks = area.getBlocks();

    const labelByFormat: Record<ExportFormat, string> = {
      docx: "DOCX",
      html: "HTML",
      pdf: "PDF",
      pdfa: "PDF/A",
      fdx: "FDX",
      fountain: "Fountain",
      classified: "النص المصنف",
    };

    if (format === "docx") {
      const { exportToDocx } = await import("../utils/exporters");
      const resolvedFileName = ensureDocxFilename(
        fileBase ?? "screenplay.docx"
      );
      await exportToDocx(html, resolvedFileName, { blocks });
      deps.toast({
        title: "تم التصدير",
        description: "تم حفظ الملف بصيغة DOCX.",
      });
      return;
    }

    if (format === "fdx") {
      const { exportAsFdx } = await import("../utils/exporters");
      exportAsFdx(
        definedProps({
          html,
          fileNameBase: fileBase,
          blocks,
        })
      );
      deps.toast({
        title: "تم التصدير",
        description: `تم تصدير الملف بصيغة ${labelByFormat[format]}.`,
      });
      return;
    }

    if (format === "fountain") {
      const { exportAsFountain } = await import("../utils/exporters");
      exportAsFountain(
        definedProps({
          html,
          fileNameBase: fileBase,
          blocks,
        })
      );
      deps.toast({
        title: "تم التصدير",
        description: `تم تصدير الملف بصيغة ${labelByFormat[format]}.`,
      });
      return;
    }

    if (format === "pdfa") {
      const { exportAsPdfA } = await import("../utils/exporters");
      await exportAsPdfA(
        definedProps({
          html,
          fileNameBase: fileBase,
          title: "تصدير محرر السيناريو",
        })
      );
      deps.toast({
        title: "تم التصدير",
        description: `تم تصدير الملف بصيغة ${labelByFormat[format]}.`,
      });
      return;
    }

    if (format === "classified") {
      const { exportAsClassified } = await import("../utils/exporters");
      exportAsClassified(
        definedProps({
          fileNameBase: fileBase,
          blocks,
        })
      );
      deps.toast({
        title: "تم اعتماد النص",
        description: "تم تصدير الملف كملف نصي مصنف (TXT).",
      });
      return;
    }

    if (format === "html") {
      const { exportAsHtml } = await import("../utils/exporters");
      exportAsHtml(
        definedProps({
          html,
          fileNameBase: fileBase,
          title: "تصدير محرر السيناريو",
        })
      );
    } else {
      const { exportAsPdf } = await import("../utils/exporters");
      await exportAsPdf(
        definedProps({
          html,
          fileNameBase: fileBase,
          title: "تصدير محرر السيناريو",
        })
      );
    }

    deps.toast({
      title: "تم التصدير",
      description: `تم تصدير الملف بصيغة ${labelByFormat[format]}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف أثناء التصدير.";
    deps.toast({
      title: "تعذر التصدير",
      description: message,
      variant: "destructive",
    });
    deps.recordDiagnostic("تعذر التصدير", message);
    logger.error("Document export failed", {
      scope: "export",
      data: { format, error },
    });
  }
};

export const handleMenuAction = async (
  actionId: MenuActionId,
  deps: EditorActionsDeps
): Promise<void> => {
  const area = deps.getArea();
  if (!area) return;
  const engine = area as unknown as EditorEngineAdapter;

  if (deps.resolveMenuCommand(actionId)) {
    return;
  }

  if (
    deps.isProgressiveSurfaceLocked() &&
    (actionId === "new-file" ||
      actionId === "open-file" ||
      actionId === "insert-file" ||
      actionId === "paste" ||
      actionId === "tool-auto-check" ||
      actionId === "tool-reclassify" ||
      actionId === "restore-draft")
  ) {
    deps.toast({
      title: "التشغيل الحالي لم يستقر بعد",
      description:
        "انتظر حتى تستقر النسخة الحالية أو نفذ استردادًا صريحًا بعد الفشل قبل بدء تشغيل جديد.",
      variant: "destructive",
    });
    return;
  }

  switch (actionId) {
    case "new-file":
      area.clear();
      deps.toast({ title: "مستند جديد", description: "تم إنشاء مستند فارغ." });
      break;
    case "open-file":
      await openFile("replace", deps);
      break;
    case "insert-file":
      await openFile("insert", deps);
      break;
    case "save-file": {
      // BUG-009: Ctrl+S كان يُصدّر DOCX ويُجبر المستخدم على اختيار موقع
      // تنزيل. السلوك المتوقع لاختصار الحفظ هو حفظ محلي فوري دون فتح
      // مربع حوار، مع الاحتفاظ بتصدير DOCX متاحاً عبر القائمة صراحة.
      const html = area.getAllHtml();
      const text = area.getAllText();
      const snapshot: EditorAutosaveSnapshot = {
        html,
        text,
        updatedAt: new Date().toISOString(),
        version: 2,
      };
      saveToStorage<EditorAutosaveSnapshot>(
        AUTOSAVE_DRAFT_STORAGE_KEY,
        snapshot
      );
      deps.toast({
        title: "تم الحفظ محلياً",
        description:
          "تم حفظ المسودة الحالية في متصفحك. لتصدير الملف اختر «تصدير» من القائمة.",
      });
      break;
    }
    case "print-file":
      window.print();
      break;
    case "export-html":
      await runExport("html", deps, "screenplay-export");
      break;
    case "export-pdf":
      await runExport("pdf", deps, "screenplay-export");
      break;
    case "export-pdfa":
      await runExport("pdfa", deps, "screenplay-export");
      break;
    case "export-fdx":
      await runExport("fdx", deps, "screenplay-export");
      break;
    case "export-fountain":
      await runExport("fountain", deps, "screenplay-export");
      break;
    case "export-classified":
      await runExport("classified", deps, "النص_المصنف");
      break;
    case "undo":
    case "redo":
      engine.runCommand({ command: actionId });
      break;
    case "bold":
    case "italic":
    case "underline":
    case "align-right":
    case "align-center":
    case "align-left":
      area.runCommand(actionId);
      break;
    case "quick-cycle-format": {
      const current = area.getCurrentFormat();
      const currentIndex = current ? FORMAT_CYCLE_ORDER.indexOf(current) : -1;
      const nextFormat =
        currentIndex >= 0
          ? FORMAT_CYCLE_ORDER[(currentIndex + 1) % FORMAT_CYCLE_ORDER.length]
          : FORMAT_CYCLE_ORDER[0];
      if (!nextFormat) {
        break;
      }

      area.setFormat(nextFormat);
      deps.toast({
        title: "تبديل التنسيق",
        description: `تم التحويل إلى: ${FORMAT_LABEL_BY_TYPE[nextFormat]}`,
      });
      break;
    }
    case "show-draft-info": {
      const snapshot = loadFromStorage<EditorAutosaveSnapshot | null>(
        AUTOSAVE_DRAFT_STORAGE_KEY,
        null
      );
      if (!snapshot?.updatedAt) {
        deps.toast({
          title: "معلومات المسودة",
          description: "لا توجد مسودة محفوظة تلقائيًا حتى الآن.",
        });
        break;
      }

      const updatedAtLabel = new Date(snapshot.updatedAt).toLocaleString(
        "ar-EG"
      );
      deps.toast({
        title: "معلومات المسودة",
        description: `آخر حفظ تلقائي: ${updatedAtLabel}`,
      });
      break;
    }
    case "copy":
      {
        const result = await engine.copySelectionToClipboard();
        if (!result.ok && !document.execCommand("copy")) {
          deps.toast({
            title: "تعذر النسخ",
            description: result.message,
            variant: "destructive",
          });
          deps.recordDiagnostic("تعذر النسخ", result.message);
        } else if (result.ok) {
          deps.toast({
            title: "تم النسخ",
            description: result.message,
          });
        }
      }
      break;
    case "cut":
      {
        const result = await engine.cutSelectionToClipboard();
        if (!result.ok && !document.execCommand("cut")) {
          deps.toast({
            title: "تعذر القص",
            description: result.message,
            variant: "destructive",
          });
          deps.recordDiagnostic("تعذر القص", result.message);
        } else if (result.ok) {
          deps.toast({
            title: "تم القص",
            description: result.message,
          });
        }
      }
      break;
    case "paste": {
      try {
        const result = await engine.pasteFromClipboard("menu");
        if (result.ok) {
          deps.toast({
            title: "تم اللصق",
            description: result.message,
          });
          break;
        }
        if (!document.execCommand("paste")) {
          deps.toast({
            title: "تعذر اللصق",
            description: result.message,
            variant: "destructive",
          });
          deps.recordDiagnostic("تعذر اللصق", result.message);
        }
      } catch {
        if (!document.execCommand("paste")) {
          const message = "فشل الوصول إلى الحافظة من هذا السياق.";
          deps.toast({
            title: "تعذر اللصق",
            description: message,
            variant: "destructive",
          });
          deps.recordDiagnostic("تعذر اللصق", message);
        }
      }
      break;
    }
    case "select-all":
      engine.runCommand({ command: "select-all" });
      break;
    case "about":
      deps.toast({
        title: "أفان تيتر",
        description: "واجهة Aceternity + محرك تصنيف Tiptap مفعلين معًا.",
      });
      break;
    case "help-shortcuts":
      deps.toast({
        title: "اختصارات سريعة",
        description:
          "Ctrl+S حفظ، Ctrl+O فتح، Ctrl+N مستند جديد، Ctrl+Z تراجع، Ctrl+Y إعادة، Ctrl+B/I/U تنسيق.",
      });
      break;
    case "restore-draft":
      await deps.restoreAutosaveDraft();
      break;
    case "tool-auto-check":
      await deps.runDocumentThroughPasteWorkflow({
        source: "manual-deferred",
        reviewProfile: "interactive",
        policyProfile: "strict-structure",
      });
      await deps.runForcedProductionSelfCheck("manual-auto-check");
      break;
    case "tool-reclassify":
      await deps.runDocumentThroughPasteWorkflow({
        source: "manual-deferred",
        reviewProfile: "interactive",
        policyProfile: "interactive-legacy",
      });
      await deps.runForcedProductionSelfCheck("manual-reclassify");
      break;
    default:
      break;
  }
};

export const handleSidebarItemAction = async (
  sectionId: string,
  itemLabel: string,
  deps: EditorActionsDeps
): Promise<void> => {
  const area = deps.getArea();
  if (!area) return;

  if (sectionId === "docs") {
    const mode: FileImportMode = itemLabel.endsWith(".txt")
      ? "insert"
      : "replace";
    deps.toast({
      title: "اختر الملف",
      description: `سيتم ${mode === "replace" ? "فتح" : "إدراج"} "${itemLabel}" بعد اختياره من جهازك.`,
    });
    await openFile(mode, deps);
    return;
  }

  if (sectionId === "projects") {
    // BUG-008: كانت setContent تُستدعى دون فحص قفل السطح، ودون تحديث
    // نموذج الصفحات/الحالة — ما يجعل القالب أحياناً لا يظهر للمستخدم.
    // نضيف: فحص القفل + تفريغ السطح أولاً + انتظار دورة المحرر ثم
    // حقن القالب وإعادة بناء النموذج.
    if (deps.isProgressiveSurfaceLocked()) {
      deps.toast({
        title: "السطح مقفل",
        description:
          "أوقف عملية المعالجة الحالية أو انتظر انتهاءها ثم أعد اختيار المشروع.",
        variant: "destructive",
      });
      return;
    }

    const template =
      PROJECT_TEMPLATE_BY_NAME[
        itemLabel as keyof typeof PROJECT_TEMPLATE_BY_NAME
      ];
    if (!template) {
      logger.warn("Project template is missing for sidebar project item", {
        scope: "sidebar-actions",
        data: {
          sectionId,
          itemLabel,
          availableTemplates: Object.keys(PROJECT_TEMPLATE_BY_NAME),
        },
      });
      deps.toast({
        title: "لا يوجد قالب مشروع مطابق",
        description:
          "اختر مشروعًا مدعومًا من القائمة أو أنشئ مشروعًا من استوديو المخرج قبل المتابعة.",
        variant: "destructive",
      });
      return;
    }

    const html = `
      <div data-type="scene_header_top_line"><div data-type="scene_header_1">${template.sceneHeader1}</div><div data-type="scene_header_2">${template.sceneHeader2}</div></div>
      <div data-type="scene_header_3">${template.sceneHeader3}</div>
      <div data-type="action">${template.action}</div>
    `.trim();

    area.clear();
    area.editor.chain().focus().setContent(html, { emitUpdate: true }).run();
    area.editor.commands.focus("end");
    deps.toast({
      title: "تم تحميل المشروع",
      description: `تم فتح قالب "${itemLabel}" داخل المحرر.`,
    });
    return;
  }

  if (sectionId === "library") {
    const actionId =
      LIBRARY_ACTION_BY_ITEM[itemLabel as keyof typeof LIBRARY_ACTION_BY_ITEM];
    if (actionId) {
      await handleMenuAction(actionId, deps);
      return;
    }

    logger.warn("Library item has no mapped action", {
      scope: "sidebar-actions",
      data: {
        sectionId,
        itemLabel,
        availableActions: Object.keys(LIBRARY_ACTION_BY_ITEM),
      },
    });
    deps.toast({
      title: "عنصر مكتبة غير مدعوم",
      description:
        "هذا العنصر لا يملك إجراءً فعليًا بعد. اختر عنصرًا آخر من عناصر المكتبة المدعومة.",
      variant: "destructive",
    });
    return;
  }

  logger.warn("Unhandled sidebar action fallback reached", {
    scope: "sidebar-actions",
    data: { sectionId, itemLabel },
  });
  deps.toast({
    title: "إجراء غير مدعوم",
    description:
      "العنصر الذي اخترته لا يملك مسار تنفيذ في هذا الإصدار. جرّب عنصرًا آخر أو ارجع إلى استوديو المخرج.",
    variant: "destructive",
  });
};

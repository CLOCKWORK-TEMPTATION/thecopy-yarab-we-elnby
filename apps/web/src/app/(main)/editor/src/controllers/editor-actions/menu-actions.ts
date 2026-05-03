import {
  FORMAT_CYCLE_ORDER,
  FORMAT_LABEL_BY_TYPE,
  LIBRARY_ACTION_BY_ITEM,
  PROJECT_TEMPLATE_BY_NAME,
} from "../../constants/format-mappings";
import { loadFromStorage, saveToStorage } from "../../hooks";
import {
  AUTOSAVE_DRAFT_STORAGE_KEY,
  type EditorAutosaveSnapshot,
} from "../../types/app";
import { logger } from "../../utils/logger";

import { runExport } from "./export-actions";
import { openFile } from "./file-actions";

import type { EditorActionsDeps } from "./types";
import type { EditorArea, FileImportMode } from "../../components/editor";
import type { MenuActionId } from "../../constants/menu-definitions";

const buildLockedSurfaceMessage = () =>
  "انتظر حتى تستقر النسخة الحالية أو نفذ استردادًا صريحًا بعد الفشل قبل بدء تشغيل جديد.";

const LOCKED_ACTIONS = new Set<MenuActionId>([
  "new-file",
  "open-file",
  "insert-file",
  "paste",
  "tool-auto-check",
  "tool-reclassify",
  "restore-draft",
]);

const EXPORT_ACTIONS: Partial<
  Record<
    MenuActionId,
    { format: Parameters<typeof runExport>[0]; fileBase?: string }
  >
> = {
  "export-html": { format: "html", fileBase: "screenplay-export" },
  "export-pdf": { format: "pdf", fileBase: "screenplay-export" },
  "export-pdfa": { format: "pdfa", fileBase: "screenplay-export" },
  "export-fdx": { format: "fdx", fileBase: "screenplay-export" },
  "export-fountain": {
    format: "fountain",
    fileBase: "screenplay-export",
  },
  "export-classified": { format: "classified", fileBase: "النص_المصنف" },
};

const isLockedMenuAction = (actionId: MenuActionId) =>
  LOCKED_ACTIONS.has(actionId);

const handleClipboardAction = async (
  actionId: "copy" | "cut" | "paste",
  area: EditorArea,
  deps: EditorActionsDeps
): Promise<void> => {
  if (actionId === "paste") {
    try {
      const result = await area.pasteFromClipboard("menu");
      if (result.ok) {
        deps.toast({
          title: "تم اللصق",
          description: result.message,
        });
        return;
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
    return;
  }

  const result =
    actionId === "copy"
      ? await area.copySelectionToClipboard()
      : await area.cutSelectionToClipboard();
  const fallbackCommand = actionId === "copy" ? "copy" : "cut";
  const failureTitle = actionId === "copy" ? "تعذر النسخ" : "تعذر القص";
  const successTitle = actionId === "copy" ? "تم النسخ" : "تم القص";

  if (!result.ok && !document.execCommand(fallbackCommand)) {
    deps.toast({
      title: failureTitle,
      description: result.message,
      variant: "destructive",
    });
    deps.recordDiagnostic(failureTitle, result.message);
    return;
  }

  if (result.ok) {
    deps.toast({
      title: successTitle,
      description: result.message,
    });
  }
};

const saveLocalDraft = (area: EditorArea, deps: EditorActionsDeps): void => {
  const snapshot: EditorAutosaveSnapshot = {
    html: area.getAllHtml(),
    text: area.getAllText(),
    updatedAt: new Date().toISOString(),
    version: 2,
  };

  saveToStorage<EditorAutosaveSnapshot>(AUTOSAVE_DRAFT_STORAGE_KEY, snapshot);
  deps.toast({
    title: "تم الحفظ محلياً",
    description:
      "تم حفظ المسودة الحالية في متصفحك. لتصدير الملف اختر «تصدير» من القائمة.",
  });
};

const showDraftInfo = (deps: EditorActionsDeps): void => {
  const snapshot = loadFromStorage<EditorAutosaveSnapshot | null>(
    AUTOSAVE_DRAFT_STORAGE_KEY,
    null
  );
  if (!snapshot?.updatedAt) {
    deps.toast({
      title: "معلومات المسودة",
      description: "لا توجد مسودة محفوظة تلقائيًا حتى الآن.",
    });
    return;
  }

  const updatedAtLabel = new Date(snapshot.updatedAt).toLocaleString("ar-EG");
  deps.toast({
    title: "معلومات المسودة",
    description: `آخر حفظ تلقائي: ${updatedAtLabel}`,
  });
};

const applyProjectTemplate = (
  sectionId: string,
  itemLabel: string,
  deps: EditorActionsDeps
): void => {
  const area = deps.getArea();
  if (!area) return;

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
};

/**
 * مفتاح localStorage لحفظ آخر مستند قبل المسح بـ "مستند جديد".
 * يُستخدم لتمكين الاستعادة بعد المسح غير المقصود.
 *
 * إصلاح P0-1: التقرير وثّق أن "مستند جديد" يمسح المحتوى دون تأكيد.
 * الحل: ConfirmDialog قبل المسح + snapshot احتياطي قابل للاسترجاع.
 */
const NEW_FILE_BACKUP_KEY = "the-copy.editor.v1.last-document-before-new";

interface PreNewBackup {
  html: string;
  text: string;
  savedAt: string;
  version: number;
}

const askNewFileConfirmation = (hasContent: boolean): boolean => {
  if (!hasContent) {
    return true;
  }
  if (typeof window === "undefined") {
    return true;
  }
  // confirm() متزامن وكافٍ كطبقة دفاع أولى ضد الفقد العرضي.
  // عند توفّر ConfirmDialog مخصص يمكن استبداله بنفس الواجهة.
  return window.confirm(
    "سيتم استبدال المستند الحالي بمستند فارغ. سيُحفظ نسخة احتياطية يمكن استرجاعها. هل تريد المتابعة؟",
  );
};

const backupBeforeNewFile = (
  html: string,
  text: string,
  deps: EditorActionsDeps,
): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const backup: PreNewBackup = {
      html,
      text,
      savedAt: new Date().toISOString(),
      version: 1,
    };
    window.localStorage.setItem(NEW_FILE_BACKUP_KEY, JSON.stringify(backup));
  } catch (error) {
    deps.recordDiagnostic(
      "تعذّر حفظ النسخة الاحتياطية قبل مستند جديد",
      error instanceof Error ? error.message : String(error),
    );
  }
};

const runFileMenuAction = async (
  actionId: MenuActionId,
  area: EditorArea,
  deps: EditorActionsDeps
): Promise<boolean> => {
  switch (actionId) {
    case "new-file": {
      const currentHtml = area.getAllHtml().trim();
      const currentText = area.getAllText().trim();
      const hasContent = currentHtml.length > 0 || currentText.length > 0;

      if (!askNewFileConfirmation(hasContent)) {
        return true;
      }

      if (hasContent) {
        backupBeforeNewFile(area.getAllHtml(), area.getAllText(), deps);
      }
      area.clear();
      deps.toast({
        title: "مستند جديد",
        description: hasContent
          ? "تم إنشاء مستند فارغ، وتم حفظ نسخة احتياطية من المستند السابق."
          : "تم إنشاء مستند فارغ.",
      });
      return true;
    }
    case "open-file":
      await openFile("replace", deps);
      return true;
    case "insert-file":
      await openFile("insert", deps);
      return true;
    case "save-file":
      saveLocalDraft(area, deps);
      return true;
    case "print-file":
      window.print();
      return true;
    default:
      return false;
  }
};

const runExportMenuAction = async (
  actionId: MenuActionId,
  deps: EditorActionsDeps
): Promise<boolean> => {
  const exportAction = EXPORT_ACTIONS[actionId];
  if (!exportAction) {
    return false;
  }

  await runExport(exportAction.format, deps, exportAction.fileBase);
  return true;
};

const runEditingMenuAction = async (
  actionId: MenuActionId,
  area: EditorArea,
  deps: EditorActionsDeps
): Promise<boolean> => {
  switch (actionId) {
    case "undo":
    case "redo":
      area.runCommand({ command: actionId });
      return true;
    case "bold":
    case "italic":
    case "underline":
    case "align-right":
    case "align-center":
    case "align-left":
      area.runCommand(actionId);
      return true;
    case "quick-cycle-format": {
      const current = area.getCurrentFormat();
      const currentIndex = current ? FORMAT_CYCLE_ORDER.indexOf(current) : -1;
      const nextFormat =
        currentIndex >= 0
          ? FORMAT_CYCLE_ORDER[(currentIndex + 1) % FORMAT_CYCLE_ORDER.length]
          : FORMAT_CYCLE_ORDER[0];

      if (!nextFormat) {
        return true;
      }

      area.setFormat(nextFormat);
      deps.toast({
        title: "تبديل التنسيق",
        description: `تم التحويل إلى: ${FORMAT_LABEL_BY_TYPE[nextFormat]}`,
      });
      return true;
    }
    case "show-draft-info":
      showDraftInfo(deps);
      return true;
    case "copy":
    case "cut":
    case "paste":
      await handleClipboardAction(actionId, area, deps);
      return true;
    case "select-all":
      area.runCommand({ command: "select-all" });
      return true;
    default:
      return false;
  }
};

const runWorkflowMenuAction = async (
  actionId: MenuActionId,
  deps: EditorActionsDeps
): Promise<boolean> => {
  switch (actionId) {
    case "restore-draft":
      await deps.restoreAutosaveDraft();
      return true;
    case "tool-auto-check":
      await deps.runDocumentThroughPasteWorkflow({
        source: "manual-deferred",
        reviewProfile: "interactive",
        policyProfile: "strict-structure",
      });
      await deps.runForcedProductionSelfCheck("manual-auto-check");
      return true;
    case "tool-reclassify":
      await deps.runDocumentThroughPasteWorkflow({
        source: "manual-deferred",
        reviewProfile: "interactive",
        policyProfile: "interactive-legacy",
      });
      await deps.runForcedProductionSelfCheck("manual-reclassify");
      return true;
    default:
      return false;
  }
};

const runInfoMenuAction = (
  actionId: MenuActionId,
  deps: EditorActionsDeps
): boolean => {
  switch (actionId) {
    case "about":
      deps.toast({
        title: "أفان تيتر",
        description: "واجهة Aceternity + محرك تصنيف Tiptap مفعلين معًا.",
      });
      return true;
    case "help-shortcuts":
      deps.toast({
        title: "اختصارات سريعة",
        description:
          "Ctrl+S حفظ، Ctrl+O فتح، Ctrl+N مستند جديد، Ctrl+Z تراجع، Ctrl+Y إعادة، Ctrl+B/I/U تنسيق.",
      });
      return true;
    default:
      return false;
  }
};

export const handleMenuAction = async (
  actionId: MenuActionId,
  deps: EditorActionsDeps
): Promise<void> => {
  const area = deps.getArea();
  if (!area) return;

  if (deps.resolveMenuCommand(actionId)) return;

  if (deps.isProgressiveSurfaceLocked() && isLockedMenuAction(actionId)) {
    deps.toast({
      title: "التشغيل الحالي لم يستقر بعد",
      description: buildLockedSurfaceMessage(),
      variant: "destructive",
    });
    return;
  }

  if (await runFileMenuAction(actionId, area, deps)) {
    return;
  }

  if (await runExportMenuAction(actionId, deps)) {
    return;
  }

  if (await runEditingMenuAction(actionId, area, deps)) {
    return;
  }

  if (await runWorkflowMenuAction(actionId, deps)) {
    return;
  }

  runInfoMenuAction(actionId, deps);
};

export const handleSidebarItemAction = async (
  sectionId: string,
  itemLabel: string,
  deps: EditorActionsDeps
): Promise<void> => {
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
    applyProjectTemplate(sectionId, itemLabel, deps);
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

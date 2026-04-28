/**
 * @file apps/web/src/lib/app/handlers.ts
 * @description Handlers for the App component.
 */

import { sanitizeTypingSystemSettings } from "../types";

import type { RunDocumentThroughPasteWorkflowOptions, TypingSystemSettings } from "../types";
import type { EditorDiagnosticEvent, MAX_DIAGNOSTIC_EVENTS } from "../types/app";

interface EditorState {
  editorAreaRef: React.RefObject<any>;
  liveTypingWorkflowTimeoutRef: React.RefObject<number | null>;
  applyingTypingWorkflowRef: React.RefObject<boolean>;
  lastLiveWorkflowTextRef: React.RefObject<string>;
  documentText: string;
  progressiveSurfaceState: any;
  typingSystemSettings: TypingSystemSettings;
  setTypingSystemSettings: (settings: TypingSystemSettings) => void;
  setDocumentText: (text: string) => void;
  setDiagnosticEvents: (events: EditorDiagnosticEvent[]) => void;
}

interface HandlerDeps {
  runDocumentThroughPasteWorkflow: (options: RunDocumentThroughPasteWorkflowOptions) => Promise<void>;
  toast: any;
  logger: any;
}

export function createRecordDiagnostic(setDiagnosticEvents: (events: EditorDiagnosticEvent[]) => void) {
  return (title: string, message: string): void => {
    setDiagnosticEvents((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: title.trim() || "تشخيص المحرر",
          message: message.trim() || "حدث خطأ غير معروف.",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, MAX_DIAGNOSTIC_EVENTS)
    );
  };
}

export function createHandleTypingModeChange(
  setTypingSystemSettings: (settings: TypingSystemSettings) => void,
  liveTypingWorkflowTimeoutRef: React.RefObject<number | null>,
  logger: any
) {
  return (nextMode: TypingSystemSettings["typingSystemMode"]): void => {
    setTypingSystemSettings((current) =>
      sanitizeTypingSystemSettings({ ...current, typingSystemMode: nextMode })
    );
    if (
      nextMode !== "auto-live" &&
      liveTypingWorkflowTimeoutRef.current !== null
    ) {
      window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
      liveTypingWorkflowTimeoutRef.current = null;
    }
    logger.info("Typing system mode updated", {
      scope: "typing-system",
      data: { mode: nextMode },
    });
  };
}

export function createHandleLiveIdleMinutesChange(setTypingSystemSettings: (settings: TypingSystemSettings) => void) {
  return (nextMinutes: number): void => {
    setTypingSystemSettings((current) =>
      sanitizeTypingSystemSettings({ ...current, liveIdleMinutes: nextMinutes })
    );
  };
}

export async function runPasteWorkflow(
  state: EditorState,
  options: RunDocumentThroughPasteWorkflowOptions,
  deps: HandlerDeps
): Promise<void> {
  const { runDocumentThroughPasteWorkflow: originalRun, toast, logger } = deps;
  // This is recursive, but in App it's not. Wait, in App it's defined inside, but calls itself? No, in App it's defined and calls itself in live idle.

  // Actually, in App, runDocumentThroughPasteWorkflow is defined and used in live idle effect.

  // So, to avoid recursion, perhaps define it separately.

  // Let's define it as a function that takes the state.

  const area = state.editorAreaRef.current;
  if (!area || area.isSurfaceLocked()) return;
  const fullText = area.getAllText().trim();
  if (!fullText) return;
  if (
    options.source === "live-idle" &&
    fullText === state.lastLiveWorkflowTextRef.current
  )
    return;
  if (state.applyingTypingWorkflowRef.current) return;
  state.applyingTypingWorkflowRef.current = true;
  try {
    await area.importClassifiedText(fullText, "replace");
    state.lastLiveWorkflowTextRef.current = area.getAllText().trim();
    logger.info("Typing workflow executed", {
      scope: "typing-system",
      data: {
        source: options.source,
        reviewProfile: options.reviewProfile,
        policyProfile: options.policyProfile,
      },
    });
    if (!options.suppressToasts)
      toast({
        title:
          options.source === "live-idle"
            ? "تمت المعالجة الحية"
            : "تمت المعالجة المؤجلة",
        description: "تم تمرير كامل المستند عبر مصنف اللصق وتحديث البنية.",
      });
  } catch (error) {
    logger.error("Typing workflow failed", {
      scope: "typing-system",
      data: error,
    });
    if (!options.suppressToasts) {
      // recordDiagnostic needed
      toast({
        title: "تعذر تشغيل نظام الكتابة",
        description:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف أثناء المعالجة.",
        variant: "destructive",
      });
    }
  } finally {
    state.applyingTypingWorkflowRef.current = false;
  }
}

export async function runForcedProductionSelfCheck(
  state: EditorState,
  trigger: "manual-auto-check" | "manual-reclassify",
  deps: HandlerDeps
): Promise<void> {
  const { toast, logger } = deps;
  const area = state.editorAreaRef.current;
  if (!area) return;
  try {
    const { runProductionSelfCheck } =
      await import("../extensions/production-self-check");
    const report = await runProductionSelfCheck({
      trigger,
      sampleText: area.getAllText(),
      force: true,
    });
    if (report.failedFunctions === 0) {
      toast({
        title: "فحص التكامل مكتمل",
        description: `تم تشغيل ${report.executedFunctions} دالة بنجاح عبر مسار الإنتاج.`,
      });
      return;
    }
    toast({
      title: "فحص التكامل اكتشف أخطاء",
      description: `نجح ${report.executedFunctions - report.failedFunctions} وفشل ${report.failedFunctions}.`,
      variant: "destructive",
    });
  } catch (error) {
    logger.error("Forced production self-check failed", {
      scope: "self-check",
      data: error,
    });
    // recordDiagnostic
    toast({
      title: "تعذر تشغيل فحص التكامل",
      description:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير معروف أثناء فحص التكامل.",
      variant: "destructive",
    });
  }
}

export async function restoreAutosaveDraft(
  state: EditorState,
  deps: HandlerDeps
): Promise<void> {
  const { toast } = deps;
  const area = state.editorAreaRef.current;
  if (!area) return;
  const snapshot = readAutosaveSnapshot();
  if (!canRestoreAutosaveSnapshot(snapshot)) {
    toast({
      title: "لا توجد مسودة",
      description: "لم نعثر على مسودة محفوظة لاستعادتها.",
    });
    return;
  }
  try {
    await applyAutosaveSnapshot(area, snapshot);
    state.setDocumentText(area.getAllText());
    toast({
      title: "تمت استعادة المسودة",
      description: "استرجعنا آخر نسخة محفوظة تلقائيًا.",
    });
  } catch (error) {
    // recordDiagnostic
    logger.warn("Manual autosave restore failed", {
      scope: "autosave",
      data: error,
    });
    toast({
      title: "تعذرت استعادة المسودة",
      description:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير معروف أثناء استعادة المسودة.",
      variant: "destructive",
    });
  }
}

export function approveCurrentVersion(state: EditorState, deps: HandlerDeps): void {
  const { toast } = deps;
  const area = state.editorAreaRef.current;
  if (!area) return;
  try {
    area.approveCurrentVersion();
    toast({
      title: "تم اعتماد النسخة",
      description: "تم وسم كل العناصر الظاهرة في النسخة المعتمدة.",
    });
  } catch (error) {
    // recordDiagnostic
    toast({
      title: "تعذر اعتماد النسخة",
      description:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير معروف أثناء اعتماد النسخة.",
      variant: "destructive",
    });
  }
}

export function dismissProgressiveFailure(state: EditorState): void {
  const area = state.editorAreaRef.current;
  if (!area) return;
  if (!area.dismissProgressiveFailure()) return;
  // toast
}
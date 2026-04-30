/**
 * @file handlers.ts
 * @description Factory functions تُنتج المعالجات المرتبطة بحالة المحرر.
 *   كل factory يأخذ ما يحتاج من state/deps ويعيد دالة يستخدمها App مباشرة.
 */

import { getCurrentProject } from "@/lib/projectStore";

import {
  minutesToMilliseconds,
  sanitizeTypingSystemSettings,
  type RunDocumentThroughPasteWorkflowOptions,
  type TypingSystemSettings,
} from "../../types";

import { MAX_DIAGNOSTIC_EVENTS, type EditorDiagnosticEvent } from "./constants";
import {
  applyAutosaveSnapshot,
  canRestoreAutosaveSnapshot,
  readAutosaveSnapshot,
} from "./utils";

import type { EditorArea } from "../../components/editor";
import type { MenuActionId } from "../../constants/menu-definitions";
import type { toast as toastFn } from "../../hooks";
import type { EditorAppStateValues } from "../../hooks/use-editor-state";
import type { logger } from "../../utils/logger";
import type { Dispatch, SetStateAction } from "react";

type Logger = typeof logger;

export type ToastFn = typeof toastFn;

export interface EditorAppRefs {
  editorMountRef: { current: HTMLDivElement | null };
  editorAreaRef: { current: EditorArea | null };
  liveTypingWorkflowTimeoutRef: { current: number | null };
  applyingTypingWorkflowRef: { current: boolean };
  lastLiveWorkflowTextRef: { current: string };
  handleMenuActionRef: {
    current: ((id: MenuActionId) => Promise<void>) | null;
  };
}

export interface HandlerDeps {
  toast: ToastFn;
  logger: Logger;
}

export const createRecordDiagnostic = (
  setDiagnosticEvents: Dispatch<SetStateAction<EditorDiagnosticEvent[]>>
): ((title: string, message: string) => void) => {
  return (title: string, message: string): void => {
    const normalizedTitle = title.trim() || "تشخيص المحرر";
    const normalizedMessage = message.trim() || "حدث خطأ غير معروف.";
    setDiagnosticEvents((current) =>
      [
        {
          id: `${String(Date.now())}-${Math.random().toString(36).slice(2, 7)}`,
          title: normalizedTitle,
          message: normalizedMessage,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, MAX_DIAGNOSTIC_EVENTS)
    );
  };
};

export const createHandleTypingModeChange = (
  setTypingSystemSettings: Dispatch<SetStateAction<TypingSystemSettings>>,
  liveTypingWorkflowTimeoutRef: { current: number | null },
  logger: Logger
): ((nextMode: TypingSystemSettings["typingSystemMode"]) => void) => {
  return (nextMode): void => {
    setTypingSystemSettings((current) =>
      sanitizeTypingSystemSettings({
        ...current,
        typingSystemMode: nextMode,
      })
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
};

export const createHandleLiveIdleMinutesChange = (
  setTypingSystemSettings: Dispatch<SetStateAction<TypingSystemSettings>>
): ((nextMinutes: number) => void) => {
  return (nextMinutes: number): void => {
    setTypingSystemSettings((current) =>
      sanitizeTypingSystemSettings({
        ...current,
        liveIdleMinutes: nextMinutes,
      })
    );
  };
};

export const runPasteWorkflow = async (
  refs: EditorAppRefs,
  options: RunDocumentThroughPasteWorkflowOptions,
  deps: HandlerDeps & {
    recordDiagnostic: (title: string, message: string) => void;
  }
): Promise<void> => {
  const area = refs.editorAreaRef.current;
  if (!area) return;
  if (area.isSurfaceLocked()) return;

  const fullText = area.getAllText().trim();
  if (!fullText) return;

  if (
    options.source === "live-idle" &&
    fullText === refs.lastLiveWorkflowTextRef.current
  ) {
    return;
  }

  if (refs.applyingTypingWorkflowRef.current) return;
  refs.applyingTypingWorkflowRef.current = true;

  try {
    await area.importClassifiedText(fullText, "replace");
    refs.lastLiveWorkflowTextRef.current = area.getAllText().trim();

    deps.logger.info("Typing workflow executed", {
      scope: "typing-system",
      data: {
        source: options.source,
        reviewProfile: options.reviewProfile,
        policyProfile: options.policyProfile,
      },
    });

    if (!options.suppressToasts) {
      deps.toast({
        title:
          options.source === "live-idle"
            ? "تمت المعالجة الحية"
            : "تمت المعالجة المؤجلة",
        description: "تم تمرير كامل المستند عبر مصنف اللصق وتحديث البنية.",
      });
    }
  } catch (error) {
    deps.logger.error("Typing workflow failed", {
      scope: "typing-system",
      data: error,
    });
    if (!options.suppressToasts) {
      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ غير معروف أثناء المعالجة.";
      deps.recordDiagnostic("تعذر تشغيل نظام الكتابة", message);
      deps.toast({
        title: "تعذر تشغيل نظام الكتابة",
        description: message,
        variant: "destructive",
      });
    }
  } finally {
    refs.applyingTypingWorkflowRef.current = false;
  }
};

export const runForcedProductionSelfCheck = async (
  refs: EditorAppRefs,
  trigger: "manual-auto-check" | "manual-reclassify",
  deps: HandlerDeps & {
    recordDiagnostic: (title: string, message: string) => void;
  }
): Promise<void> => {
  const area = refs.editorAreaRef.current;
  if (!area) return;

  try {
    const { runProductionSelfCheck } =
      await import("../../extensions/production-self-check");
    const report = await runProductionSelfCheck({
      trigger,
      sampleText: area.getAllText(),
      force: true,
    });

    if (report.failedFunctions === 0) {
      deps.toast({
        title: "فحص التكامل مكتمل",
        description: `تم تشغيل ${String(report.executedFunctions)} دالة بنجاح عبر مسار الإنتاج.`,
      });
      return;
    }

    deps.toast({
      title: "فحص التكامل اكتشف أخطاء",
      description: `نجح ${String(report.executedFunctions - report.failedFunctions)} وفشل ${String(report.failedFunctions)}.`,
      variant: "destructive",
    });
  } catch (error) {
    deps.logger.error("Forced production self-check failed", {
      scope: "self-check",
      data: error,
    });
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف أثناء فحص التكامل.";
    deps.recordDiagnostic("تعذر تشغيل فحص التكامل", message);
    deps.toast({
      title: "تعذر تشغيل فحص التكامل",
      description: message,
      variant: "destructive",
    });
  }
};

export const restoreAutosaveDraft = async (
  state: EditorAppStateValues,
  refs: EditorAppRefs,
  deps: { toast: ToastFn } & {
    recordDiagnostic?: (title: string, message: string) => void;
    logger?: Logger;
  }
): Promise<void> => {
  const area = refs.editorAreaRef.current;
  if (!area) return;

  const snapshot = readAutosaveSnapshot();

  if (!canRestoreAutosaveSnapshot(snapshot)) {
    deps.toast({
      title: "لا توجد مسودة",
      description: "لم نعثر على مسودة محفوظة لاستعادتها.",
    });
    return;
  }

  try {
    await applyAutosaveSnapshot(area, snapshot);
    state.setDocumentText(area.getAllText());
    deps.toast({
      title: "تمت استعادة المسودة",
      description: "استرجعنا آخر نسخة محفوظة تلقائيًا.",
    });
  } catch (error) {
    deps.logger?.warn("Manual autosave restore failed", {
      scope: "autosave",
      data: error,
    });
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف أثناء استعادة المسودة.";
    deps.recordDiagnostic?.("تعذرت استعادة المسودة", message);
    deps.toast({
      title: "تعذرت استعادة المسودة",
      description: message,
      variant: "destructive",
    });
  }
};

export const approveCurrentVersion = (
  refs: EditorAppRefs,
  deps: { toast: ToastFn } & {
    recordDiagnostic?: (title: string, message: string) => void;
  }
): void => {
  const area = refs.editorAreaRef.current;
  if (!area) return;

  const currentProject = getCurrentProject();
  const context = currentProject?.id
    ? {
        scenarioId: currentProject.id,
        scenarioTitle: currentProject.title ?? currentProject.name ?? null,
      }
    : undefined;

  void area
    .approveCurrentVersion(context)
    .then(() => {
      deps.toast({
        title: "تم اعتماد النسخة",
        description:
          "تم وسم كل العناصر الظاهرة وحفظ النسخة الموصومة المعتمدة.",
      });
    })
    .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف أثناء اعتماد النسخة.";
    deps.recordDiagnostic?.("تعذر اعتماد النسخة", message);
    deps.toast({
      title: "تعذر اعتماد النسخة",
      description: message,
      variant: "destructive",
    });
    });
};

export const dismissProgressiveFailure = (refs: EditorAppRefs): boolean => {
  const area = refs.editorAreaRef.current;
  if (!area) return false;
  return area.dismissProgressiveFailure();
};

export const computeLiveIdleDelayMs = (
  typingSystemSettings: TypingSystemSettings
): number => minutesToMilliseconds(typingSystemSettings.liveIdleMinutes);

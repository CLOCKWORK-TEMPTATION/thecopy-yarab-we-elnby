import {
  BREAKDOWN_PROJECT_STORAGE_KEY,
  BREAKDOWN_REPORT_ID_STORAGE_KEY,
  BREAKDOWN_REPORT_STORAGE_KEY,
} from "../../domain/constants";
import { logError } from "../../domain/errors";
import { validateBreakdownReport } from "../../domain/schemas";
import type { BreakdownReportOutput } from "../../domain/schemas";

const REPORT_ERRORS = {
  missingResults: "لم يتم العثور على تقرير بريك دون محفوظ.",
  invalidFormat: "تنسيق تقرير البريك دون غير صالح.",
  loadFailed: "فشل في تحميل تقرير البريك دون.",
} as const;

type ReportStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ReadAnalysisReportResult =
  | { success: true; data: BreakdownReportOutput }
  | { success: false; error: string };

export function writeAnalysisReportToStorage(
  report: BreakdownReportOutput,
  storage: ReportStorageLike = sessionStorage
): void {
  storage.setItem(BREAKDOWN_REPORT_STORAGE_KEY, JSON.stringify(report));
  storage.setItem(BREAKDOWN_PROJECT_STORAGE_KEY, report.projectId);
  storage.setItem(BREAKDOWN_REPORT_ID_STORAGE_KEY, report.id);
}

export function clearStoredAnalysisReport(
  storage: ReportStorageLike = sessionStorage
): void {
  storage.removeItem(BREAKDOWN_REPORT_STORAGE_KEY);
  storage.removeItem(BREAKDOWN_PROJECT_STORAGE_KEY);
  storage.removeItem(BREAKDOWN_REPORT_ID_STORAGE_KEY);
}

export function readStoredProjectId(
  storage: Pick<Storage, "getItem"> = sessionStorage
): string | null {
  return storage.getItem(BREAKDOWN_PROJECT_STORAGE_KEY);
}

export function readStoredReportId(
  storage: Pick<Storage, "getItem"> = sessionStorage
): string | null {
  return storage.getItem(BREAKDOWN_REPORT_ID_STORAGE_KEY);
}

export function readAnalysisReportFromStorage(
  storage: Pick<Storage, "getItem"> = sessionStorage
): ReadAnalysisReportResult {
  try {
    const rawReport = storage.getItem(BREAKDOWN_REPORT_STORAGE_KEY);

    if (!rawReport) {
      return { success: false, error: REPORT_ERRORS.missingResults };
    }

    const parsed = JSON.parse(rawReport) as unknown;
    const validationResult = validateBreakdownReport(parsed);

    if (!validationResult.success) {
      logError(
        "readAnalysisReportFromStorage",
        new Error(validationResult.error)
      );
      return { success: false, error: REPORT_ERRORS.invalidFormat };
    }

    return { success: true, data: validationResult.data };
  } catch (error) {
    logError("readAnalysisReportFromStorage", error);
    return { success: false, error: REPORT_ERRORS.loadFailed };
  }
}

export const breakdownReportErrors = REPORT_ERRORS;

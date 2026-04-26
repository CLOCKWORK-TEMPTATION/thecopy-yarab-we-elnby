import { logError } from "../../domain/errors";
import {
  validateBreakdownReport,
  type BreakdownReportOutput,
} from "../../domain/schemas";

import {
  readAnalysisReportFromStorage,
  type ReadAnalysisReportResult,
} from "./report-storage";

export async function loadAnalysisReport(
  storage: Storage | undefined
): Promise<{
  report: BreakdownReportOutput | null;
  storageResult: ReadAnalysisReportResult | null;
}> {
  const storedReportResult =
    typeof window === "undefined" || !storage
      ? null
      : readAnalysisReportFromStorage(storage);

  if (storedReportResult?.success) {
    return {
      report: storedReportResult.data,
      storageResult: storedReportResult,
    };
  }

  if (storedReportResult && !storedReportResult.success) {
    logError("loadAnalysisReport", new Error(storedReportResult.error));
  }

  if (typeof fetch === "function") {
    try {
      const response = await fetch("/analysis_output/final-report.json");
      if (response.ok) {
        const parsed = validateBreakdownReport(await response.json());
        if (parsed.success) {
          return {
            report: parsed.data,
            storageResult: storedReportResult,
          };
        }
        logError("loadAnalysisReport", new Error(parsed.error));
      }
    } catch (error) {
      logError("loadAnalysisReport", error);
    }
  }

  return { report: null, storageResult: storedReportResult };
}

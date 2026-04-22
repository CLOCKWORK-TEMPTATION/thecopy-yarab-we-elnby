import { logError } from "../../domain/errors";
import { type BreakdownReportOutput } from "../../domain/schemas";
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

  return { report: null, storageResult: storedReportResult };
}

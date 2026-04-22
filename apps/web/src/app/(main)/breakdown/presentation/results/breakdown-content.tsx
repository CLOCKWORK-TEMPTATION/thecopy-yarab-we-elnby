"use client";

import { useCallback, useEffect, useState } from "react";
import { logError } from "../../domain/errors";
import { loadAnalysisReport } from "../../application/report/report-loader";
import {
  BreakdownLoadingState,
  BreakdownMessageState,
  BreakdownReportView,
} from "../shared/breakdown-report-view";
import type { AnalysisReportOutput } from "../../domain/schemas";

export default function BreakdownContent() {
  const [report, setReport] = useState<AnalysisReportOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadAnalysisReport(
        typeof window === "undefined" ? undefined : window.sessionStorage
      );

      if (result.report) {
        setReport(result.report);
        return;
      }

      const fallbackMessage =
        result.storageResult && !result.storageResult.success
          ? result.storageResult.error
          : "فشل في تحميل تقرير التحليل";

      setError(fallbackMessage);
    } catch (fetchError) {
      logError("BreakdownContent.fetchReport", fetchError);
      setError("فشل في تحميل تقرير التحليل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  if (loading) {
    return <BreakdownLoadingState />;
  }

  if (error || !report) {
    return (
      <BreakdownMessageState
        title="تحليل النص"
        message={error ?? "لم يتم العثور على تقرير تحليل."}
      />
    );
  }

  return <BreakdownReportView report={report} />;
}

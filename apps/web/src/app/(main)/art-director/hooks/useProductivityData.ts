"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchArtDirectorJson } from "@/app/(main)/art-director/lib/api-client";

import type { ApiResponse } from "@/app/(main)/art-director/types";
import type {
  DelayFormData,
  ProductivityAnalysis,
  ProductivitySummaryResponse,
  TimeFormData,
} from "@/app/(main)/art-director/components/productivity/types";
import {
  DEFAULT_DELAY_FORM,
  DEFAULT_TIME_FORM,
  EMPTY_ANALYSIS,
} from "@/app/(main)/art-director/components/productivity/types";

function parseValidNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function useProductivityData() {
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [chartData, setChartData] = useState<
    ProductivitySummaryResponse["chartData"]
  >([]);
  const [pieData, setPieData] = useState<
    ProductivitySummaryResponse["pieData"]
  >([]);
  const [analysis, setAnalysis] =
    useState<ProductivityAnalysis>(EMPTY_ANALYSIS);
  const [timeForm, setTimeForm] = useState<TimeFormData>(DEFAULT_TIME_FORM);
  const [delayForm, setDelayForm] = useState<DelayFormData>(DEFAULT_DELAY_FORM);
  const [error, setError] = useState<string | null>(null);

  const maxHours = useMemo(
    () => Math.max(...chartData.map((item) => item.hours), 1),
    [chartData]
  );

  const loadSummary = useCallback(async () => {
    const summary = await fetchArtDirectorJson<
      ApiResponse<ProductivitySummaryResponse>
    >("/productivity/summary");

    if (!summary.success || !summary.data) {
      throw new Error(summary.error ?? "فشل في تحميل ملخص الإنتاجية");
    }

    return summary.data;
  }, []);

  const loadAnalysis = useCallback(async () => {
    const summary = await fetchArtDirectorJson<
      ApiResponse<ProductivityAnalysis>
    >("/analyze/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!summary.success || !summary.data) {
      throw new Error(summary.error ?? "فشل في تحميل مؤشرات الإنتاجية");
    }

    return summary.data;
  }, []);

  const applySnapshot = useCallback(
    async (clearError: boolean) => {
      const [summaryData, analysisData] = await Promise.all([
        loadSummary(),
        loadAnalysis(),
      ]);

      setChartData(summaryData.chartData);
      setPieData(summaryData.pieData);
      setAnalysis(analysisData);
      if (clearError) {
        setError(null);
      }
    },
    [loadAnalysis, loadSummary]
  );

  const refreshProductivity = useCallback(async () => {
    try {
      await applySnapshot(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تحديث البيانات";
      setError(errorMessage);
    }
  }, [applySnapshot]);

  const loadRecommendations = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<{ recommendations: string[] }>
      >("/productivity/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (data.success && data.data?.recommendations) {
        setRecommendations(data.data.recommendations);
      } else {
        setError(data.error ?? "فشل في تحميل التوصيات");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التحميل";
      setError(errorMessage);
    }
  }, []);

  const handleLogTime = useCallback(async () => {
    setError(null);

    const hours = parseValidNumber(timeForm.hours);
    if (hours === null || hours <= 0) {
      setError("يرجى إدخال عدد ساعات صحيح");
      return;
    }

    if (!timeForm.task.trim()) {
      setError("يرجى إدخال وصف المهمة");
      return;
    }

    try {
      const data = await fetchArtDirectorJson<ApiResponse>(
        "/productivity/log-time",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: timeForm.task,
            hours,
            category: timeForm.category,
          }),
        }
      );

      if (data.success) {
        setShowTimeForm(false);
        setTimeForm(DEFAULT_TIME_FORM);
        await refreshProductivity();
      } else {
        setError(data.error ?? "فشل في تسجيل الوقت");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل";
      setError(errorMessage);
    }
  }, [refreshProductivity, timeForm]);

  const handleReportDelay = useCallback(async () => {
    setError(null);

    const hoursLost = parseValidNumber(delayForm.hoursLost);
    if (hoursLost === null || hoursLost <= 0) {
      setError("يرجى إدخال عدد الساعات المفقودة");
      return;
    }

    if (!delayForm.reason.trim()) {
      setError("يرجى إدخال سبب التأخير");
      return;
    }

    try {
      const data = await fetchArtDirectorJson<ApiResponse>(
        "/productivity/report-delay",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: delayForm.reason,
            impact: delayForm.impact,
            hoursLost,
          }),
        }
      );

      if (data.success) {
        setShowDelayForm(false);
        setDelayForm(DEFAULT_DELAY_FORM);
        await refreshProductivity();
      } else {
        setError(data.error ?? "فشل في الإبلاغ عن التأخير");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء الإبلاغ";
      setError(errorMessage);
    }
  }, [delayForm, refreshProductivity]);

  const handleTimeFormChange = useCallback((data: Partial<TimeFormData>) => {
    setTimeForm((previous) => ({ ...previous, ...data }));
  }, []);

  const handleDelayFormChange = useCallback((data: Partial<DelayFormData>) => {
    setDelayForm((previous) => ({ ...previous, ...data }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialSnapshot = async () => {
      try {
        const [summaryData, analysisData] = await Promise.all([
          loadSummary(),
          loadAnalysis(),
        ]);
        if (cancelled) {
          return;
        }
        setChartData(summaryData.chartData);
        setPieData(summaryData.pieData);
        setAnalysis(analysisData);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "حدث خطأ أثناء تحديث البيانات"
        );
      }
    };

    void loadInitialSnapshot();

    return () => {
      cancelled = true;
    };
  }, [loadAnalysis, loadSummary]);

  return {
    analysis,
    chartData,
    delayForm,
    error,
    handleDelayFormChange,
    handleLogTime,
    handleReportDelay,
    handleTimeFormChange,
    loadRecommendations,
    maxHours,
    pieData,
    recommendations,
    setShowDelayForm,
    setShowTimeForm,
    showDelayForm,
    showTimeForm,
    timeForm,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_DELAY_FORM,
  DEFAULT_TIME_FORM,
  EMPTY_ANALYSIS,
} from "@/app/(main)/art-director/components/productivity/types";
import {
  loadProductivityAnalysis,
  loadProductivityRecommendations,
  loadProductivitySummary,
  submitLoggedTime,
  submitReportedDelay,
} from "@/app/(main)/art-director/lib/productivity-api";

import type {
  DelayFormData,
  ProductivityAnalysis,
  ProductivitySummaryResponse,
  TimeFormData,
} from "@/app/(main)/art-director/components/productivity/types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function parseValidNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function useProductivitySnapshot() {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [chartData, setChartData] = useState<
    ProductivitySummaryResponse["chartData"]
  >([]);
  const [pieData, setPieData] = useState<ProductivitySummaryResponse["pieData"]>(
    [],
  );
  const [analysis, setAnalysis] =
    useState<ProductivityAnalysis>(EMPTY_ANALYSIS);
  const [error, setError] = useState<string | null>(null);

  const applySnapshot = useCallback(
    async (clearError: boolean) => {
      const [summaryData, analysisData] = await Promise.all([
        loadProductivitySummary(),
        loadProductivityAnalysis(),
      ]);

      setChartData(summaryData.chartData);
      setPieData(summaryData.pieData);
      setAnalysis(analysisData);
      if (clearError) {
        setError(null);
      }
    },
    [],
  );

  const refreshProductivity = useCallback(async () => {
    try {
      await applySnapshot(true);
    } catch (error) {
      setError(getErrorMessage(error, "حدث خطأ أثناء تحديث البيانات"));
    }
  }, [applySnapshot]);

  const loadRecommendations = useCallback(async () => {
    setError(null);

    try {
      setRecommendations(await loadProductivityRecommendations());
    } catch (error) {
      setError(getErrorMessage(error, "حدث خطأ أثناء التحميل"));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialSnapshot = async () => {
      try {
        const [summaryData, analysisData] = await Promise.all([
          loadProductivitySummary(),
          loadProductivityAnalysis(),
        ]);
        if (cancelled) {
          return;
        }

        setChartData(summaryData.chartData);
        setPieData(summaryData.pieData);
        setAnalysis(analysisData);
        setError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(error, "حدث خطأ أثناء تحديث البيانات"));
      }
    };

    void loadInitialSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    analysis,
    chartData,
    error,
    loadRecommendations,
    pieData,
    recommendations,
    refreshProductivity,
    setError,
  };
}

export function useProductivityForms(
  refreshProductivity: () => Promise<void>,
  setError: (value: string | null) => void,
) {
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [timeForm, setTimeForm] = useState<TimeFormData>(DEFAULT_TIME_FORM);
  const [delayForm, setDelayForm] = useState<DelayFormData>(DEFAULT_DELAY_FORM);

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
      await submitLoggedTime({
        category: timeForm.category,
        hours,
        task: timeForm.task,
      });
      setShowTimeForm(false);
      setTimeForm(DEFAULT_TIME_FORM);
      await refreshProductivity();
    } catch (error) {
      setError(getErrorMessage(error, "حدث خطأ أثناء التسجيل"));
    }
  }, [refreshProductivity, setError, timeForm]);

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
      await submitReportedDelay({
        hoursLost,
        impact: delayForm.impact,
        reason: delayForm.reason,
      });
      setShowDelayForm(false);
      setDelayForm(DEFAULT_DELAY_FORM);
      await refreshProductivity();
    } catch (error) {
      setError(getErrorMessage(error, "حدث خطأ أثناء الإبلاغ"));
    }
  }, [delayForm, refreshProductivity, setError]);

  return {
    delayForm,
    handleDelayFormChange: (data: Partial<DelayFormData>) =>
      setDelayForm((previous) => ({ ...previous, ...data })),
    handleLogTime,
    handleReportDelay,
    handleTimeFormChange: (data: Partial<TimeFormData>) =>
      setTimeForm((previous) => ({ ...previous, ...data })),
    setShowDelayForm,
    setShowTimeForm,
    showDelayForm,
    showTimeForm,
    timeForm,
  };
}

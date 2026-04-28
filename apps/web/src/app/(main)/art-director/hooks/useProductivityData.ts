"use client";

import { useMemo } from "react";

import {
  useProductivityForms,
  useProductivitySnapshot,
} from "@/app/(main)/art-director/hooks/useProductivitySupport";

export function useProductivityData() {
  const {
    analysis,
    chartData,
    error,
    loadRecommendations,
    pieData,
    recommendations,
    refreshProductivity,
    setError,
  } = useProductivitySnapshot();
  const {
    delayForm,
    handleDelayFormChange,
    handleLogTime,
    handleReportDelay,
    handleTimeFormChange,
    setShowDelayForm,
    setShowTimeForm,
    showDelayForm,
    showTimeForm,
    timeForm,
  } = useProductivityForms(refreshProductivity, setError);

  const maxHours = useMemo(
    () => Math.max(...chartData.map((item) => item.hours), 1),
    [chartData]
  );

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

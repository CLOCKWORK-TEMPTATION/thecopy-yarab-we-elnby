"use client";

import { useMemo, useState } from "react";

import { DashboardErrorState } from "@/components/ui/system-metrics-dashboard.error";
import { RecommendationsCard } from "@/components/ui/system-metrics-dashboard.recommendations";
import {
  DashboardHeader,
  MainMetricsGrid,
  PerformanceAlerts,
  ResourceAndQueueSection,
  SystemHealthCard,
} from "@/components/ui/system-metrics-dashboard.sections";
import {
  buildQueueChartData,
  formatLastUpdated,
  type AutoRefreshConfig,
  type DashboardDataType,
  type HealthStatusType,
  type ReportDataType,
} from "@/components/ui/system-metrics-dashboard.types";
import {
  useDashboardSummary,
  useHealthStatus,
  usePerformanceReport,
} from "@/hooks/useMetrics";

export default function SystemMetricsDashboard() {
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshConfig>({
    enabled: true,
    interval: 30000,
  });

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    dataUpdatedAt,
  } = useDashboardSummary(
    autoRefresh.enabled ? autoRefresh.interval : undefined
  ) as {
    data: DashboardDataType | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    dataUpdatedAt: number | undefined;
  };

  const {
    data: healthData,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useHealthStatus(autoRefresh.enabled ? 15000 : undefined) as {
    data: HealthStatusType | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const {
    data: reportData,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = usePerformanceReport() as {
    data: ReportDataType | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const isLoading = isDashboardLoading || isHealthLoading || isReportLoading;
  const lastUpdated = useMemo(
    () => formatLastUpdated(dataUpdatedAt),
    [dataUpdatedAt]
  );
  const queueChartData = useMemo(
    () => buildQueueChartData(dashboardData),
    [dashboardData]
  );

  const handleManualRefresh = () => {
    refetchDashboard();
    refetchHealth();
    refetchReport();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  if (dashboardError) {
    return (
      <DashboardErrorState
        error={dashboardError}
        onManualRefresh={handleManualRefresh}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DashboardHeader
        autoRefresh={autoRefresh}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        onManualRefresh={handleManualRefresh}
        onToggleAutoRefresh={toggleAutoRefresh}
      />
      <SystemHealthCard dashboardData={dashboardData} healthData={healthData} />
      <MainMetricsGrid dashboardData={dashboardData} />
      <ResourceAndQueueSection
        dashboardData={dashboardData}
        queueChartData={queueChartData}
      />
      <PerformanceAlerts reportData={reportData} />
      <RecommendationsCard reportData={reportData} />
    </div>
  );
}

"use client";

/**
 * System Metrics Dashboard
 *
 * Comprehensive dashboard for monitoring system performance metrics
 * Features:
 * - Real-time metrics with auto-refresh
 * - Interactive charts
 * - Health status monitoring
 * - Performance alerts
 */

import {
  BarChart3,
  Database,
  Zap,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Cpu,
  Network,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DynamicPieChart as PieChart,
  DynamicPie as Pie,
} from "@/components/ui/dynamic-chart";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDashboardSummary,
  useHealthStatus,
  usePerformanceReport,
} from "@/hooks/useMetrics";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
};

interface AutoRefreshConfig {
  enabled: boolean;
  interval: number; // in milliseconds
}

interface HealthStatusType {
  status: "healthy" | "degraded" | "critical";
}

interface DashboardDataType {
  overview: {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
    cacheHitRatio: number;
  };
  queue: {
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
  resources: {
    concurrentRequests: number;
    cpu: {
      usage: number;
    };
    memory: {
      used: number;
      total: number;
      percent: number;
    };
  };
  database: {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
  };
  gemini: {
    totalRequests: number;
    cacheHitRatio: number;
  };
  redis: {
    memoryUsage: number;
  };
}

interface ReportDataType {
  alerts?: {
    message: string;
    metric: string;
    value: number;
    threshold: number;
    severity: "critical" | "warning" | "info";
  }[];
  recommendations?: string[];
}

export default function SystemMetricsDashboard() {
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshConfig>({
    enabled: true,
    interval: 30000, // 30 seconds
  });

  // Fetch data with auto-refresh
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

  // Manual refresh handler
  const handleManualRefresh = () => {
    refetchDashboard();
    refetchHealth();
    refetchReport();
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  // Get status color and icon
  const getHealthStatus = () => {
    if (!healthData)
      return { color: "gray", icon: Activity, text: "غير معروف" };

    switch (healthData.status) {
      case "healthy":
        return { color: "green", icon: CheckCircle2, text: "صحي" };
      case "degraded":
        return { color: "yellow", icon: AlertTriangle, text: "متدهور" };
      case "critical":
        return { color: "red", icon: XCircle, text: "حرج" };
      default:
        return { color: "gray", icon: Activity, text: "غير معروف" };
    }
  };

  const healthStatus = getHealthStatus();

  // Format last updated time
  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return "لم يتم التحديث بعد";
    const date = new Date(dataUpdatedAt);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `منذ ${diffSeconds} ثانية`;
    if (diffSeconds < 3600) return `منذ ${Math.floor(diffSeconds / 60)} دقيقة`;
    return `منذ ${Math.floor(diffSeconds / 3600)} ساعة`;
  }, [dataUpdatedAt]);

  // Prepare chart data for queue status
  const queueChartData = useMemo(() => {
    if (!dashboardData) return [];
    return [
      { name: "نشط", value: dashboardData.queue.active, color: COLORS.info },
      {
        name: "مكتمل",
        value: dashboardData.queue.completed,
        color: COLORS.success,
      },
      { name: "فاشل", value: dashboardData.queue.failed, color: COLORS.danger },
    ];
  }, [dashboardData]);

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  if (dashboardError) {
    return (
      <div className="p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              خطأ في تحميل البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {dashboardError.message || "حدث خطأ أثناء جلب البيانات"}
            </p>
            <Button onClick={handleManualRefresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8" />
            لوحة مقاييس النظام
          </h1>
          <p className="text-muted-foreground">
            مراقبة شاملة لأداء النظام في الوقت الفعلي
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            آخر تحديث: {lastUpdated}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoRefresh}
            className={autoRefresh.enabled ? "bg-green-50" : ""}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${autoRefresh.enabled ? "animate-spin" : ""}`}
            />
            {autoRefresh.enabled ? "تحديث تلقائي" : "تحديث يدوي"}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث الآن
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      <Card className={`border-${healthStatus.color}-500`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {React.createElement(healthStatus.icon, {
              className: `w-5 h-5 text-${healthStatus.color}-600`,
            })}
            حالة النظام: {healthStatus.text}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">معدل الخطأ</p>
              <p className="text-2xl font-bold">
                {dashboardData
                  ? formatPercentage(dashboardData.overview.errorRate)
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">وقت الاستجابة</p>
              <p className="text-2xl font-bold">
                {dashboardData
                  ? `${dashboardData.overview.avgResponseTime.toFixed(0)} ms`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">نسبة Cache Hit</p>
              <p className="text-2xl font-bold">
                {dashboardData
                  ? formatPercentage(dashboardData.overview.cacheHitRatio)
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الطلبات النشطة</p>
              <p className="text-2xl font-bold">
                {dashboardData
                  ? formatNumber(dashboardData.resources.concurrentRequests)
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الطلبات
            </CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData
                ? formatNumber(dashboardData.overview.totalRequests)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData && dashboardData.overview.errorRate < 0.05 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  أداء جيد
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  يحتاج انتباه
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Database Queries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              استعلامات قاعدة البيانات
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData
                ? formatNumber(dashboardData.database.totalQueries)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              متوسط:{" "}
              {dashboardData
                ? `${dashboardData.database.avgDuration.toFixed(1)} ms`
                : "-"}
            </p>
            {dashboardData && dashboardData.database.slowQueries > 0 && (
              <Badge variant="destructive" className="mt-2">
                {dashboardData.database.slowQueries} استعلام بطيء
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              الوظائف النشطة
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData ? dashboardData.queue.active : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              إجمالي:{" "}
              {dashboardData ? formatNumber(dashboardData.queue.total) : "-"}
            </p>
            {dashboardData && dashboardData.queue.failed > 0 && (
              <Badge variant="destructive" className="mt-2">
                {dashboardData.queue.failed} فاشل
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Gemini API */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gemini API</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData
                ? formatNumber(dashboardData.gemini.totalRequests)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Cache Hit:{" "}
              {dashboardData
                ? formatPercentage(dashboardData.gemini.cacheHitRatio)
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              استخدام الموارد
            </CardTitle>
            <CardDescription>استهلاك الذاكرة والمعالج</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CPU Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">المعالج (CPU)</span>
                <Badge
                  variant={
                    dashboardData?.resources?.cpu?.usage &&
                    dashboardData.resources.cpu.usage > 80
                      ? "destructive"
                      : dashboardData?.resources?.cpu?.usage &&
                          dashboardData.resources.cpu.usage > 60
                        ? "default"
                        : "secondary"
                  }
                >
                  {dashboardData?.resources?.cpu?.usage
                    ? `${dashboardData.resources.cpu.usage.toFixed(1)}%`
                    : "-"}
                </Badge>
              </div>
              <Progress
                value={dashboardData?.resources.cpu.usage ?? 0}
                className="h-2"
              />
            </div>

            {/* Memory Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">الذاكرة (Memory)</span>
                <Badge
                  variant={
                    dashboardData?.resources?.memory?.percent &&
                    dashboardData.resources.memory.percent > 80
                      ? "destructive"
                      : dashboardData?.resources?.memory?.percent &&
                          dashboardData.resources.memory.percent > 60
                        ? "default"
                        : "secondary"
                  }
                >
                  {dashboardData?.resources?.memory?.percent
                    ? `${dashboardData.resources.memory.percent.toFixed(1)}%`
                    : "-"}
                </Badge>
              </div>
              <Progress
                value={dashboardData?.resources.memory.percent ?? 0}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardData
                  ? `${formatBytes(dashboardData.resources.memory.used)} / ${formatBytes(dashboardData.resources.memory.total)}`
                  : "-"}
              </p>
            </div>

            {/* Redis Memory */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">ذاكرة Redis</span>
                <span className="text-sm">
                  {dashboardData
                    ? formatBytes(dashboardData.redis.memoryUsage)
                    : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              حالة الطوابير
            </CardTitle>
            <CardDescription>توزيع الوظائف في النظام</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData && queueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={queueChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }: { name: string; value: number }) =>
                      `${name}: ${value}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {queueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات متاحة
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      {reportData?.alerts && reportData.alerts.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              تنبيهات الأداء
            </CardTitle>
            <CardDescription>
              مشاكل الأداء التي تحتاج إلى انتباه
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {reportData.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.severity === "critical"
                        ? "border-red-500 bg-red-50"
                        : alert.severity === "warning"
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-blue-500 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.metric}: {alert.value.toFixed(2)} (عتبة:{" "}
                          {alert.threshold.toFixed(2)})
                        </p>
                      </div>
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : alert.severity === "warning"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {alert.severity === "critical"
                          ? "حرج"
                          : alert.severity === "warning"
                            ? "تحذير"
                            : "معلومات"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {reportData?.recommendations &&
        reportData.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                توصيات التحسين
              </CardTitle>
              <CardDescription>اقتراحات لتحسين أداء النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {reportData.recommendations.map((rec, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

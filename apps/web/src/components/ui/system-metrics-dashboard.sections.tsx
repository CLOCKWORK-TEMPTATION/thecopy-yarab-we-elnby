"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Network,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import React from "react";

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
  DynamicCell as Cell,
  DynamicLegend as Legend,
  DynamicPieChart as PieChart,
  DynamicPie as Pie,
  DynamicResponsiveContainer as ResponsiveContainer,
  DynamicTooltip as Tooltip,
} from "@/components/ui/dynamic-chart";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  formatBytes,
  formatNumber,
  formatPercentage,
  type AutoRefreshConfig,
  type DashboardDataType,
  type HealthStatusType,
  type QueueChartDatum,
  type ReportDataType,
} from "./system-metrics-dashboard.types";

interface DashboardHeaderProps {
  autoRefresh: AutoRefreshConfig;
  isLoading: boolean;
  lastUpdated: string;
  onManualRefresh: () => void;
  onToggleAutoRefresh: () => void;
}

export function DashboardHeader({
  autoRefresh,
  isLoading,
  lastUpdated,
  onManualRefresh,
  onToggleAutoRefresh,
}: DashboardHeaderProps) {
  return (
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
          onClick={onToggleAutoRefresh}
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
          onClick={onManualRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          تحديث الآن
        </Button>
      </div>
    </div>
  );
}

function getHealthStatus(healthData: HealthStatusType | undefined) {
  if (!healthData) return { color: "gray", icon: Activity, text: "غير معروف" };

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
}

export function SystemHealthCard({
  dashboardData,
  healthData,
}: {
  dashboardData: DashboardDataType | undefined;
  healthData: HealthStatusType | undefined;
}) {
  const healthStatus = getHealthStatus(healthData);
  return (
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
          <MetricValue
            label="معدل الخطأ"
            value={
              dashboardData
                ? formatPercentage(dashboardData.overview.errorRate)
                : "-"
            }
          />
          <MetricValue
            label="وقت الاستجابة"
            value={
              dashboardData
                ? `${dashboardData.overview.avgResponseTime.toFixed(0)} ms`
                : "-"
            }
          />
          <MetricValue
            label="نسبة Cache Hit"
            value={
              dashboardData
                ? formatPercentage(dashboardData.overview.cacheHitRatio)
                : "-"
            }
          />
          <MetricValue
            label="الطلبات النشطة"
            value={
              dashboardData
                ? formatNumber(dashboardData.resources.concurrentRequests)
                : "-"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export function MainMetricsGrid({
  dashboardData,
}: {
  dashboardData: DashboardDataType | undefined;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <SummaryMetricCard
        icon={<Network className="h-4 w-4 text-muted-foreground" />}
        title="إجمالي الطلبات"
        value={
          dashboardData
            ? formatNumber(dashboardData.overview.totalRequests)
            : "-"
        }
        footer={
          dashboardData && dashboardData.overview.errorRate < 0.05 ? (
            <span className="text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              أداء جيد
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              يحتاج انتباه
            </span>
          )
        }
      />
      <SummaryMetricCard
        icon={<Database className="h-4 w-4 text-muted-foreground" />}
        title="استعلامات قاعدة البيانات"
        value={
          dashboardData
            ? formatNumber(dashboardData.database.totalQueries)
            : "-"
        }
        footer={
          <>
            متوسط:{" "}
            {dashboardData
              ? `${dashboardData.database.avgDuration.toFixed(1)} ms`
              : "-"}
            {dashboardData && dashboardData.database.slowQueries > 0 && (
              <Badge variant="destructive" className="mt-2 block w-fit">
                {dashboardData.database.slowQueries} استعلام بطيء
              </Badge>
            )}
          </>
        }
      />
      <SummaryMetricCard
        icon={<Zap className="h-4 w-4 text-muted-foreground" />}
        title="الوظائف النشطة"
        value={dashboardData ? String(dashboardData.queue.active) : "-"}
        footer={
          <>
            إجمالي:{" "}
            {dashboardData ? formatNumber(dashboardData.queue.total) : "-"}
            {dashboardData && dashboardData.queue.failed > 0 && (
              <Badge variant="destructive" className="mt-2 block w-fit">
                {dashboardData.queue.failed} فاشل
              </Badge>
            )}
          </>
        }
      />
      <SummaryMetricCard
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        title="Gemini API"
        value={
          dashboardData ? formatNumber(dashboardData.gemini.totalRequests) : "-"
        }
        footer={
          <>
            Cache Hit:{" "}
            {dashboardData
              ? formatPercentage(dashboardData.gemini.cacheHitRatio)
              : "-"}
          </>
        }
      />
    </div>
  );
}

function SummaryMetricCard({
  footer,
  icon,
  title,
  value,
}: {
  footer: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{footer}</p>
      </CardContent>
    </Card>
  );
}

export function ResourceAndQueueSection({
  dashboardData,
  queueChartData,
}: {
  dashboardData: DashboardDataType | undefined;
  queueChartData: QueueChartDatum[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ResourceUsageCard dashboardData={dashboardData} />
      <QueueStatusCard
        dashboardData={dashboardData}
        queueChartData={queueChartData}
      />
    </div>
  );
}

function ResourceUsageCard({
  dashboardData,
}: {
  dashboardData: DashboardDataType | undefined;
}) {
  const cpuUsage = dashboardData?.resources?.cpu?.usage;
  const memoryPercent = dashboardData?.resources?.memory?.percent;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          استخدام الموارد
        </CardTitle>
        <CardDescription>استهلاك الذاكرة والمعالج</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageProgress label="المعالج (CPU)" value={cpuUsage} />
        <UsageProgress label="الذاكرة (Memory)" value={memoryPercent} />
        <p className="text-xs text-muted-foreground mt-1">
          {dashboardData
            ? `${formatBytes(dashboardData.resources.memory.used)} / ${formatBytes(dashboardData.resources.memory.total)}`
            : "-"}
        </p>
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
  );
}

function UsageProgress({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge
          variant={
            value && value > 80
              ? "destructive"
              : value && value > 60
                ? "default"
                : "secondary"
          }
        >
          {value ? `${value.toFixed(1)}%` : "-"}
        </Badge>
      </div>
      <Progress value={value ?? 0} className="h-2" />
    </div>
  );
}

function QueueStatusCard({
  dashboardData,
  queueChartData,
}: {
  dashboardData: DashboardDataType | undefined;
  queueChartData: QueueChartDatum[];
}) {
  return (
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
                label={({ name, value }) => {
                  const labelName =
                    typeof name === "string" ? name : "غير معروف";
                  const labelValue =
                    typeof value === "number" ? value : Number(value ?? 0);
                  return `${labelName}: ${labelValue}`;
                }}
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
  );
}

export function PerformanceAlerts({
  reportData,
}: {
  reportData: ReportDataType | undefined;
}) {
  if (!reportData?.alerts?.length) return null;

  return (
    <Card className="border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          تنبيهات الأداء
        </CardTitle>
        <CardDescription>مشاكل الأداء التي تحتاج إلى انتباه</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            {reportData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${alertClassName(alert.severity)}`}
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
  );
}

function alertClassName(severity: "critical" | "warning" | "info") {
  if (severity === "critical") return "border-red-500 bg-red-50";
  if (severity === "warning") return "border-yellow-500 bg-yellow-50";
  return "border-blue-500 bg-blue-50";
}

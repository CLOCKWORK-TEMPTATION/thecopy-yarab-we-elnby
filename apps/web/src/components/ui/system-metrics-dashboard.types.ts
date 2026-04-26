export const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
};

export interface AutoRefreshConfig {
  enabled: boolean;
  interval: number;
}

export interface HealthStatusType {
  status: "healthy" | "degraded" | "critical";
}

export interface DashboardDataType {
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

export interface ReportDataType {
  alerts?: {
    message: string;
    metric: string;
    value: number;
    threshold: number;
    severity: "critical" | "warning" | "info";
  }[];
  recommendations?: string[];
}

export interface QueueChartDatum {
  name: string;
  value: number;
  color: string;
}

export const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

export const formatBytes = (bytes: number) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
};

export const formatPercentage = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

export function formatLastUpdated(dataUpdatedAt: number | undefined): string {
  if (!dataUpdatedAt) return "لم يتم التحديث بعد";
  const date = new Date(dataUpdatedAt);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return `منذ ${diffSeconds} ثانية`;
  if (diffSeconds < 3600) return `منذ ${Math.floor(diffSeconds / 60)} دقيقة`;
  return `منذ ${Math.floor(diffSeconds / 3600)} ساعة`;
}

export function buildQueueChartData(
  dashboardData: DashboardDataType | undefined
): QueueChartDatum[] {
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
}

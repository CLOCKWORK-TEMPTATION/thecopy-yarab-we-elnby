/**
 * Metrics API Hook
 *
 * Custom hook for fetching system metrics from backend
 */

import { useQuery } from "@tanstack/react-query";

import type {
  MetricsSnapshot,
  DashboardSummary,
  HealthStatus,
  PerformanceReport,
  DatabaseMetrics,
  RedisMetrics,
  QueueMetrics,
  ApiMetrics,
  ResourceMetrics,
  GeminiMetrics,
} from "@/types/metrics";

const API_BASE_URL = (process.env["NEXT_PUBLIC_API_URL"] ?? "").replace(
  /\/$/,
  ""
);

/**
 * Fetch helper with authentication
 */
async function fetchWithAuth<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for auth
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  const data = json as { success?: boolean; error?: string; data?: T };

  if (!data.success) {
    throw new Error(data.error ?? "Unknown error occurred");
  }

  return data.data as T;
}

/**
 * Hook to fetch dashboard summary
 */
export function useDashboardSummary(refreshInterval = 30000) {
  return useQuery<DashboardSummary>({
    queryKey: ["metrics", "dashboard"],
    queryFn: () => fetchWithAuth<DashboardSummary>("/api/metrics/dashboard"),
    refetchInterval: refreshInterval,
    staleTime: 20000, // Consider data stale after 20s
  });
}

/**
 * Hook to fetch latest metrics snapshot
 */
export function useLatestMetrics(refreshInterval = 30000) {
  return useQuery<MetricsSnapshot>({
    queryKey: ["metrics", "latest"],
    queryFn: () => fetchWithAuth<MetricsSnapshot>("/api/metrics/latest"),
    refetchInterval: refreshInterval,
    staleTime: 20000,
  });
}

/**
 * Hook to fetch health status
 */
export function useHealthStatus(refreshInterval = 15000) {
  return useQuery<HealthStatus>({
    queryKey: ["metrics", "health"],
    queryFn: () => fetchWithAuth<HealthStatus>("/api/metrics/health"),
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });
}

/**
 * Hook to fetch database metrics
 */
export function useDatabaseMetrics(refreshInterval = 30000) {
  return useQuery<DatabaseMetrics>({
    queryKey: ["metrics", "database"],
    queryFn: () => fetchWithAuth<DatabaseMetrics>("/api/metrics/database"),
    refetchInterval: refreshInterval,
    staleTime: 20000,
  });
}

/**
 * Hook to fetch Redis metrics
 */
export function useRedisMetrics(refreshInterval = 30000) {
  return useQuery<RedisMetrics>({
    queryKey: ["metrics", "redis"],
    queryFn: () => fetchWithAuth<RedisMetrics>("/api/metrics/redis"),
    refetchInterval: refreshInterval,
    staleTime: 20000,
  });
}

/**
 * Hook to fetch queue metrics
 */
export function useQueueMetrics(refreshInterval = 15000) {
  return useQuery<QueueMetrics>({
    queryKey: ["metrics", "queue"],
    queryFn: () => fetchWithAuth<QueueMetrics>("/api/metrics/queue"),
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });
}

/**
 * Hook to fetch API metrics
 */
export function useApiMetrics(refreshInterval = 30000) {
  return useQuery<ApiMetrics>({
    queryKey: ["metrics", "api"],
    queryFn: () => fetchWithAuth<ApiMetrics>("/api/metrics/api"),
    refetchInterval: refreshInterval,
    staleTime: 20000,
  });
}

/**
 * Hook to fetch resource metrics
 */
export function useResourceMetrics(refreshInterval = 10000) {
  return useQuery<ResourceMetrics>({
    queryKey: ["metrics", "resources"],
    queryFn: () => fetchWithAuth<ResourceMetrics>("/api/metrics/resources"),
    refetchInterval: refreshInterval,
    staleTime: 5000,
  });
}

/**
 * Hook to fetch Gemini metrics
 */
export function useGeminiMetrics(refreshInterval = 30000) {
  return useQuery<GeminiMetrics>({
    queryKey: ["metrics", "gemini"],
    queryFn: () => fetchWithAuth<GeminiMetrics>("/api/metrics/gemini"),
    refetchInterval: refreshInterval,
    staleTime: 20000,
  });
}

/**
 * Hook to fetch performance report
 */
export function usePerformanceReport(
  startTime?: Date,
  endTime?: Date,
  enabled = true
) {
  const params = new URLSearchParams();
  if (startTime) params.append("start", startTime.toISOString());
  if (endTime) params.append("end", endTime.toISOString());

  const queryString = params.toString() ? `?${params.toString()}` : "";

  return useQuery<PerformanceReport>({
    queryKey: ["metrics", "report", startTime, endTime],
    queryFn: () =>
      fetchWithAuth<PerformanceReport>(`/api/metrics/report${queryString}`),
    enabled,
    staleTime: 60000, // Reports are valid for 1 minute
  });
}

/**
 * Hook to fetch metrics for a time range
 */
export function useMetricsRange(
  startTime: Date,
  endTime: Date,
  enabled = true
) {
  const params = new URLSearchParams({
    start: startTime.toISOString(),
    end: endTime.toISOString(),
  });

  return useQuery<MetricsSnapshot[]>({
    queryKey: ["metrics", "range", startTime, endTime],
    queryFn: () =>
      fetchWithAuth<MetricsSnapshot[]>(
        `/api/metrics/range?${params.toString()}`
      ),
    enabled,
    staleTime: 60000,
  });
}

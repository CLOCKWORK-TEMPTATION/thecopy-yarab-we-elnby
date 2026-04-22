/**
 * System Metrics Dashboard Page
 *
 * Comprehensive system monitoring dashboard
 */

"use client";

import SystemMetricsDashboard from "@/components/ui/system-metrics-dashboard";

// Force dynamic rendering to prevent prerendering during build
// This is necessary because the dashboard uses React Query hooks
// which require a QueryClient to be available
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function MetricsDashboardPage() {
  return <SystemMetricsDashboard />;
}

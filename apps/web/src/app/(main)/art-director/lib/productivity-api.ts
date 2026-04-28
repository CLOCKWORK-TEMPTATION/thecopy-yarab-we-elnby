import { fetchArtDirectorJson } from "@/app/(main)/art-director/lib/api-client";

import type {
  ProductivityAnalysis,
  ProductivitySummaryResponse,
} from "@/app/(main)/art-director/components/productivity/types";
import type { ApiResponse } from "@/app/(main)/art-director/types";

export async function loadProductivitySummary() {
  const summary = await fetchArtDirectorJson<
    ApiResponse<ProductivitySummaryResponse>
  >("/productivity/summary");

  if (!summary.success || !summary.data) {
    throw new Error(summary.error ?? "فشل في تحميل ملخص الإنتاجية");
  }

  return summary.data;
}

export async function loadProductivityAnalysis() {
  const summary = await fetchArtDirectorJson<ApiResponse<ProductivityAnalysis>>(
    "/analyze/productivity",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  if (!summary.success || !summary.data) {
    throw new Error(summary.error ?? "فشل في تحميل مؤشرات الإنتاجية");
  }

  return summary.data;
}

export async function loadProductivityRecommendations() {
  const data = await fetchArtDirectorJson<
    ApiResponse<{ recommendations: string[] }>
  >("/productivity/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!data.success || !data.data?.recommendations) {
    throw new Error(data.error ?? "فشل في تحميل التوصيات");
  }

  return data.data.recommendations;
}

export async function submitLoggedTime(params: {
  category: string;
  hours: number;
  task: string;
}) {
  const data = await fetchArtDirectorJson<ApiResponse>("/productivity/log-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!data.success) {
    throw new Error(data.error ?? "فشل في تسجيل الوقت");
  }
}

export async function submitReportedDelay(params: {
  hoursLost: number;
  impact: string;
  reason: string;
}) {
  const data = await fetchArtDirectorJson<ApiResponse>(
    "/productivity/report-delay",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    },
  );

  if (!data.success) {
    throw new Error(data.error ?? "فشل في الإبلاغ عن التأخير");
  }
}

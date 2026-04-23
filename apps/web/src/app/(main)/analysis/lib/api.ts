/**
 * Network helpers for the analysis surface. All requests rely on the existing
 * cookie-based authentication (httpOnly access token + CSRF) and surface
 * 401/403 distinctly so the UI can prompt the user to sign in again instead
 * of silently failing.
 */

import type { AnalysisSnapshot, StationId } from "./types";

export class AuthRequiredError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 401 ? "غير مصرح" : "ممنوع الوصول");
    this.name = "AuthRequiredError";
    this.status = status;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    throw new AuthRequiredError(res.status);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (res.status === 401 || res.status === 403) {
    throw new AuthRequiredError(res.status);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function startAnalysisStream(input: {
  text: string;
  projectId?: string;
  projectName?: string;
}): Promise<{ analysisId: string }> {
  const data = await postJson<{ success: true; analysisId: string }>(
    "/api/analysis/seven-stations/start",
    input
  );
  return { analysisId: data.analysisId };
}

export async function fetchAnalysisSnapshot(
  analysisId: string
): Promise<AnalysisSnapshot> {
  const data = await getJson<{ success: true; snapshot: AnalysisSnapshot }>(
    `/api/analysis/seven-stations/${encodeURIComponent(analysisId)}/snapshot`
  );
  return data.snapshot;
}

export async function retryStation(
  analysisId: string,
  stationId: StationId,
  text: string
): Promise<unknown> {
  const data = await postJson<{ success: true; stationId: number; output: unknown }>(
    `/api/analysis/seven-stations/${encodeURIComponent(analysisId)}/retry/${stationId}`,
    { text }
  );
  return data.output;
}

export async function exportAnalysis(
  analysisId: string,
  format: "json" | "docx" | "pdf"
): Promise<Blob> {
  const res = await fetch(
    `/api/analysis/seven-stations/${encodeURIComponent(analysisId)}/export`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ format }),
    }
  );
  if (res.status === 401 || res.status === 403) {
    throw new AuthRequiredError(res.status);
  }
  if (!res.ok) {
    throw new Error(`Export failed: HTTP ${res.status}`);
  }
  return await res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

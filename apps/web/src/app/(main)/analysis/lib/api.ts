/**
 * Network helpers for the public analysis surface.
 *
 * The page uses bounded public endpoints. Requests still carry same-origin
 * credentials and CSRF headers when present, but the user-facing error text is
 * intentionally controlled so upstream HTML or stack output never reaches UI.
 */

import type { AnalysisSnapshot, StationId } from "./types";
import { getJson, postJson, postBlob } from "@/lib/analysis-fetch";

const ANALYSIS_API_BASE = "/api/public/analysis/seven-stations";

export class AuthRequiredError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 401 ? "غير مصرح" : "ممنوع الوصول");
    this.name = "AuthRequiredError";
    this.status = status;
  }
}

async function fetchAnalysisJson<T>(subpath: string): Promise<T> {
  return getJson<T>(`${ANALYSIS_API_BASE}${subpath}`);
}

async function postAnalysisJson<T>(subpath: string, body: unknown): Promise<T> {
  return postJson<T>(`${ANALYSIS_API_BASE}${subpath}`, body);
}

export async function startAnalysisStream(input: {
  text: string;
  projectId?: string;
  projectName?: string;
}): Promise<{ analysisId: string }> {
  const data = await postAnalysisJson<{ success: true; analysisId: string }>(
    "/start",
    input
  );
  return { analysisId: data.analysisId };
}

export async function fetchAnalysisSnapshot(
  analysisId: string
): Promise<AnalysisSnapshot> {
  const data = await fetchAnalysisJson<{ success: true; snapshot: AnalysisSnapshot }>(
    `/${encodeURIComponent(analysisId)}/snapshot`
  );
  return data.snapshot;
}

export async function retryStation(
  analysisId: string,
  stationId: StationId,
  text: string
): Promise<unknown> {
  const data = await postAnalysisJson<{
    success: true;
    stationId: number;
    output: unknown;
  }>(
    `/${encodeURIComponent(analysisId)}/retry/${stationId}`,
    { text }
  );
  return data.output;
}

export async function exportAnalysis(
  analysisId: string,
  format: "json" | "docx" | "pdf"
): Promise<Blob> {
  return postBlob(
    `${ANALYSIS_API_BASE}/${encodeURIComponent(analysisId)}/export`,
    { format },
  );
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

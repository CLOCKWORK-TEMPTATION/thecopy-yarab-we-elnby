/**
 * Network helpers for the analysis surface.
 *
 * Auth model (matches the rest of the project — see `art-director/lib/api-client.ts`,
 * `cinematography-studio/lib/studio-route-client.ts`, `breakdown/infrastructure/platform-client.ts`):
 *   - cookie-based session (`credentials: "same-origin"`)
 *   - CSRF: read `XSRF-TOKEN` from `document.cookie`, send back as `X-XSRF-TOKEN`
 *     header on every non-GET / non-HEAD request. If the cookie is missing,
 *     hit `/api/health` once to make the backend mint one, then re-read it.
 *
 * 401/403 are surfaced as `AuthRequiredError` so the UI can route the user
 * back to login instead of swallowing the failure.
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

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("XSRF-TOKEN="));
  if (!cookieMatch) return null;
  const [, value] = cookieMatch.split("=");
  return value ? decodeURIComponent(value) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfToken();
  if (existing) return existing;
  await fetch("/api/health", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => undefined);
  return getCsrfToken();
}

async function buildHeaders(
  method: string,
  contentType?: string
): Promise<Headers> {
  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);
  const upper = method.toUpperCase();
  if (upper !== "GET" && upper !== "HEAD") {
    const token = await ensureCsrfToken();
    if (token) {
      headers.set("X-XSRF-TOKEN", token);
      headers.set("x-xsrf-token", token);
    }
  }
  return headers;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const headers = await buildHeaders("POST", "application/json");
  const res = await fetch(url, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    throw new AuthRequiredError(res.status);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`
    );
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const headers = await buildHeaders("GET");
  const res = await fetch(url, {
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    throw new AuthRequiredError(res.status);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`
    );
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
  const data = await postJson<{
    success: true;
    stationId: number;
    output: unknown;
  }>(
    `/api/analysis/seven-stations/${encodeURIComponent(analysisId)}/retry/${stationId}`,
    { text }
  );
  return data.output;
}

export async function exportAnalysis(
  analysisId: string,
  format: "json" | "docx" | "pdf"
): Promise<Blob> {
  const headers = await buildHeaders("POST", "application/json");
  const res = await fetch(
    `/api/analysis/seven-stations/${encodeURIComponent(analysisId)}/export`,
    {
      method: "POST",
      headers,
      credentials: "same-origin",
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

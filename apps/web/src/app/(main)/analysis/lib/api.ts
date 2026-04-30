/**
 * Network helpers for the public analysis surface.
 *
 * The page uses bounded public endpoints. Requests still carry same-origin
 * credentials and CSRF headers when present, but the user-facing error text is
 * intentionally controlled so upstream HTML or stack output never reaches UI.
 */

import type { AnalysisSnapshot, StationId } from "./types";

const ANALYSIS_API_BASE = "/api/public/analysis/seven-stations";

export class AuthRequiredError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 401 ? "غير مصرح" : "ممنوع الوصول");
    this.name = "AuthRequiredError";
    this.status = status;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "بيانات التحليل غير صحيحة، راجع النص ثم حاول مرة أخرى.",
  401: "انتهت صلاحية جلسة التحليل، أعد فتح الصفحة وحاول مرة أخرى.",
  403: "جلسة التحليل غير متاحة لهذا المتصفح.",
  404: "خدمة التحليل غير متاحة الآن، حاول مرة أخرى بعد لحظات.",
  408: "استغرق طلب التحليل وقتاً أطول من المتوقع.",
  409: "حالة التحليل الحالية لا تسمح بتنفيذ هذا الإجراء.",
  413: "النص المدخل أكبر من الحد المسموح.",
  429: "تم الوصول إلى حد الطلبات مؤقتاً، انتظر قليلاً ثم حاول مرة أخرى.",
  500: "حدث خطأ داخلي أثناء التحليل.",
  502: "خدمة التحليل غير متاحة الآن.",
  503: "خدمة التحليل مشغولة الآن.",
  504: "انتهت مهلة الاتصال بخدمة التحليل.",
};

function looksLikeRawServerBody(value: string): boolean {
  return /<!doctype|<html|<head|<body|<script|<style|cannot\s+(get|post)|stack trace|syntaxerror/i.test(
    value
  );
}

function safeStatusMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? "تعذر تنفيذ طلب التحليل.";
}

function buildNetworkError(): Error {
  return new Error(
    "تعذر الاتصال بخدمة التحليل. تحقق من الشبكة وحاول مرة أخرى."
  );
}

async function readJsonErrorMessage(
  response: Response
): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;

  try {
    const payload: unknown = await response.clone().json();
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;
    const value =
      typeof record["message"] === "string"
        ? record["message"]
        : typeof record["error"] === "string"
          ? record["error"]
          : null;
    if (!value || looksLikeRawServerBody(value)) return null;
    return value;
  } catch {
    return null;
  }
}

async function buildSafeHttpError(response: Response): Promise<Error> {
  const jsonMessage = await readJsonErrorMessage(response);
  const message = jsonMessage ?? safeStatusMessage(response.status);
  return new Error(message);
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
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    throw buildNetworkError();
  }
  if (res.status === 401 || res.status === 403) {
    throw await buildSafeHttpError(res);
  }
  if (!res.ok) {
    throw await buildSafeHttpError(res);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const headers = await buildHeaders("GET");
  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw buildNetworkError();
  }
  if (res.status === 401 || res.status === 403) {
    throw await buildSafeHttpError(res);
  }
  if (!res.ok) {
    throw await buildSafeHttpError(res);
  }
  return (await res.json()) as T;
}

export async function startAnalysisStream(input: {
  text: string;
  projectId?: string;
  projectName?: string;
}): Promise<{ analysisId: string }> {
  const data = await postJson<{ success: true; analysisId: string }>(
    `${ANALYSIS_API_BASE}/start`,
    input
  );
  return { analysisId: data.analysisId };
}

export async function fetchAnalysisSnapshot(
  analysisId: string
): Promise<AnalysisSnapshot> {
  const data = await getJson<{ success: true; snapshot: AnalysisSnapshot }>(
    `${ANALYSIS_API_BASE}/${encodeURIComponent(analysisId)}/snapshot`
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
    `${ANALYSIS_API_BASE}/${encodeURIComponent(analysisId)}/retry/${stationId}`,
    { text }
  );
  return data.output;
}

export async function exportAnalysis(
  analysisId: string,
  format: "json" | "docx" | "pdf"
): Promise<Blob> {
  const headers = await buildHeaders("POST", "application/json");
  let res: Response;
  try {
    res = await fetch(
      `${ANALYSIS_API_BASE}/${encodeURIComponent(analysisId)}/export`,
      {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ format }),
      }
    );
  } catch {
    throw buildNetworkError();
  }
  if (res.status === 401 || res.status === 403) {
    throw await buildSafeHttpError(res);
  }
  if (!res.ok) {
    throw await buildSafeHttpError(res);
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

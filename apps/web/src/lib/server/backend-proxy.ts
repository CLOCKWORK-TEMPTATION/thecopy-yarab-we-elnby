import { NextRequest, NextResponse } from "next/server";

import {
  withNoStoreHeaders,
  withNoStoreResponseInit,
} from "@/lib/server/no-store";

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  return url.replace(/\/$/, "");
}

function normalizeAbsoluteBaseUrl(url?: string | null): string | null {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) {
    return null;
  }

  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

const CONFIGURED_BACKEND_BASE_URL = normalizeBaseUrl(
  process.env["NEXT_PUBLIC_API_URL"] ??
    process.env["NEXT_PUBLIC_BACKEND_URL"] ??
    process.env["BACKEND_URL"] ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : null)
);

const EDITOR_RUNTIME_ROUTE_SUFFIXES = [
  "/api/file-extract",
  "/api/files/extract",
  "/api/text-extract",
  "/api/suspicion-review",
  "/api/final-review",
  "/api/ai/context-enhance",
  "/api/export/pdfa",
  "/api/editor-runtime/health/deep",
  "/api/editor-runtime/health",
] as const;

const DEFAULT_TIMEOUT_BY_PATH: Record<string, number> = {
  "/api/file-extract": 10 * 60 * 1_000,
  "/api/files/extract": 10 * 60 * 1_000,
  "/api/text-extract": 35_000,
  "/api/suspicion-review": 60_000,
  "/api/final-review": 60_000,
  "/api/ai/context-enhance": 60_000,
  "/api/export/pdfa": 60_000,
  "/api/editor-runtime/health": 10_000,
  "/api/editor-runtime/health/deep": 10_000,
};

class BackendProxyError extends Error {
  errorCode: string | undefined;
  statusCode: number | undefined;

  constructor(
    message: string,
    options: {
      errorCode?: string;
      statusCode?: number;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "BackendProxyError";
    this.errorCode = options.errorCode;
    this.statusCode = options.statusCode;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function stripKnownRouteSuffix(url: string): string {
  for (const suffix of EDITOR_RUNTIME_ROUTE_SUFFIXES) {
    if (url.endsWith(suffix)) {
      return url.slice(0, -suffix.length);
    }
  }

  return url;
}

const CONFIGURED_EDITOR_RUNTIME_BASE_URL = (() => {
  const candidates = [
    process.env["EDITOR_RUNTIME_BASE_URL"],
    process.env["FILE_IMPORT_BACKEND_URL"],
    process.env.NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL,
    process.env["NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL"],
  ];

  for (const candidate of candidates) {
    const absoluteUrl = normalizeAbsoluteBaseUrl(candidate);
    if (absoluteUrl) {
      return stripKnownRouteSuffix(absoluteUrl);
    }
  }

  return null;
})();

function requireBackendBaseUrl(baseUrl?: string | null): string {
  const resolvedBaseUrl =
    normalizeBaseUrl(baseUrl) ?? CONFIGURED_BACKEND_BASE_URL;

  if (!resolvedBaseUrl) {
    throw new Error(
      "Backend base URL is not configured. Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL."
    );
  }

  return resolvedBaseUrl;
}

export interface ProxyRequestOptions {
  baseUrl?: string | null;
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: string;
  search?: URLSearchParams;
  timeoutMs?: number;
}

function copySetCookieHeaders(source: Headers, target: Headers): void {
  const sourceWithSetCookie = source as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof sourceWithSetCookie.getSetCookie === "function") {
    for (const cookie of sourceWithSetCookie.getSetCookie()) {
      target.append("set-cookie", cookie);
    }
    return;
  }

  const singleCookie = source.get("set-cookie");
  if (singleCookie) {
    target.append("set-cookie", singleCookie);
  }
}

function buildTargetUrl(
  targetPath: string,
  request: NextRequest,
  search?: URLSearchParams,
  baseUrl?: string | null
): URL {
  const resolvedBaseUrl = requireBackendBaseUrl(baseUrl);
  const normalizedPath = targetPath.startsWith("/")
    ? targetPath
    : `/${targetPath}`;
  const targetUrl = new URL(`${resolvedBaseUrl}${normalizedPath}`);
  const sourceSearch = search ?? request.nextUrl.searchParams;

  sourceSearch.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return targetUrl;
}

function buildProxyHeaders(
  request: NextRequest,
  additionalHeaders?: HeadersInit
): Headers {
  const headers = new Headers(additionalHeaders);
  const passThroughHeaders = [
    "accept",
    "accept-language",
    "authorization",
    "content-type",
    "cookie",
    "if-none-match",
    "x-requested-with",
  ];

  for (const headerName of passThroughHeaders) {
    const headerValue = request.headers.get(headerName);
    if (headerValue && !headers.has(headerName)) {
      headers.set(headerName, headerValue);
    }
  }

  const csrfHeader =
    request.headers.get("x-xsrf-token") ??
    request.cookies.get("XSRF-TOKEN")?.value;

  if (csrfHeader && !headers.has("x-xsrf-token")) {
    headers.set("x-xsrf-token", csrfHeader);
    headers.set("X-XSRF-TOKEN", csrfHeader);
  }

  return headers;
}

async function readRequestBody(
  request: NextRequest,
  method: string
): Promise<BodyInit | null | undefined> {
  if (method === "GET" || method === "HEAD") {
    return undefined;
  }

  const buffer = await request.arrayBuffer();
  return buffer.byteLength > 0 ? buffer : null;
}

async function proxyRequest(
  request: NextRequest,
  targetPath: string,
  options: ProxyRequestOptions = {}
): Promise<NextResponse> {
  const method = (options.method ?? request.method).toUpperCase();
  const targetUrl = buildTargetUrl(
    targetPath,
    request,
    options.search,
    options.baseUrl
  );
  const requestBody =
    options.body === undefined
      ? await readRequestBody(request, method)
      : options.body;
  const headers = buildProxyHeaders(request, options.headers);
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_TIMEOUT_BY_PATH[targetPath] ?? 60_000;
  const signal = AbortSignal.timeout(timeoutMs);
  const requestInit: RequestInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal,
  };

  if (requestBody !== undefined) {
    requestInit.body = requestBody;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, requestInit);
  } catch (error) {
    const backendError = translateProxyError(
      error,
      targetUrl.toString(),
      timeoutMs
    );
    throw backendError;
  }

  const responseHeaders = new Headers();
  const excludedHeaders = new Set([
    "content-encoding",
    "content-length",
    "transfer-encoding",
  ]);

  upstreamResponse.headers.forEach((value, key) => {
    if (
      !excludedHeaders.has(key.toLowerCase()) &&
      key.toLowerCase() !== "set-cookie"
    ) {
      responseHeaders.set(key, value);
    }
  });
  copySetCookieHeaders(upstreamResponse.headers, responseHeaders);

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: withNoStoreHeaders(responseHeaders),
  });
}

function formatProxyErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (error instanceof BackendProxyError) {
    return error.message || fallbackMessage;
  }

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const parts: string[] = [];
  if (error.message && error.message !== "fetch failed") {
    parts.push(error.message);
  }

  const errorWithCause = error as Error & {
    cause?: { code?: unknown; message?: unknown };
  };
  const causeCode =
    typeof errorWithCause.cause?.code === "string"
      ? errorWithCause.cause.code.trim()
      : "";
  const causeMessage =
    typeof errorWithCause.cause?.message === "string"
      ? errorWithCause.cause.message.trim()
      : "";

  if (causeCode || causeMessage) {
    parts.push([causeCode, causeMessage].filter(Boolean).join(": "));
  }

  const combined = parts.filter(Boolean).join(" — ");
  return combined || fallbackMessage;
}

export function buildProxyErrorResponse(
  error: unknown,
  fallbackMessage: string
): NextResponse {
  const statusCode =
    error instanceof BackendProxyError && error.statusCode
      ? error.statusCode
      : 500;
  const errorCode =
    error instanceof BackendProxyError && error.errorCode
      ? error.errorCode
      : undefined;

  return NextResponse.json(
    {
      success: false,
      error: formatProxyErrorMessage(error, fallbackMessage),
      ...(errorCode ? { errorCode } : {}),
    },
    withNoStoreResponseInit({ status: statusCode })
  );
}

export async function proxyToBackend(
  request: NextRequest,
  targetPath: string,
  options: ProxyRequestOptions = {}
): Promise<NextResponse> {
  return proxyRequest(request, targetPath, options);
}

export function getBackendBaseUrl(): string | null {
  return CONFIGURED_BACKEND_BASE_URL;
}

export function getEditorRuntimeBaseUrl(): string | null {
  return CONFIGURED_EDITOR_RUNTIME_BASE_URL ?? CONFIGURED_BACKEND_BASE_URL;
}

function translateProxyError(
  error: unknown,
  targetUrl: string,
  timeoutMs: number
): BackendProxyError {
  const errorWithCause = error as Error & {
    cause?: { code?: unknown; message?: unknown };
    code?: unknown;
  };
  const causeCode =
    typeof errorWithCause.cause?.code === "string"
      ? errorWithCause.cause.code.trim().toUpperCase()
      : typeof errorWithCause.code === "string"
        ? errorWithCause.code.trim().toUpperCase()
        : "";
  const causeMessage =
    typeof errorWithCause.cause?.message === "string"
      ? errorWithCause.cause.message.trim()
      : error instanceof Error && error.message
        ? error.message.trim()
        : "";

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new BackendProxyError(
      `انتهت مهلة الاتصال بالخادم الخلفي بعد ${Math.round(timeoutMs / 1_000)} ثانية.`,
      {
        errorCode: "BACKEND_TIMEOUT",
        statusCode: 504,
        cause: error,
      }
    );
  }

  if (causeCode === "ECONNREFUSED") {
    return new BackendProxyError(
      `الخادم الخلفي غير متاح حالياً عند ${targetUrl}.`,
      {
        errorCode: "BACKEND_CONNECTION_REFUSED",
        statusCode: 503,
        cause: error,
      }
    );
  }

  if (causeCode === "ENOTFOUND" || causeCode === "EAI_AGAIN") {
    return new BackendProxyError(
      `تعذر العثور على عنوان الخادم الخلفي عند ${targetUrl}.`,
      {
        errorCode: "BACKEND_UNRESOLVED_HOST",
        statusCode: 502,
        cause: error,
      }
    );
  }

  if (causeCode === "ECONNRESET" || causeCode === "EPIPE") {
    return new BackendProxyError(
      `انقطع الاتصال بالخادم الخلفي أثناء تنفيذ الطلب.`,
      {
        errorCode: "BACKEND_CONNECTION_RESET",
        statusCode: 502,
        cause: error,
      }
    );
  }

  if (causeCode === "ETIMEDOUT") {
    return new BackendProxyError(
      `استغرق الخادم الخلفي وقتاً أطول من المسموح.`,
      {
        errorCode: "BACKEND_TIMEOUT",
        statusCode: 504,
        cause: error,
      }
    );
  }

  return new BackendProxyError(causeMessage || "فشل الاتصال بالخادم الخلفي.", {
    errorCode: "BACKEND_PROXY_FAILED",
    statusCode: 502,
    cause: error,
  });
}

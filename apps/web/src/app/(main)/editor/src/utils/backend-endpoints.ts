const DEV_DEFAULT_FILE_EXTRACT_ENDPOINT = "/api/file-extract";
const PRODUCTION_BACKEND_HOSTS = new Set([
  "backend-thecopy-production.up.railway.app",
]);

const normalizeTrailingSlash = (value: string): string =>
  value.replace(/\/$/, "");

const canUseWindowOrigin = (): boolean =>
  typeof window !== "undefined" && typeof window.location?.origin === "string";

const toAbsoluteOrRelativeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return normalizeTrailingSlash(trimmed);
  }

  if (canUseWindowOrigin()) {
    return new URL(trimmed, window.location.origin)
      .toString()
      .replace(/\/$/, "");
  }

  return normalizeTrailingSlash(trimmed);
};

const isKnownProductionBackendUrl = (value: string): boolean => {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    return PRODUCTION_BACKEND_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const resolveFileImportExtractEndpoint = (): string => {
  const configured = process.env.NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL ?? "";
  const resolved = toAbsoluteOrRelativeUrl(configured);

  if (resolved) {
    if (
      process.env.NODE_ENV === "development" &&
      isKnownProductionBackendUrl(resolved)
    ) {
      return DEV_DEFAULT_FILE_EXTRACT_ENDPOINT;
    }

    return resolved;
  }

  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    return DEV_DEFAULT_FILE_EXTRACT_ENDPOINT;
  }

  return "";
};

export const replaceEndpointSuffix = (
  extractEndpoint: string,
  nextPath: string
): string => {
  const normalizedEndpoint = normalizeTrailingSlash(extractEndpoint);
  const normalizedPath = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;

  if (!normalizedEndpoint) {
    return normalizedPath;
  }

  if (normalizedEndpoint.endsWith("/api/file-extract")) {
    return `${normalizedEndpoint.slice(0, -"/api/file-extract".length)}${normalizedPath}`;
  }

  return `${normalizedEndpoint}${normalizedPath}`;
};

export const resolveEditorRuntimeBaseUrl = (): string => {
  const extractEndpoint = resolveFileImportExtractEndpoint();

  if (extractEndpoint.endsWith("/api/file-extract")) {
    return extractEndpoint.slice(0, -"/api/file-extract".length);
  }

  return extractEndpoint;
};

export const resolveTextExtractEndpoint = (): string =>
  replaceEndpointSuffix(
    resolveFileImportExtractEndpoint(),
    "/api/text-extract"
  );

export const resolveFinalReviewEndpoint = (): string =>
  replaceEndpointSuffix(
    resolveFileImportExtractEndpoint(),
    "/api/final-review"
  );

export const resolveSuspicionReviewEndpoint = (): string =>
  replaceEndpointSuffix(
    resolveFileImportExtractEndpoint(),
    "/api/suspicion-review"
  );

export const resolveContextEnhanceEndpoint = (): string =>
  replaceEndpointSuffix(
    resolveFileImportExtractEndpoint(),
    "/api/ai/context-enhance"
  );

export const resolvePdfaExportEndpoint = (): string =>
  replaceEndpointSuffix(resolveFileImportExtractEndpoint(), "/api/export/pdfa");

export const resolveEditorRuntimeHealthEndpoint = (): string =>
  replaceEndpointSuffix(
    resolveFileImportExtractEndpoint(),
    "/api/editor-runtime/health"
  );

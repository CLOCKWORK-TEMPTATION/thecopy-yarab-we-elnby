import { afterEach, expect, it, vi } from "vitest";

import { resolveFileImportExtractEndpoint } from "./backend-endpoints";

afterEach(() => {
  vi.unstubAllEnvs();
});

it("uses the local proxy in development when the production file import URL leaks in", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv(
    "NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL",
    "https://backend-thecopy-production.up.railway.app/api/file-extract",
  );

  expect(resolveFileImportExtractEndpoint()).toBe("/api/file-extract");
});

it("keeps explicit non-production file import URLs in development", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv(
    "NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL",
    "http://127.0.0.1:4200/api/file-extract",
  );

  expect(resolveFileImportExtractEndpoint()).toBe(
    "http://127.0.0.1:4200/api/file-extract",
  );
});

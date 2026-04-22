import { describe, expect, it } from "vitest";

import { resolveBackendExtractionTimeoutMs } from "./backend-extract";

describe("resolveBackendExtractionTimeoutMs", () => {
  it("keeps the long OCR budget for PDFs", () => {
    expect(resolveBackendExtractionTimeoutMs("pdf", 25 * 1024 * 1024)).toBe(
      10 * 60 * 1_000
    );
  });

  it("extends docx imports beyond the old 45-second ceiling", () => {
    expect(resolveBackendExtractionTimeoutMs("docx", 0)).toBe(3 * 60 * 1_000);
    expect(resolveBackendExtractionTimeoutMs("docx", 6 * 1024 * 1024)).toBe(
      3 * 60 * 1_000 + 90_000
    );
  });

  it("adds a bounded size bonus for text-like imports", () => {
    expect(resolveBackendExtractionTimeoutMs("txt", 0)).toBe(60_000);
    expect(resolveBackendExtractionTimeoutMs("txt", 3 * 1024 * 1024)).toBe(
      105_000
    );
    expect(resolveBackendExtractionTimeoutMs("txt", 25 * 1024 * 1024)).toBe(
      3 * 60 * 1_000
    );
  });
});

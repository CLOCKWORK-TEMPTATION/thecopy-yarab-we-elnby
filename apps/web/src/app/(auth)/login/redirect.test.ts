import { describe, expect, it } from "vitest";

import { resolveSafeLoginRedirect } from "./page";

describe("resolveSafeLoginRedirect", () => {
  it("keeps an internal return path", () => {
    expect(resolveSafeLoginRedirect("/ui")).toBe("/ui");
  });

  it("keeps an internal return path with a query string", () => {
    expect(resolveSafeLoginRedirect("/ui?tab=launcher")).toBe(
      "/ui?tab=launcher"
    );
  });

  it("falls back to the home page for an absolute external URL", () => {
    expect(resolveSafeLoginRedirect("https://example.com")).toBe("/");
  });

  it("falls back to the home page for a protocol-relative URL", () => {
    expect(resolveSafeLoginRedirect("//example.com")).toBe("/");
  });

  it("falls back to the home page when the return path is absent", () => {
    expect(resolveSafeLoginRedirect(null)).toBe("/");
  });
});

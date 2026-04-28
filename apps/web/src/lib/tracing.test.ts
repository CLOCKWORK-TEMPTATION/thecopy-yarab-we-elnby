import { afterEach, describe, expect, it, vi } from "vitest";

import { initBrowserTracing, isBrowserTracingEnabled } from "./tracing";

describe("browser tracing", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TRACING_ENABLED;
    vi.restoreAllMocks();
  });

  it("treats tracing as disabled unless the public flag is true", () => {
    process.env.NEXT_PUBLIC_TRACING_ENABLED = "false";
    expect(isBrowserTracingEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_TRACING_ENABLED = "true";
    expect(isBrowserTracingEnabled()).toBe(true);
  });

  it("skips initialization work when tracing is disabled", () => {
    process.env.NEXT_PUBLIC_TRACING_ENABLED = "false";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
      /* empty */
    });

    initBrowserTracing();

    expect(logSpy).not.toHaveBeenCalled();
  });
});

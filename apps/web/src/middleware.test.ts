import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./middleware";

describe("content security policy builder", () => {
  it("allows the inline bootstrap needed by the static production app", () => {
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "https://o0.ingest.sentry.io",
      cdnOrigin: "https://cdn.example.com",
    });

    expect(header).toContain("script-src 'self' 'unsafe-inline'");
    expect(header).toContain(
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.example.com"
    );
    expect(header).not.toContain("unsafe-eval");
  });

  it("allows configured backend origins in connect-src without duplication", () => {
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "",
      cdnOrigin: "",
      connectOrigins: [
        "https://backend-thecopy-production.up.railway.app",
        "https://backend-thecopy-production.up.railway.app",
        "https://secondary-editor-runtime.example.com",
      ],
    });

    expect(header).toContain(
      "connect-src 'self' https://apis.google.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://backend-thecopy-production.up.railway.app https://secondary-editor-runtime.example.com"
    );
    expect(
      header?.match(/https:\/\/backend-thecopy-production\.up\.railway\.app/g)
        ?.length
    ).toBe(1);
  });
});

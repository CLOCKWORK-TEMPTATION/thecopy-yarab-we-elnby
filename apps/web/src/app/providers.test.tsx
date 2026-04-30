// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "./providers";

vi.mock("@/components/providers/notification-provider", () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("Providers", () => {
  const originalDiagnosticsFlag = process.env["NEXT_PUBLIC_E2E_DIAGNOSTICS"];

  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    window.localStorage.clear();
    delete (
      window as Window & {
        __THE_COPY_E2E_DIAGNOSTICS__?: {
          restore?: () => void;
        };
      }
    ).__THE_COPY_E2E_DIAGNOSTICS__;
    process.env["NEXT_PUBLIC_E2E_DIAGNOSTICS"] = originalDiagnosticsFlag;
  });

  afterEach(() => {
    (
      window as Window & {
        __THE_COPY_E2E_DIAGNOSTICS__?: {
          restore?: () => void;
        };
      }
    ).__THE_COPY_E2E_DIAGNOSTICS__?.restore?.();
    process.env["NEXT_PUBLIC_E2E_DIAGNOSTICS"] = originalDiagnosticsFlag;
  });

  it("يفرض الوضع الداكن على الجذر العام للتطبيق", async () => {
    render(
      <Providers>
        <div>جاهز</div>
      </Providers>
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(document.documentElement).not.toHaveClass("light");
      expect(document.documentElement.style.colorScheme).toBe("dark");
      expect(window.localStorage.getItem("filmlane.theme")).toBe("dark");
    });
  });

  it("يفتح تشخيصاً داخلياً آمناً عند تفعيل بيئة الاختبار", async () => {
    process.env["NEXT_PUBLIC_E2E_DIAGNOSTICS"] = "1";

    render(
      <Providers>
        <div>جاهز</div>
      </Providers>
    );

    await waitFor(() => {
      expect(
        (
          window as Window & {
            __THE_COPY_E2E_DIAGNOSTICS__?: unknown;
          }
        ).__THE_COPY_E2E_DIAGNOSTICS__
      ).toBeDefined();
    });

    console.error("خطأ تشخيصي آمن", { token: "secret-value" });
    window.localStorage.setItem("diagnostics-key", "secret-value");

    const diagnostics = (
      window as Window & {
        __THE_COPY_E2E_DIAGNOSTICS__: {
          getSnapshot: () => {
            consoleErrors: { message: string }[];
            localStorageKeys: string[];
          };
        };
      }
    ).__THE_COPY_E2E_DIAGNOSTICS__;

    const snapshot = diagnostics.getSnapshot();

    expect(snapshot.consoleErrors[0]?.message).toContain("خطأ تشخيصي آمن");
    expect(snapshot.localStorageKeys).toContain("diagnostics-key");
    expect(JSON.stringify(snapshot)).not.toContain("secret-value");
  });
});

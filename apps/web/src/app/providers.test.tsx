// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Providers from "./providers";

vi.mock("@/components/providers/notification-provider", () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("Providers", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    window.localStorage.clear();
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
});

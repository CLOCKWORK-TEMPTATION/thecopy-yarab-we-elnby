import { beforeEach, describe, expect, it, vi } from "vitest";

import { useApp } from "../context/AppContext";
import { APP_STORAGE_KEY } from "../lib/storage";
import { fireEvent, renderWithApp, screen } from "../test-utils";

function TestHarness() {
  const { currentView, theme, user, navigate, toggleTheme, handleRegister } =
    useApp();

  return (
    <div>
      <span data-testid="view">{currentView}</span>
      <span data-testid="theme">{theme}</span>
      <span data-testid="user">{user?.name ?? "guest"}</span>
      <button onClick={() => navigate("rhythm")}>goto-rhythm</button>
      <button onClick={toggleTheme}>toggle-theme</button>
      <button
        onClick={() =>
          handleRegister("سارة علي", "sara@example.com", "StrongPass123")
        }
      >
        register
      </button>
    </div>
  );
}

describe("جاهزية الإنتاج - حالة التطبيق", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/actorai-arabic");
    window.scrollTo = vi.fn();
  });

  it("يقرأ العرض الحالي من عنوان الصفحة ثم يثبته عند التنقل", () => {
    window.history.replaceState({}, "", "/actorai-arabic?view=webcam");

    renderWithApp(<TestHarness />);

    expect(screen.getByTestId("view")).toHaveTextContent("webcam");

    fireEvent.click(screen.getByText("goto-rhythm"));

    expect(screen.getByTestId("view")).toHaveTextContent("rhythm");
    expect(new URLSearchParams(window.location.search).get("view")).toBe(
      "rhythm"
    );

    const stored = JSON.parse(
      localStorage.getItem(APP_STORAGE_KEY) ?? "{}"
    ) as { currentView?: string };

    expect(stored.currentView).toBe("rhythm");
  });

  it("يحفظ السمة والمستخدم ويستعيدهما بعد إعادة التحميل", () => {
    const { unmount } = renderWithApp(<TestHarness />);

    fireEvent.click(screen.getByText("toggle-theme"));
    fireEvent.click(screen.getByText("register"));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("user")).toHaveTextContent("سارة علي");

    unmount();

    renderWithApp(<TestHarness />);

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("user")).toHaveTextContent("سارة علي");
  });
});

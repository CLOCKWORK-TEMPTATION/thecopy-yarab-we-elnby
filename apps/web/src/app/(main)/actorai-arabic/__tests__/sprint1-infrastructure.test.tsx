import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderWithApp, screen, fireEvent, act } from "../test-utils";
import { useApp } from "../context/AppContext";
import { render } from "@testing-library/react";
import { AppHeader } from "../layout/AppHeader";
import { AppFooter } from "../layout/AppFooter";
import { NotificationBanner } from "../layout/NotificationBanner";

// ── AppContext ──

describe("AppContext", () => {
  it("يوفر القيم الافتراضية الصحيحة", () => {
    function Inspector() {
      const ctx = useApp();
      return (
        <div>
          <span data-testid="view">{ctx.currentView}</span>
          <span data-testid="theme">{ctx.theme}</span>
          <span data-testid="user">{ctx.user ? "logged-in" : "guest"}</span>
        </div>
      );
    }

    renderWithApp(<Inspector />);
    expect(screen.getByTestId("view")).toHaveTextContent("home");
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("user")).toHaveTextContent("guest");
  });

  it("يطلق خطأ عند الاستخدام خارج AppProvider", () => {
    function Orphan() {
      useApp();
      return null;
    }

    // suppress console.error for expected throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow();
    spy.mockRestore();
  });

  it("يتنقل بين الصفحات", () => {
    function Nav() {
      const { currentView, navigate } = useApp();
      return (
        <div>
          <span data-testid="view">{currentView}</span>
          <button onClick={() => navigate("demo")}>go</button>
        </div>
      );
    }

    renderWithApp(<Nav />);
    expect(screen.getByTestId("view")).toHaveTextContent("home");
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByTestId("view")).toHaveTextContent("demo");
  });

  it("يبدل السمة بين الفاتحة والداكنة", () => {
    function ThemeToggle() {
      const { theme, toggleTheme } = useApp();
      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <button onClick={toggleTheme}>toggle</button>
        </div>
      );
    }

    renderWithApp(<ThemeToggle />);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("يسجل الدخول ويسجل الخروج", () => {
    function Auth() {
      const { user, handleLogin, handleLogout } = useApp();
      return (
        <div>
          <span data-testid="user">{user ? user.name : "guest"}</span>
          <button onClick={() => handleLogin("test@test.com", "pass")}>
            login
          </button>
          <button onClick={handleLogout}>logout</button>
        </div>
      );
    }

    renderWithApp(<Auth />);
    expect(screen.getByTestId("user")).toHaveTextContent("guest");
    fireEvent.click(screen.getByText("login"));
    expect(screen.getByTestId("user")).toHaveTextContent("أحمد محمد");
    fireEvent.click(screen.getByText("logout"));
    expect(screen.getByTestId("user")).toHaveTextContent("guest");
  });

  it("يعرض الإشعارات ويخفيها تلقائياً", () => {
    vi.useFakeTimers();

    function Notifier() {
      const { notification, showNotification } = useApp();
      return (
        <div>
          <span data-testid="notif">
            {notification ? notification.message : "none"}
          </span>
          <button onClick={() => showNotification("success", "تم!")}>
            notify
          </button>
        </div>
      );
    }

    renderWithApp(<Notifier />);
    expect(screen.getByTestId("notif")).toHaveTextContent("none");
    fireEvent.click(screen.getByText("notify"));
    expect(screen.getByTestId("notif")).toHaveTextContent("تم!");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("notif")).toHaveTextContent("none");

    vi.useRealTimers();
  });
});

// ── AppHeader ──

describe("AppHeader", () => {
  it("يعرض عنوان التطبيق وأزرار التنقل", () => {
    renderWithApp(<AppHeader />);
    expect(screen.getByText("الممثل الذكي")).toBeInTheDocument();
    expect(screen.getByText(/الرئيسية/)).toBeInTheDocument();
    expect(screen.getByText(/التجربة/)).toBeInTheDocument();
  });

  it("يعرض أزرار تسجيل الدخول والتسجيل للزائر", () => {
    renderWithApp(<AppHeader />);
    expect(screen.getByText("دخول")).toBeInTheDocument();
    expect(screen.getByText("ابدأ الآن")).toBeInTheDocument();
  });

  it("يعرض زر تبديل السمة", () => {
    renderWithApp(<AppHeader />);
    // Theme toggle button shows moon emoji in light mode
    expect(screen.getByText("🌙")).toBeInTheDocument();
  });
});

// ── AppFooter ──

describe("AppFooter", () => {
  it("يعرض معلومات التذييل الأساسية", () => {
    render(<AppFooter />);
    expect(screen.getByText("© 2025 الممثل الذكي")).toBeInTheDocument();
  });
});

// ── NotificationBanner ──

describe("NotificationBanner", () => {
  it("لا يعرض شيئاً عند عدم وجود إشعار", () => {
    const { container } = renderWithApp(<NotificationBanner />);
    // should render nothing
    expect(container.firstChild).toBeNull();
  });
});

// ── Shell Smoke ──

describe("Shell - ActorAiArabicStudioV2", () => {
  it("يتم تحميله وعرضه بدون أخطاء", async () => {
    const { default: ActorAiArabicStudioV2 } =
      await import("../components/ActorAiArabicStudioV2");
    const { container } = render(
      <React.Suspense fallback={<div>loading</div>}>
        <ActorAiArabicStudioV2 />
      </React.Suspense>
    );
    // Should render the shell (header at minimum)
    expect(container).toBeTruthy();
  });
});

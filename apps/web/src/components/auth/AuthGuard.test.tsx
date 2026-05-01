import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/hooks/useAuth";

import { AuthGuard } from "./AuthGuard";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);

describe("AuthGuard", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/ui");
    mockedUsePathname.mockReturnValue("/ui");
    mockedUseRouter.mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("redirects anonymous users to login with the requested page", async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <AuthGuard>
        <div>محتوى محمي</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?redirect=%2Fui");
    });
    expect(screen.queryByText("محتوى محمي")).not.toBeInTheDocument();
  });

  it("keeps the query string in the return path", async () => {
    window.history.replaceState({}, "", "/ui?tab=launcher");
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <AuthGuard>
        <div>محتوى محمي</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/login?redirect=%2Fui%3Ftab%3Dlauncher"
      );
    });
  });

  it("renders children for authenticated users", () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        firstName: "Test",
        lastName: "User",
        mfaEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      loading: false,
    });

    render(
      <AuthGuard>
        <div>محتوى محمي</div>
      </AuthGuard>
    );

    expect(screen.getByText("محتوى محمي")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "./login/page";
import RegisterPage from "./register/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

describe("auth forms", () => {
  it("sets autocomplete attributes on the login form", () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText("البريد الإلكتروني")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByPlaceholderText("كلمة المرور")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("sets autocomplete attributes on the register form", () => {
    render(<RegisterPage />);

    expect(screen.getByPlaceholderText("البريد الإلكتروني")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByPlaceholderText("كلمة المرور القوية")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });
});

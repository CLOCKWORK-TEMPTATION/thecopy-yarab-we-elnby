import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("BREAKAPP not found page", () => {
  it("renders an explicit not-found state inside the gateway scope", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", {
        name: "المسار غير موجود داخل بوابة بريك آب",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "العودة إلى بوابة الدخول" })
    ).toHaveAttribute("href", "/BREAKAPP");
    expect(
      screen.getByRole("link", { name: "فتح تسجيل الدخول بالرمز" })
    ).toHaveAttribute("href", "/BREAKAPP/login/qr");
  });
});

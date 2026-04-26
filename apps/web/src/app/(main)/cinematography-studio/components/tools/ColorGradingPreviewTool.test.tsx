import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ColorGradingPreviewTool } from "./ColorGradingPreviewTool";

describe("ColorGradingPreviewTool", () => {
  it("يعطل السلايدر عند تفعيل قالب ويعيده بعد التحرير اليدوي", async () => {
    const user = userEvent.setup();
    render(<ColorGradingPreviewTool />);

    await user.click(screen.getByRole("button", { name: /نيون نوار/i }));

    const temperatureInput = screen.getByRole("spinbutton", {
      name: /حرارة اللون input/i,
    });

    expect(screen.getAllByText(/يثبت إعدادات الدرجة الحالية/i)).toHaveLength(2);
    expect(temperatureInput).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /تحرير الدرجة/i }));

    expect(temperatureInput).toBeEnabled();
  });
});

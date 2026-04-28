import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DOFCalculatorTool } from "./DOFCalculatorTool";

import type { DOFResult } from "./DOFCalculatorTool";

describe("DOFCalculatorTool", () => {
  it("يحدث الحساب المشتق فور تعديل مسافة الهدف", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn<(result: DOFResult) => void>();

    render(<DOFCalculatorTool onCalculate={onCalculate} />);

    const distanceInput = screen.getByRole("spinbutton", {
      name: /مسافة الهدف input/i,
    });

    await user.clear(distanceInput);
    await user.type(distanceInput, "10");
    fireEvent.blur(distanceInput);

    await waitFor(() => expect(onCalculate).toHaveBeenCalledTimes(2));
    const [lastResult] = onCalculate.mock.calls.at(-1) ?? [];
    expect(lastResult?.nearLimit).toEqual(expect.any(Number));
    expect(lastResult?.hyperfocal).toEqual(expect.any(Number));
    expect(screen.getByText("10.0م")).toBeInTheDocument();
  });
});

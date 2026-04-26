import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DOFCalculatorTool } from "./DOFCalculatorTool";

describe("DOFCalculatorTool", () => {
  it("يحدث الحساب المشتق فور تعديل مسافة الهدف", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();

    render(<DOFCalculatorTool onCalculate={onCalculate} />);

    const distanceInput = screen.getByRole("spinbutton", {
      name: /مسافة الهدف input/i,
    });

    await user.clear(distanceInput);
    await user.type(distanceInput, "10");
    fireEvent.blur(distanceInput);

    await waitFor(() => {
      expect(onCalculate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          nearLimit: expect.any(Number),
          hyperfocal: expect.any(Number),
        })
      );
    });

    expect(onCalculate).toHaveBeenCalledTimes(2);
    expect(screen.getByText("10.0م")).toBeInTheDocument();
  });
});

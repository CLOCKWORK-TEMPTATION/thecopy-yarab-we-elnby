import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LensSimulatorTool } from "./LensSimulatorTool";

Object.defineProperty(Element.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});

Object.defineProperty(Element.prototype, "setPointerCapture", {
  configurable: true,
  value: () => undefined,
});

Object.defineProperty(Element.prototype, "releasePointerCapture", {
  configurable: true,
  value: () => undefined,
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

describe("Cinematography controls", () => {
  it("locks preset-bound lens fields until manual unlock", async () => {
    const user = userEvent.setup();
    render(<LensSimulatorTool />);

    await user.click(screen.getByRole("combobox"));
    await user.click(
      screen.getByText((content) => content.includes("Zeiss Master Prime"))
    );

    const focalInput = screen.getByRole("spinbutton", {
      name: /البعد البؤري input/i,
    });

    expect(
      screen.getByText((content) => content.includes("يثبّت البعد البؤري"))
    ).toBeInTheDocument();
    expect(focalInput).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /تحرير يدوي/i }));

    expect(focalInput).toBeEnabled();
  });
});

import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SliderNumberInput } from "./SliderNumberInput";

function Harness() {
  const [value, setValue] = React.useState(40);

  return (
    <SliderNumberInput
      label="التجربة"
      value={value}
      min={0}
      max={100}
      step={1}
      unit="%"
      onChange={setValue}
    />
  );
}

describe("SliderNumberInput", () => {
  it("يضبط قيمة الحقل ضمن الحدود ويعيد مزامنتها", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole("spinbutton", { name: /التجربة input/i });
    await user.clear(input);
    await user.type(input, "999");
    fireEvent.blur(input);

    expect(input).toHaveValue(100);
  });

  it("يستجيب لخطوات لوحة المفاتيح على السلايدر", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    expect(
      screen.getByRole("spinbutton", { name: /التجربة input/i })
    ).toHaveValue(42);
  });
});

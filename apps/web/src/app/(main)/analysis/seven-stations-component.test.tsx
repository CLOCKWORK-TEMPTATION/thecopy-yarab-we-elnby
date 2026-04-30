import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialState, type MachineState } from "./lib/state-machine";
import SevenStationsComponent from "./seven-stations-component";

const controls = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
  machine: null as ReturnType<typeof buildMachine> | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: controls.push,
    replace: controls.replace,
  }),
  useSearchParams: () => controls.searchParams,
}));

vi.mock("./hooks/useAnalysisMachine", () => ({
  useAnalysisMachine: () => controls.machine,
}));

function buildMachine(state: Partial<MachineState> = {}) {
  const mergedState = { ...initialState, ...state };
  return {
    state: mergedState,
    progress: 0,
    isRunning: false,
    allCompleted: false,
    start: vi.fn(),
    reset: vi.fn(),
    retryStation: vi.fn(),
    exportAs: vi.fn(),
  };
}

describe("SevenStationsComponent", () => {
  beforeEach(() => {
    controls.push.mockReset();
    controls.replace.mockReset();
    controls.searchParams = new URLSearchParams();
    controls.machine = buildMachine();
    window.history.replaceState({}, "", "/analysis");
  });

  it("resets text and removes the analysis id from the route", () => {
    controls.searchParams = new URLSearchParams("analysis=analysis-1");
    window.history.replaceState({}, "", "/analysis?analysis=analysis-1");
    const machine = buildMachine();
    controls.machine = machine;

    render(<SevenStationsComponent />);

    const textarea = screen.getByPlaceholderText(
      "ألصق النص الدرامي هنا لبدء التحليل ..."
    );
    fireEvent.change(textarea, { target: { value: "نص للاختبار" } });
    fireEvent.click(screen.getByRole("button", { name: /إعادة تعيين/ }));

    expect(machine.reset).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("");
    expect(controls.replace).toHaveBeenCalledWith("/analysis", {
      scroll: false,
    });
  });

  it("does not render export actions when analysis failed before completion", () => {
    controls.machine = buildMachine({
      analysisId: "analysis-1",
      status: "failed",
      fatalError: "خدمة التحليل غير متاحة الآن",
      capabilities: { exports: ["json", "docx"] },
    });

    render(<SevenStationsComponent />);

    expect(
      screen.queryByRole("button", { name: /تصدير/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("لا توجد نتائج مكتملة قابلة للتصدير بعد.")
    ).toBeInTheDocument();
  });
});

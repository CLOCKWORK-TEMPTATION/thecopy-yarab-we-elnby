import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./paste-classifier", () => ({
  classifyLines: vi.fn(() => []),
  PIPELINE_FLAGS: {},
}));

import { registerPipelineDiagnostics } from "./pipeline-diagnostics";
import { registerPipelineRecorderUI } from "./pipeline-recorder";

type DebugWindow = Window & {
  __diagnosePipeline?: unknown;
  __showPipelineRun?: unknown;
  __showLineJourney?: unknown;
  __pipelineRecorderUiRegistered?: boolean;
};

const resetDebugWindow = (): void => {
  const debugWindow = window as DebugWindow;
  delete debugWindow.__diagnosePipeline;
  delete debugWindow.__showPipelineRun;
  delete debugWindow.__showLineJourney;
  delete debugWindow.__pipelineRecorderUiRegistered;
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  resetDebugWindow();
});

describe("pipeline debug registration", () => {
  it("يخفي رسائل الجاهزية افتراضيًا مع بقاء الأدوات اليدوية", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      /* empty */
    });

    registerPipelineRecorderUI();
    registerPipelineDiagnostics(() => "سطر تجريبي");

    const debugWindow = window as DebugWindow;
    expect(typeof debugWindow.__showPipelineRun).toBe("function");
    expect(typeof debugWindow.__showLineJourney).toBe("function");
    expect(typeof debugWindow.__diagnosePipeline).toBe("function");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

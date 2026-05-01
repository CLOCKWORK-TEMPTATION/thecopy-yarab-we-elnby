// @vitest-environment jsdom

import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadRemoteAppState =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPersistRemoteAppState =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/ai/gemini-core", () => ({
  toText: (v: unknown) => String(v),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: (...args: unknown[]) => mockLoadRemoteAppState(...args),
  persistRemoteAppState: (...args: unknown[]) =>
    mockPersistRemoteAppState(...args),
}));

import { mountHook } from "./test-helpers";

describe("development remote app persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockLoadRemoteAppState.mockResolvedValue(null);
    mockPersistRemoteAppState.mockResolvedValue(undefined);
  });

  it("restores the development draft from the remote app database", async () => {
    mockLoadRemoteAppState.mockImplementation((appId) =>
      Promise.resolve(
        appId === "development"
          ? {
              textInput: "remote script draft",
              analysisReport: "remote analysis report",
              specialRequirements: "remote requirements",
              additionalInfo: "remote notes",
              ts: Date.now(),
            }
          : null,
      ),
    );

    const { result } = await mountHook();

    await waitFor(() => {
      expect(result.current.textInput).toBe("remote script draft");
    });
    expect(result.current.analysisReport).toBe("remote analysis report");
    expect(result.current.specialRequirements).toBe("remote requirements");
    expect(result.current.additionalInfo).toBe("remote notes");
    expect(mockLoadRemoteAppState).toHaveBeenCalledWith("development");
  });

  it("persists development draft changes to the remote app database", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("new script draft");
      result.current.setAnalysisReport("new analysis report");
      result.current.setSpecialRequirements("new requirements");
      result.current.setAdditionalInfo("new notes");
    });

    await waitFor(() => {
      expect(mockPersistRemoteAppState).toHaveBeenCalledWith(
        "development",
        expect.objectContaining({
          textInput: "new script draft",
          analysisReport: "new analysis report",
          specialRequirements: "new requirements",
          additionalInfo: "new notes",
        }),
      );
    });
  });
});

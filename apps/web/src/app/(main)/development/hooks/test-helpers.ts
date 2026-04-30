// Test helpers for useCreativeDevelopment tests

import { renderHook } from "@testing-library/react";

import { READY_TEXT_INPUT, READY_ANALYSIS_REPORT } from "./test-fixtures";
import { useCreativeDevelopment } from "./useCreativeDevelopment";

type FetchMockCall = [Parameters<typeof fetch>[0], RequestInit | undefined];

type FetchMock = typeof fetch & {
  mock: {
    calls: FetchMockCall[];
  };
};

/** Build a minimal OK fetch response */
export function okResponse(body: unknown = { success: true }) {
  return {
    ok: true,
    status: 200,
    json: () => body,
  } as unknown as Response;
}

/** Build a minimal error fetch response */
export function errResponse(status = 500) {
  return {
    ok: false,
    status,
    json: () => ({ error: "server error" }),
  } as unknown as Response;
}

/** Render the hook and return { result } */
export function mountHook() {
  return renderHook(() => useCreativeDevelopment());
}

/** Read the RequestInit options from a captured fetch mock call */
export function fetchCallOptions(callIndex: number): RequestInit | undefined {
  const call = (global.fetch as FetchMock).mock.calls[callIndex];
  return call?.[1];
}

/** ????? ?????? ?????? ??????? ?????? ???? ????? ??????? */
export function applyExecutionPrerequisites(
  result: ReturnType<typeof mountHook>["result"]
) {
  result.current.setTextInput(READY_TEXT_INPUT);
  result.current.setAnalysisReport(READY_ANALYSIS_REPORT);
}

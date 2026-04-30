import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenePartner } from "./useScenePartner";

describe("useScenePartner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("responds to every user turn and exposes a loading state", () => {
    const { result } = renderHook(() => useScenePartner());

    act(() => result.current.startRehearsal());
    act(() => result.current.setUserInput("لماذا لا تصدقينني؟"));
    act(() => result.current.sendMessage());

    expect(result.current.partnerStatus).toBe("thinking");
    expect(result.current.chatMessages.at(-1)?.role).toBe("ai");
    expect(result.current.chatMessages.at(-1)?.typing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(650);
    });

    expect(result.current.partnerStatus).toBe("ready");
    expect(result.current.chatMessages.at(-1)?.role).toBe("ai");
    expect(result.current.chatMessages.at(-1)?.typing).toBeFalsy();

    act(() => result.current.setUserInput("أعدك أنني لن أرحل."));
    act(() => result.current.sendMessage());
    act(() => {
      vi.advanceTimersByTime(650);
    });

    const aiReplies = result.current.chatMessages.filter(
      (message) => message.role === "ai" && !message.typing
    );
    expect(aiReplies.length).toBeGreaterThanOrEqual(3);
    expect(aiReplies.at(-1)?.text).toContain("الوعد");
  });
});

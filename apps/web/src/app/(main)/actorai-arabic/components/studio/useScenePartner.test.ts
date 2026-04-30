import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenePartner } from "./useScenePartner";

function mockFetch(response: string) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    json: () =>
      Promise.resolve({ data: { response, timestamp: new Date().toISOString() } }),
    ok: true,
  } as Response);
}

describe("useScenePartner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("responds to every user turn and exposes a loading state", async () => {
    mockFetch("أنا أصدقك يا عزيزي، لكن الأفعال تتحدث أكثر من الكلام");

    const { result } = renderHook(() => useScenePartner());

    act(() => result.current.startRehearsal());
    act(() => result.current.setUserInput("لماذا لا تصدقينني؟"));
    act(() => result.current.sendMessage());

    expect(result.current.partnerStatus).toBe("thinking");
    expect(result.current.chatMessages.at(-1)?.role).toBe("ai");
    expect(result.current.chatMessages.at(-1)?.typing).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.partnerStatus).toBe("ready");
    expect(result.current.chatMessages.at(-1)?.role).toBe("ai");
    expect(result.current.chatMessages.at(-1)?.typing).toBeFalsy();

    mockFetch("الوعد وحده لا يكفي، أريد أن أرى التغيير بنفسي");

    act(() => result.current.setUserInput("أعدك أنني لن أرحل."));
    act(() => result.current.sendMessage());

    await act(async () => {
      await Promise.resolve();
    });

    const aiReplies = result.current.chatMessages.filter(
      (message) => message.role === "ai" && !message.typing
    );
    expect(aiReplies.length).toBeGreaterThanOrEqual(3);
    expect(aiReplies.at(-1)?.text).toContain("الوعد");
  });
});

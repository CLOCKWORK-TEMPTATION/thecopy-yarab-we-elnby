// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useToastQueue } from "../../application/workspace/use-toast-queue";

describe("useToastQueue", () => {
  it("يضيف إشعارًا جديدًا ويمكن إزالته", () => {
    const { result } = renderHook(() => useToastQueue());

    let toastId = "";
    act(() => {
      toastId = result.current.success("نجاح");
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("يزيل الإشعار تلقائيًا بعد انتهاء المدة", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToastQueue());

    act(() => {
      result.current.info("معلومة", { duration: 10 });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(11);
    });

    expect(result.current.toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});

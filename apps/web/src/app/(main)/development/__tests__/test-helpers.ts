import { renderHook, act } from "@testing-library/react";

/** Render the hook */
export async function mountHook() {
  // Import hook dynamically to ensure mocks are loaded first
  const { useCreativeDevelopment } =
    await import("../hooks/useCreativeDevelopment");
  return renderHook(() => useCreativeDevelopment());
}

type MountedCreativeHookResult = Awaited<
  ReturnType<typeof mountHook>
>["result"];

/**
 * يعيّن الحقول الإلزامية لتنفيذ executeTask("completion"):
 * - textInput >= 20 حرف
 * - analysisReport غير فارغ
 * - completionScope غير فارغ (مطلوب لمهمة "completion" فقط)
 */
export function prepareForExecution(
  result: MountedCreativeHookResult,
  overrides?: { text?: string; report?: string; scope?: string }
) {
  act(() => {
    result.current.setTextInput(overrides?.text ?? "أ".repeat(200));
    result.current.setAnalysisReport(
      overrides?.report ?? "تقرير تحليل الأداء الدرامي — حد أدنى مطلوب"
    );
    result.current.setCompletionScope(
      overrides?.scope ?? "تحسين الحوار والأسلوب الروائي"
    );
  });
}

import type { ProgressiveSurfaceState } from "./editor-area.types";

/**
 * يحدد هل لدى السطح نسخة مرئية صالحة يمكن الإبقاء عليها بعد الفشل.
 */
export const hasVisibleProgressiveVersion = (
  state: ProgressiveSurfaceState | null
): boolean =>
  Boolean(
    state?.visibleVersion ??
    state?.activeRun?.currentVisibleVersionId ??
    state?.visibleElements?.length
  );

/**
 * في حال انتهى الـ pipeline بلا نسخة مرئية، يجب تنظيف الحالة وفك القفل بالكامل.
 */
export const shouldClearProgressiveStateOnRunEnd = (
  state: ProgressiveSurfaceState | null
): boolean => Boolean(state?.activeRun) && !hasVisibleProgressiveVersion(state);

/**
 * عند فشل التشغيل بعد ظهور نسخة، نبقي التحذير ظاهرًا لكن نعيد المحرر للوضع القابل للتحرير.
 */
export const shouldKeepSurfaceEditableAfterFailure = (
  state: ProgressiveSurfaceState | null
): boolean => hasVisibleProgressiveVersion(state);

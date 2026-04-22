type MobileListener = (isMobile: boolean) => void;

/**
 * @description المحرر يعمل وفق مرجع سطح المكتب فقط. لذلك تُعاد دائمًا
 *   قيمة `false` حتى لا يُفعَّل أي مسار يعيد تشكيل الواجهة مع تضييق المساحة.
 *
 * @returns {boolean} دائمًا `false`.
 *
 * @complexity الزمنية: O(1) | المكانية: O(1)
 *
 * @sideEffects
 *   - يقرأ `window.innerWidth`.
 *
 * @example
 * ```typescript
 * const isMobile = useIsMobile();
 * ```
 */
export const useIsMobile = (): boolean => {
  return false;
};

/**
 * @description يبقي المحرر في وضع سطح المكتب المرجعي، لذلك تُستدعى
 *   الدالة مرة واحدة بقيمة `false` من دون أي اشتراك حي.
 *
 * @param {MobileListener} listener - الدالة المراد تنفيذها عند تغير الحالة.
 *
 * @returns {() => void} دالة لإلغاء الاشتراك (Cleanup/Unsubscribe).
 *
 * @complexity الزمنية: O(1) | المكانية: O(1)
 *
 * @sideEffects
 *   - يُراقب أحداث `change` على `matchMedia`.
 *
 * @example
 * ```typescript
 * const unsubscribe = subscribeIsMobile((isMobile) => console.log(isMobile));
 * // لاحقا
 * unsubscribe();
 * ```
 */
export const subscribeIsMobile = (listener: MobileListener): (() => void) => {
  listener(false);
  return () => undefined;
};

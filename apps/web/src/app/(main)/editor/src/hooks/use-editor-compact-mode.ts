import { useEffect, useState } from "react";

import { EDITOR_COMPACT_BREAKPOINT_PX } from "../constants/shell-layout";

/**
 * @description يراقب عرض النافذة ويُعيد `true` عندما تصغر الشاشة عن الحد المضغوط.
 *   يُستخدم لإخفاء الشريط الجانبي وتوسيط الصفحة في الـ viewport عند الشاشات الصغيرة.
 *
 * @returns {boolean} `true` إذا كانت الشاشة أصغر من `EDITOR_COMPACT_BREAKPOINT_PX`.
 *
 * @complexity الزمنية: O(1) | المكانية: O(1)
 *
 * @sideEffects
 *   - يقرأ `window.matchMedia` ويشترك في حدث `change`.
 *   - يتم إلغاء الاشتراك تلقائيًا عند فك ربط المكوّن.
 */
export const useEditorCompactMode = (): boolean => {
  const [isCompact, setIsCompact] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = `(max-width: ${EDITOR_COMPACT_BREAKPOINT_PX - 1}px)`;
    const mql = window.matchMedia(query);
    const update = (): void => setIsCompact(mql.matches);

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isCompact;
};

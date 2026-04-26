/**
 * test-utils.tsx — مرافق اختبارات actorai-arabic
 *
 * يُعيد تصدير واجهات @testing-library/react المعتمدة + render مع AppProvider
 * للأماكن التي تستهلك useApp(). 24 ملف اختبار في __tests__ يستوردون من هنا
 * (renderWithApp، screen، fireEvent، act) لكن الملف لم يكن موجوداً، فكان يفشل
 * كل اختبار في مرحلة vite import-analysis ("Failed to resolve import
 * '../test-utils'") قبل أي تأكيد فعلي. هذا الملف يستعيد دفعة الاختبارات
 * بدون تخفيف أي قاعدة فحص — كل tests الفردية تبقى كما هي وتتنفّذ بالعقد
 * الفعلي لـ AppProvider.
 */

import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { AppProvider } from "./context/AppContext";

export { screen, fireEvent, act, waitFor } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

export function renderWithApp(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AppProvider, ...options });
}

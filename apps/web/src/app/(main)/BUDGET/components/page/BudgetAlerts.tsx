import { AlertCircle } from "lucide-react";

import type { BudgetRuntimeMeta } from "../../types";

export function BudgetAlerts({
  error,
  runtimeMeta,
}: {
  error: string | null;
  runtimeMeta: BudgetRuntimeMeta | null;
}) {
  return (
    <>
      {error ? (
        <div
          data-testid="budget-error-alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {runtimeMeta?.source === "fallback" ? (
        <div
          data-testid="budget-fallback-banner"
          className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100"
        >
          تم إنشاء النتيجة عبر وضع الاستمرارية المحلي لأن مزود الذكاء الاصطناعي
          غير متاح حاليًا.
        </div>
      ) : null}
    </>
  );
}

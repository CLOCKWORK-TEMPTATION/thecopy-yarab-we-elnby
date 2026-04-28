import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { formatCurrency } from "../../lib/budget-page-utils";

import type { BudgetDocument, BudgetRuntimeMeta } from "../../types";

interface BudgetSummaryPanelProps {
  budget: BudgetDocument | null;
  runtimeMeta: BudgetRuntimeMeta | null;
  persistedAt: string | null;
}

export function BudgetSummaryPanel({
  budget,
  runtimeMeta,
  persistedAt,
}: BudgetSummaryPanelProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-white">ملخص الميزانية</CardTitle>
          <CardDescription className="text-white/52">
            ناتج `/api/budget/generate`
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budget ? (
            <>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs text-emerald-200">الإجمالي الكلي</p>
                <p
                  data-testid="budget-grand-total"
                  className="mt-2 text-3xl font-bold text-white"
                >
                  {formatCurrency(budget.grandTotal, budget.currency)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4 text-sm text-white/68">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    {runtimeMeta?.source === "fallback"
                      ? "المسار المستخدم: وضع الاستمرارية المحلي"
                      : "المسار المستخدم: مزود الذكاء الاصطناعي"}
                  </span>
                  <span data-testid="budget-persisted-at">
                    {persistedAt
                      ? `آخر حفظ: ${new Date(persistedAt).toLocaleString("ar-EG")}`
                      : "لم يُسجل حفظ بعد"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {budget.sections.map((section) => (
                  <BudgetSectionSummary
                    key={section.id}
                    section={section}
                    currency={budget.currency}
                  />
                ))}
              </div>
            </>
          ) : (
            <p
              data-testid="budget-summary-empty"
              className="text-sm text-white/52"
            >
              لم تُنشأ الميزانية بعد.
            </p>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

function BudgetSectionSummary({
  section,
  currency,
}: {
  section: BudgetDocument["sections"][number];
  currency: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{section.name}</p>
          <p className="text-xs text-white/45">
            {section.categories.length} فئة
          </p>
        </div>
        <p className="text-sm font-semibold text-white">
          {formatCurrency(section.total, currency)}
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {section.categories.map((category) => (
          <div key={category.code} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/82">{category.name}</span>
              <span className="text-white/52">
                {formatCurrency(category.total, currency)}
              </span>
            </div>
            <div className="space-y-1 text-xs text-white/42">
              {category.items.slice(0, 3).map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between gap-3"
                >
                  <span>{item.description}</span>
                  <span>{formatCurrency(item.total, currency)}</span>
                </div>
              ))}
              {category.items.length > 3 ? (
                <div className="text-white/35">
                  + {category.items.length - 3} بنود أخرى
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

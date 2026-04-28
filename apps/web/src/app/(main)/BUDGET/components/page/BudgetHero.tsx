import { Film } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { formatCurrency } from "../../lib/budget-page-utils";

import type { BudgetDocument, BudgetRuntimeMeta } from "../../types";
import type { ReactNode } from "react";

interface BudgetHeroProps {
  totalLineItems: number;
  hasAnalysis: boolean;
  budget: BudgetDocument | null;
  runtimeMeta: BudgetRuntimeMeta | null;
  analyzing: boolean;
  generating: boolean;
  restoringState: boolean;
}

export function BudgetHero({
  totalLineItems,
  hasAnalysis,
  budget,
  runtimeMeta,
  analyzing,
  generating,
  restoringState,
}: BudgetHeroProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Film className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
              BUDGET STUDIO
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-white md:text-5xl">
              ميزانية إنتاج داخل قشرة موحدة
            </h1>
            <p className="mt-3 max-w-4xl text-base leading-8 text-white/68 md:text-lg">
              نفس نواة المنصة البصرية، لكن بنبرة تشغيلية مالية أوضح تناسب
              التحليل والتوليد والتصدير ومراجعة التكاليف.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <BudgetStat label="حالة التحليل">
            {restoringState
              ? "جارٍ الاستعادة"
              : generating || analyzing
                ? "قيد المعالجة"
                : hasAnalysis
                  ? "جاهز"
                  : "غير منفذ"}
          </BudgetStat>
          <BudgetStat label="إجمالي البنود">{totalLineItems}</BudgetStat>
          <BudgetStat
            label="الإجمالي الحالي"
            className="col-span-2 md:col-span-1"
          >
            {budget ? formatCurrency(budget.grandTotal, budget.currency) : "—"}
          </BudgetStat>
          <BudgetStat label="مصدر التوليد" className="col-span-2 md:col-span-1">
            {runtimeMeta?.source === "fallback"
              ? "وضع الاستمرارية"
              : runtimeMeta?.source === "ai"
                ? "ذكاء اصطناعي مباشر"
                : "—"}
          </BudgetStat>
        </div>
      </div>
    </CardSpotlight>
  );
}

function BudgetStat({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4 ${className}`}
    >
      <p className="text-xs text-white/42">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{children}</p>
    </div>
  );
}

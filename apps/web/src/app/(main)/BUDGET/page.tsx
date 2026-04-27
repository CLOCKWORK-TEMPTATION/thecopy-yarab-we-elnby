"use client";

/**
 * الصفحة: BUDGET
 * الهوية: استوديو ميزانية إنتاجية بطابع مالي/تشغيلي داخل قشرة موحدة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border, --page-surface
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import { BudgetAlerts } from "./components/page/BudgetAlerts";
import { BudgetAnalysisPanel } from "./components/page/BudgetAnalysisPanel";
import { BudgetHero } from "./components/page/BudgetHero";
import { BudgetPageBackground } from "./components/page/BudgetPageBackground";
import { BudgetProjectInput } from "./components/page/BudgetProjectInput";
import { BudgetSummaryPanel } from "./components/page/BudgetSummaryPanel";
import { useBudgetStudio } from "./hooks/useBudgetStudio";

export default function BudgetPage() {
  const {
    title,
    setTitle,
    scenario,
    setScenario,
    analysis,
    budget,
    runtimeMeta,
    analyzing,
    generating,
    exporting,
    restoringState,
    persistedAt,
    error,
    totalLineItems,
    handleAnalyze,
    handleGenerate,
    handleExport,
  } = useBudgetStudio();

  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))] text-white"
      style={{
        ["--page-accent" as string]: "var(--accent-success, #099268)",
        ["--page-accent-2" as string]: "var(--brand-bronze, #746842)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      <BudgetPageBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <BudgetHero
            totalLineItems={totalLineItems}
            hasAnalysis={Boolean(analysis)}
            budget={budget}
            runtimeMeta={runtimeMeta}
            analyzing={analyzing}
            generating={generating}
            restoringState={restoringState}
          />

          <BudgetAlerts error={error} runtimeMeta={runtimeMeta} />

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <BudgetProjectInput
              title={title}
              scenario={scenario}
              analyzing={analyzing}
              generating={generating}
              exporting={exporting}
              restoringState={restoringState}
              hasBudget={Boolean(budget)}
              onTitleChange={setTitle}
              onScenarioChange={setScenario}
              onAnalyze={handleAnalyze}
              onGenerate={handleGenerate}
              onExport={handleExport}
            />

            <div className="space-y-6">
              <BudgetAnalysisPanel analysis={analysis} />
              <BudgetSummaryPanel
                budget={budget}
                runtimeMeta={runtimeMeta}
                persistedAt={persistedAt}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

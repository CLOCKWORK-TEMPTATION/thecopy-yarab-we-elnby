"use client";

/**
 * الصفحة: BUDGET
 * الهوية: استوديو ميزانية إنتاجية بطابع مالي/تشغيلي داخل قشرة موحدة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border, --page-surface
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { BudgetAlerts } from "./components/page/BudgetAlerts";
import { BudgetAnalysisPanel } from "./components/page/BudgetAnalysisPanel";
import { BudgetHero } from "./components/page/BudgetHero";
import { BudgetItemsTable } from "./components/page/BudgetItemsTable";
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
    editor,
    runtimeMeta,
    analyzing,
    generating,
    exporting,
    saving,
    restoringState,
    persistedAt,
    error,
    totalLineItems,
    handleAnalyze,
    handleGenerate,
    handleExport,
    handleSave,
  } = useBudgetStudio();

  const currency = editor.editedBudget?.currency ?? "USD";
  const hasBudget = Boolean(editor.editedBudget);

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
            budget={editor.editedBudget}
            runtimeMeta={runtimeMeta}
            analyzing={analyzing}
            generating={generating}
            restoringState={restoringState}
          />

          <BudgetAlerts error={error} runtimeMeta={runtimeMeta} />

          {/* Top two-column section */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <BudgetProjectInput
              title={title}
              scenario={scenario}
              currency={currency}
              analyzing={analyzing}
              generating={generating}
              exporting={exporting}
              saving={saving}
              restoringState={restoringState}
              hasBudget={hasBudget}
              hasEdits={editor.hasEdits}
              onTitleChange={setTitle}
              onScenarioChange={setScenario}
              onCurrencyChange={editor.setCurrency}
              onAnalyze={handleAnalyze}
              onGenerate={handleGenerate}
              onExport={handleExport}
              onSave={handleSave}
            />

            <div className="space-y-6">
              <BudgetAnalysisPanel analysis={analysis} />
              <BudgetSummaryPanel
                budget={editor.editedBudget}
                runtimeMeta={runtimeMeta}
                persistedAt={persistedAt}
              />
            </div>
          </div>

          {/* Editable budget items table — full width, shown only when budget exists */}
          {editor.editedBudget ? (
            <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle className="text-white">بنود الميزانية</CardTitle>
                </CardHeader>
                <CardContent>
                  <BudgetItemsTable
                    budget={editor.editedBudget}
                    editor={editor}
                  />
                </CardContent>
              </Card>
            </CardSpotlight>
          ) : null}
        </div>
      </div>
    </main>
  );
}

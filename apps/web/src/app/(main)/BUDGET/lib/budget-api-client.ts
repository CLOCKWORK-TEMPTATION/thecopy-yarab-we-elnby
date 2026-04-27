import {
  downloadBlob,
  resolveFilename,
} from "./budget-page-utils";

import type {
  BudgetAnalysisRuntimePayload,
  BudgetDocument,
  BudgetEnvelope,
  BudgetRuntimePayload,
} from "../types";

export async function analyzeBudgetScenario(scenario: string) {
  const response = await fetch("/api/budget/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
  const payload =
    (await response.json()) as BudgetEnvelope<BudgetAnalysisRuntimePayload>;

  if (!response.ok || !payload.success || !payload.data?.analysis) {
    throw new Error(payload.error ?? "فشل في تحليل السيناريو.");
  }

  return payload.data;
}

export async function generateBudgetDocument({
  title,
  scenario,
}: {
  title: string;
  scenario: string;
}) {
  const response = await fetch("/api/budget/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim() || undefined,
      scenario,
    }),
  });
  const payload = (await response.json()) as BudgetEnvelope<BudgetRuntimePayload>;

  if (
    !response.ok ||
    !payload.success ||
    !payload.data?.budget ||
    !payload.data.analysis
  ) {
    throw new Error(payload.error ?? "فشل في إنشاء الميزانية.");
  }

  return payload.data;
}

export async function exportBudgetDocument(budget: BudgetDocument) {
  const response = await fetch("/api/budget/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ budget }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as BudgetEnvelope<never>;
    throw new Error(payload.error ?? "فشل في تصدير ملف الميزانية.");
  }

  const blob = await response.blob();
  downloadBlob(
    blob,
    resolveFilename(
      response,
      `${budget.metadata?.title?.trim() ?? "budget"}.xlsx`
    )
  );
}

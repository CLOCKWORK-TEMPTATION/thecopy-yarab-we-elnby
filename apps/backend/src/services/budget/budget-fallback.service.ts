import { buildFallbackAnalysis } from "./budget-fallback-analysis";
import {
  buildScenarioInsights,
  type ScenarioInsights,
} from "./budget-fallback-insights";

import type {
  BudgetDocument,
  BudgetRuntimeMeta,
  BudgetRuntimeResult,
} from "./budget-types";

interface BudgetEstimateFactors {
  shootingWeeks: number;
  prepWeeks: number;
  postWeeks: number;
  actionPremium: number;
  transportFactor: number;
}

function cloneBudgetTemplate(template: BudgetDocument): BudgetDocument {
  return JSON.parse(JSON.stringify(template)) as BudgetDocument;
}

function buildEstimateFactors(insights: ScenarioInsights): BudgetEstimateFactors {
  return {
    shootingWeeks: Math.max(1, Math.ceil(insights.shootingDays / 5)),
    prepWeeks: Math.max(1, Math.ceil(insights.preProductionDays / 5)),
    postWeeks: Math.max(1, Math.ceil(insights.postProductionDays / 5)),
    actionPremium: 1 + insights.actionLevel * 0.18 + insights.vfxLevel * 0.08,
    transportFactor: 1 + insights.vehicleCount * 0.15 + insights.locationCount * 0.08,
  };
}

function recalculateBudget(budget: BudgetDocument): BudgetDocument {
  let grandTotal = 0;

  for (const section of budget.sections) {
    let sectionTotal = 0;
    for (const category of section.categories) {
      let categoryTotal = 0;
      for (const item of category.items) {
        item.amount = Number(item.amount) || 0;
        item.rate = Number(item.rate) || 0;
        item.total = item.amount * item.rate;
        categoryTotal += item.total;
      }
      category.total = categoryTotal;
      sectionTotal += categoryTotal;
    }
    section.total = sectionTotal;
    grandTotal += sectionTotal;
  }

  budget.grandTotal = grandTotal;
  return budget;
}

function setLineItem(
  budget: BudgetDocument,
  code: string,
  amount: number,
  rate: number,
  notes?: string
): void {
  for (const section of budget.sections) {
    for (const category of section.categories) {
      const item = category.items.find((candidate) => candidate.code === code);
      if (item) {
        item.amount = amount;
        item.rate = rate;
        item.total = amount * rate;
        if (notes) {
          item.notes = notes;
        }
        return;
      }
    }
  }
}

function hydrateBudgetMetadata(
  budget: BudgetDocument,
  insights: ScenarioInsights
): void {
  budget.metadata = {
    ...budget.metadata,
    title: insights.canonicalTitle,
    shootingDays: insights.shootingDays,
    locations: insights.locations,
    genre: insights.genre,
  };
  budget.currency = budget.currency || "USD";
}

function applyTalentEstimates(
  budget: BudgetDocument,
  insights: ScenarioInsights,
  factors: BudgetEstimateFactors
): void {
  setLineItem(
    budget,
    "11-01",
    1,
    Math.round(6500 + insights.sceneCount * 180 + insights.actionLevel * 900),
    "Fallback estimate based on screenplay complexity."
  );
  setLineItem(
    budget,
    "11-02",
    1,
    Math.round(3500 + (insights.genre === "Action" ? 1500 : 1000)),
    "Rights and development reserve."
  );
  setLineItem(
    budget,
    "14-01",
    insights.leadCastCount * insights.shootingDays,
    Math.round(950 * factors.actionPremium + insights.nightShootCount * 60),
    "Principal cast days inferred from scenario."
  );
  setLineItem(
    budget,
    "14-02",
    insights.supportingCastCount * Math.max(2, Math.ceil(insights.shootingDays * 0.7)),
    Math.round(320 + insights.crowdLevel * 45),
    "Supporting cast and featured extras."
  );
}

function applyManagementEstimates(
  budget: BudgetDocument,
  insights: ScenarioInsights,
  factors: BudgetEstimateFactors
): void {
  setLineItem(
    budget,
    "20-01",
    factors.prepWeeks + factors.shootingWeeks,
    Math.round(2600 + insights.locationCount * 120),
    "Line production coverage across prep and shoot."
  );
  setLineItem(
    budget,
    "20-02",
    factors.prepWeeks + factors.shootingWeeks,
    Math.round(1800 + insights.actionLevel * 80),
    "Production management across all field days."
  );
  setLineItem(
    budget,
    "20-03",
    Math.max(2, insights.locationCount + insights.crowdLevel) * factors.shootingWeeks,
    850,
    "Production assistants scaled by logistics complexity."
  );
}

function applyLocationEstimates(
  budget: BudgetDocument,
  insights: ScenarioInsights,
  factors: BudgetEstimateFactors
): void {
  setLineItem(
    budget,
    "30-01",
    insights.shootingDays,
    Math.round(2200 * factors.actionPremium + insights.vfxLevel * 240),
    "Camera package adjusted for action and coverage needs."
  );
  setLineItem(
    budget,
    "29-01",
    insights.shootingDays,
    Math.round(1650 + insights.nightShootCount * 180 + insights.vfxLevel * 90),
    "Lighting package scaled for night work and effects."
  );
  setLineItem(
    budget,
    "25-01",
    insights.shootingDays,
    Math.round(1150 + insights.stuntMoments * 120),
    "Grip package scaled by movement and stunt load."
  );
  setLineItem(
    budget,
    "34-01",
    insights.locationCount * Math.max(1, Math.ceil(insights.shootingDays / insights.locationCount)),
    Math.round(780 + insights.actionLevel * 70),
    "Location fees across inferred locations."
  );
  setLineItem(
    budget,
    "34-02",
    1,
    Math.round(900 + insights.locationCount * 220 + insights.actionLevel * 450),
    "Permits, police lockups, and street usage."
  );
  setLineItem(
    budget,
    "34-03",
    insights.shootingDays,
    Math.round(900 * factors.transportFactor),
    "Transportation and company moves."
  );
}

function applyPostProductionEstimates(
  budget: BudgetDocument,
  insights: ScenarioInsights,
  factors: BudgetEstimateFactors
): void {
  setLineItem(
    budget,
    "45-01",
    factors.postWeeks,
    Math.round(2450 + insights.vfxLevel * 220),
    "Editorial time for production scale."
  );
  setLineItem(budget, "45-02", factors.postWeeks, 1250, "Assistant editorial support.");
  setLineItem(
    budget,
    "48-01",
    1,
    Math.round(4200 + insights.actionLevel * 950 + insights.vfxLevel * 550),
    "Sound design reserve."
  );
  setLineItem(
    budget,
    "48-02",
    1,
    Math.round(2600 + insights.actionLevel * 320),
    "Final mix reserve."
  );
}

function applyBusinessEstimates(
  budget: BudgetDocument,
  factors: BudgetEstimateFactors,
  insights: ScenarioInsights
): void {
  setLineItem(
    budget,
    "56-01",
    1,
    Math.round(1800 + insights.locationCount * 140),
    "Legal paperwork, chain of title, and release work."
  );
  setLineItem(
    budget,
    "56-02",
    1,
    Math.round(1500 + factors.shootingWeeks * 160),
    "Production accounting support."
  );
}

function finalizeInsuranceReserve(
  budget: BudgetDocument,
  insights: ScenarioInsights
): BudgetDocument {
  recalculateBudget(budget);
  setLineItem(
    budget,
    "58-01",
    1,
    Math.round(
      budget.grandTotal * (0.045 + insights.actionLevel * 0.008 + insights.stuntMoments * 0.004)
    ),
    "Insurance reserve derived from the first-pass subtotal."
  );
  return recalculateBudget(budget);
}

function buildFallbackBudget(
  scenario: string,
  title: string | undefined,
  template: BudgetDocument
): BudgetDocument {
  const budget = cloneBudgetTemplate(template);
  const insights = buildScenarioInsights(scenario, title);
  const factors = buildEstimateFactors(insights);

  hydrateBudgetMetadata(budget, insights);
  // تعليق عربي: نملأ نفس قالب الميزانية الرسمي حتى يبقى العقد ثابتاً بين الواجهة والخلفية.
  applyTalentEstimates(budget, insights, factors);
  applyManagementEstimates(budget, insights, factors);
  applyLocationEstimates(budget, insights, factors);
  applyPostProductionEstimates(budget, insights, factors);
  applyBusinessEstimates(budget, factors, insights);

  return finalizeInsuranceReserve(budget, insights);
}

export function buildFallbackBudgetRuntime(
  scenario: string,
  title: string | undefined,
  template: BudgetDocument,
  fallbackReason?: string
): BudgetRuntimeResult {
  const generatedAt = new Date().toISOString();
  const meta: BudgetRuntimeMeta = {
    source: "fallback",
    generatedAt,
    ...(fallbackReason ? { fallbackReason } : {}),
  };

  return {
    budget: buildFallbackBudget(scenario, title, template),
    analysis: buildFallbackAnalysis(scenario, title),
    meta,
  };
}

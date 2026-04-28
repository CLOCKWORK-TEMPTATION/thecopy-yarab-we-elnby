/**
 * @module services/budget/budget-prompts
 * @description بناء برومبتات توليد الميزانية وتحليل السيناريو.
 */

import type { BudgetDocument } from "./budget-types";

// ─── برومبت توليد الميزانية ───────────────────────────────────────

export function buildBudgetPrompt(
  scenario: string,
  template: BudgetDocument,
): string {
  return `You are a senior film line producer. Analyze the screenplay and return ONLY valid JSON that matches the provided budget structure.

Requirements:
- Populate every section with realistic line items for the screenplay.
- Use market-realistic 2026 production assumptions.
- Keep currency as USD unless the screenplay clearly requires another currency.
- Every item's total must equal amount multiplied by rate.
- Include metadata: title, shootingDays, genre, and locations when inferable.
- Do not include commentary or markdown.

Screenplay:
${scenario.slice(0, 30000)}

Budget template:
${JSON.stringify(template)}`;
}

// ─── برومبت تحليل السيناريو ───────────────────────────────────────

export function buildAnalysisPrompt(scenario: string): string {
  return `You are a veteran production analyst and line producer. Analyze the screenplay and return ONLY valid JSON using this shape:
{
  "summary": "string",
  "recommendations": ["string"],
  "riskFactors": ["string"],
  "costOptimization": ["string"],
  "shootingSchedule": {
    "totalDays": 0,
    "phases": {
      "preProduction": 0,
      "production": 0,
      "postProduction": 0
    }
  }
}

Screenplay:
${scenario.slice(0, 20000)}`;
}

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
  return `You are a senior film line producer specializing in Arab and Middle Eastern productions. Analyze the screenplay/scenario and return ONLY valid JSON that matches the provided budget structure.

Requirements:
- Populate every section with realistic line items for the screenplay.
- Use market-realistic 2026 production assumptions for the region described.
- Use USD as default currency unless the scenario clearly indicates another.
- Every item's total must equal amount multiplied by rate.
- Include metadata: title, shootingDays, genre, and locations when inferable.
- Write all description fields in Arabic (e.g. "مدير التصوير", "طاقم تمثيل رئيسي").
- Do not include commentary or markdown in your response.

Screenplay/Scenario:
${scenario.slice(0, 30000)}

Budget template to fill:
${JSON.stringify(template)}`;
}

// ─── برومبت تحليل السيناريو ───────────────────────────────────────

export function buildAnalysisPrompt(scenario: string): string {
  return `You are a veteran production analyst and line producer specializing in Arab film and TV production. Analyze the screenplay/scenario and return ONLY valid JSON using this exact shape:
{
  "summary": "string (Arabic)",
  "recommendations": ["string (Arabic)"],
  "riskFactors": ["string (Arabic)"],
  "costOptimization": ["string (Arabic)"],
  "shootingSchedule": {
    "totalDays": 0,
    "phases": {
      "preProduction": 0,
      "production": 0,
      "postProduction": 0
    }
  }
}

Requirements:
- Write summary, recommendations, riskFactors, and costOptimization in Arabic.
- shootingSchedule values must be integers.
- Do not include commentary or markdown.

Screenplay/Scenario:
${scenario.slice(0, 20000)}`;
}

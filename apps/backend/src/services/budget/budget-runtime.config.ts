import { z } from "zod";

const budgetRuntimeConfigSchema = z.object({
  aiMode: z.enum(["auto", "provider-only", "fallback-only"]).default("auto"),
});

export type BudgetAiMode = z.infer<typeof budgetRuntimeConfigSchema>["aiMode"];

export interface BudgetRuntimeConfig {
  aiMode: BudgetAiMode;
}

export function getBudgetRuntimeConfig(): BudgetRuntimeConfig {
  const parsed = budgetRuntimeConfigSchema.parse({
    aiMode: process.env["BUDGET_AI_MODE"]?.trim().toLowerCase() || undefined,
  });

  return {
    aiMode: parsed.aiMode,
  };
}

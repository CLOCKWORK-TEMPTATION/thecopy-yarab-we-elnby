// CineArchitect AI - AI Resource & Budget Optimizer
// محسّن الموارد والميزانية الذكي

import { logger } from "@/lib/logger";

import { Plugin, PluginInput, PluginOutput, Budget } from "../../types";

interface BudgetOptimizationInput {
  totalBudget: number;
  currency: string;
  categories: {
    name: string;
    nameAr: string;
    requested: number;
    priority: "critical" | "high" | "medium" | "low";
    flexibility: number; // 0-1, how much can be adjusted
  }[];
  constraints?: {
    minPerCategory?: Record<string, number>;
    maxPerCategory?: Record<string, number>;
  };
}

interface OptimizationResult {
  originalTotal: number;
  optimizedTotal: number;
  savings: number;
  savingsPercentage: number;
  allocations: {
    name: string;
    nameAr: string;
    requested: number;
    allocated: number;
    difference: number;
    notes: string;
    notesAr: string;
  }[];
  recommendations: {
    category: string;
    recommendation: string;
    recommendationAr: string;
    potentialSavings: number;
  }[];
  warnings: string[];
}

export class BudgetOptimizer implements Plugin {
  id = "budget-optimizer";
  name = "AI Resource & Budget Optimizer";
  nameAr = "محسّن الموارد والميزانية الذكي";
  version = "1.0.0";
  description =
    "Optimizes budget distribution using historical data and AI analysis";
  descriptionAr =
    "تحسين توزيع الميزانية باستخدام البيانات التاريخية والتحليل الذكي";
  category = "resource-management" as const;

  // Industry-standard budget percentages for reference
  private readonly INDUSTRY_BENCHMARKS: Record<
    string,
    { min: number; max: number; typical: number }
  > = {
    "production-design": { min: 0.08, max: 0.15, typical: 0.12 },
    costumes: { min: 0.03, max: 0.08, typical: 0.05 },
    props: { min: 0.02, max: 0.05, typical: 0.03 },
    locations: { min: 0.05, max: 0.15, typical: 0.1 },
    equipment: { min: 0.05, max: 0.12, typical: 0.08 },
    crew: { min: 0.2, max: 0.35, typical: 0.28 },
    talent: { min: 0.15, max: 0.4, typical: 0.25 },
    "post-production": { min: 0.08, max: 0.15, typical: 0.12 },
    contingency: { min: 0.05, max: 0.1, typical: 0.07 },
  };

  initialize(): void {
    logger.info(`[${this.name}] Initialized`);
  }

  execute(input: PluginInput): PluginOutput {
    switch (input.type) {
      case "optimize":
        return this.optimizeBudget(
          input.data as unknown as BudgetOptimizationInput
        );
      case "analyze":
        return this.analyzeBudget(input.data as unknown as { budget: Budget });
      case "compare":
        return this.compareBudgets(
          input.data as unknown as {
            budget1: Budget;
            budget2: Budget;
            label1?: string;
            label2?: string;
          }
        );
      case "forecast":
        return this.forecastSpending(
          input.data as unknown as {
            budget: Budget;
            daysElapsed: number;
            totalDays: number;
          }
        );
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private optimizeBudget(data: BudgetOptimizationInput): PluginOutput {
    const { totalBudget, currency, categories, constraints } = data;

    if (!categories || categories.length === 0) {
      return {
        success: false,
        error: "No budget categories provided",
      };
    }

    const totalRequested = categories.reduce((sum, c) => sum + c.requested, 0);
    const allocations: OptimizationResult["allocations"] = [];
    const recommendations: OptimizationResult["recommendations"] = [];
    const warnings: string[] = [];

    // Check if total requested exceeds budget
    if (totalRequested > totalBudget) {
      warnings.push(
        `Requested budget (${totalRequested.toLocaleString()} ${currency}) exceeds available budget (${totalBudget.toLocaleString()} ${currency})`
      );
    }

    // Sort categories by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedCategories = [...categories].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    let remainingBudget = totalBudget;
    let totalAllocated = 0;

    // First pass: allocate to critical and high priority
    for (const category of sortedCategories) {
      const minAllocation = constraints?.minPerCategory?.[category.name] ?? 0;
      const maxAllocation =
        constraints?.maxPerCategory?.[category.name] ??
        category.requested * 1.2;

      let allocated: number;

      if (category.priority === "critical") {
        // Critical items get full requested amount
        allocated = Math.min(category.requested, remainingBudget);
      } else if (category.priority === "high") {
        // High priority gets at least 90%
        allocated = Math.min(category.requested * 0.9, remainingBudget);
      } else if (category.priority === "medium") {
        // Medium priority can be reduced based on flexibility
        const reduction = category.flexibility * 0.2;
        allocated = Math.min(
          category.requested * (1 - reduction),
          remainingBudget
        );
      } else {
        // Low priority gets what's left
        const reduction = category.flexibility * 0.35;
        allocated = Math.min(
          category.requested * (1 - reduction),
          remainingBudget
        );
      }

      // Apply constraints
      allocated = Math.max(minAllocation, Math.min(maxAllocation, allocated));
      allocated = Math.round(allocated);

      remainingBudget -= allocated;
      totalAllocated += allocated;

      const difference = allocated - category.requested;
      let notes = "";
      let notesAr = "";

      if (difference < 0) {
        notes = `Reduced by ${Math.abs(difference).toLocaleString()} ${currency} (${Math.abs((difference / category.requested) * 100).toFixed(1)}%)`;
        notesAr = `تم التخفيض بمقدار ${Math.abs(difference).toLocaleString()} ${currency} (${Math.abs((difference / category.requested) * 100).toFixed(1)}%)`;
      } else if (difference > 0) {
        notes = `Increased by ${difference.toLocaleString()} ${currency}`;
        notesAr = `تم الزيادة بمقدار ${difference.toLocaleString()} ${currency}`;
      } else {
        notes = "Allocated as requested";
        notesAr = "تم التخصيص كما هو مطلوب";
      }

      allocations.push({
        name: category.name,
        nameAr: category.nameAr,
        requested: category.requested,
        allocated,
        difference,
        notes,
        notesAr,
      });

      // Generate recommendations
      const benchmark =
        this.INDUSTRY_BENCHMARKS[
          category.name.toLowerCase().replace(/\s+/g, "-")
        ];
      if (benchmark) {
        const allocatedPercentage = allocated / totalBudget;
        if (allocatedPercentage > benchmark.max) {
          recommendations.push({
            category: category.name,
            recommendation: `Consider reducing ${category.name} budget - currently ${(allocatedPercentage * 100).toFixed(1)}% vs industry typical ${(benchmark.typical * 100).toFixed(1)}%`,
            recommendationAr: `فكر في تقليل ميزانية ${category.nameAr} - حالياً ${(allocatedPercentage * 100).toFixed(1)}% مقابل المعيار الصناعي ${(benchmark.typical * 100).toFixed(1)}%`,
            potentialSavings:
              (allocatedPercentage - benchmark.typical) * totalBudget,
          });
        }
      }
    }

    // Add general recommendations
    if (remainingBudget > 0) {
      recommendations.push({
        category: "Contingency",
        recommendation: `Consider allocating remaining ${remainingBudget.toLocaleString()} ${currency} to contingency fund`,
        recommendationAr: `فكر في تخصيص المتبقي ${remainingBudget.toLocaleString()} ${currency} لصندوق الطوارئ`,
        potentialSavings: 0,
      });
    }

    const result: OptimizationResult = {
      originalTotal: totalRequested,
      optimizedTotal: totalAllocated,
      savings: totalRequested - totalAllocated,
      savingsPercentage:
        ((totalRequested - totalAllocated) / totalRequested) * 100,
      allocations,
      recommendations,
      warnings,
    };

    return {
      success: true,
      data: result as unknown as Record<string, unknown>,
    };
  }

  private analyzeBudget(data: { budget: Budget }): PluginOutput {
    const { budget } = data;

    const analysis = {
      totalBudget: budget.total,
      spent: budget.spent,
      remaining: budget.remaining,
      spentPercentage: (budget.spent / budget.total) * 100,
      categoryBreakdown: budget.categories.map((cat) => ({
        name: cat.name,
        nameAr: cat.nameAr,
        allocated: cat.allocated,
        spent: cat.spent,
        remaining: cat.allocated - cat.spent,
        utilizationRate: (cat.spent / cat.allocated) * 100,
        percentOfTotal: (cat.allocated / budget.total) * 100,
      })),
      alerts: [] as string[],
    };

    // Check for over-spending
    for (const cat of budget.categories) {
      if (cat.spent > cat.allocated) {
        analysis.alerts.push(
          `${cat.name} is over budget by ${(cat.spent - cat.allocated).toLocaleString()} ${budget.currency}`
        );
      } else if (cat.spent > cat.allocated * 0.9) {
        analysis.alerts.push(
          `${cat.name} is approaching budget limit (${((cat.spent / cat.allocated) * 100).toFixed(1)}% used)`
        );
      }
    }

    return {
      success: true,
      data: analysis,
    };
  }

  private compareBudgets(data: {
    budget1: Budget;
    budget2: Budget;
    label1?: string;
    label2?: string;
  }): PluginOutput {
    const { budget1, budget2, label1 = "Budget 1", label2 = "Budget 2" } = data;

    const comparison = {
      [label1]: {
        total: budget1.total,
        spent: budget1.spent,
        remaining: budget1.remaining,
      },
      [label2]: {
        total: budget2.total,
        spent: budget2.spent,
        remaining: budget2.remaining,
      },
      difference: {
        total: budget2.total - budget1.total,
        spent: budget2.spent - budget1.spent,
        remaining: budget2.remaining - budget1.remaining,
      },
      percentageChange: {
        total: ((budget2.total - budget1.total) / budget1.total) * 100,
        spent:
          budget1.spent > 0
            ? ((budget2.spent - budget1.spent) / budget1.spent) * 100
            : 0,
      },
    };

    return {
      success: true,
      data: comparison,
    };
  }

  private forecastSpending(data: {
    budget: Budget;
    daysElapsed: number;
    totalDays: number;
  }): PluginOutput {
    const { budget, daysElapsed, totalDays } = data;

    const dailySpendRate = budget.spent / daysElapsed;
    const projectedTotal = dailySpendRate * totalDays;
    const daysRemaining = totalDays - daysElapsed;

    const forecast = {
      currentSpent: budget.spent,
      dailySpendRate,
      projectedTotalSpend: projectedTotal,
      projectedOverUnder: projectedTotal - budget.total,
      daysRemaining,
      budgetPerRemainingDay: budget.remaining / daysRemaining,
      onTrack: projectedTotal <= budget.total,
      recommendations: [] as string[],
    };

    if (projectedTotal > budget.total) {
      const overBy = projectedTotal - budget.total;
      forecast.recommendations.push(
        `At current rate, you will exceed budget by ${overBy.toLocaleString()} ${budget.currency}`,
        `Reduce daily spending to ${(budget.remaining / daysRemaining).toLocaleString()} ${budget.currency} to stay on track`
      );
    } else {
      forecast.recommendations.push(
        `On track to finish under budget by ${(budget.total - projectedTotal).toLocaleString()} ${budget.currency}`
      );
    }

    return {
      success: true,
      data: forecast,
    };
  }

  shutdown(): void {
    logger.info(`[${this.name}] Shut down`);
  }
}

export const budgetOptimizer = new BudgetOptimizer();

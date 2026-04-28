
import ExcelJS from 'exceljs';

import { logger } from '@/lib/logger';
import { buildFallbackBudgetRuntime } from '@/services/budget/budget-fallback.service';
import { getBudgetRuntimeConfig } from '@/services/budget/budget-runtime.config';
import { platformGenAIService } from '@/services/platform-genai.service';

import { cloneTemplate } from './budget/budget-default-template';
import { buildAnalysisPrompt, buildBudgetPrompt } from './budget/budget-prompts';
import { normalizeBudgetAnalysis, sanitizeBudget } from './budget/budget-sanitizer';

import type {
  BudgetAnalysis,
  BudgetAnalysisRuntimeResult,
  BudgetDocument,
  BudgetRuntimeResult,
} from '@/services/budget/budget-types';
export type {
  BudgetAnalysis,
  BudgetAnalysisRuntimeResult,
  BudgetDocument,
  BudgetRuntimeMeta,
  BudgetRuntimeResult,
} from '@/services/budget/budget-types';

export class BudgetService {
  private async generateBudgetFromProvider(
    scenario: string,
    title?: string
  ): Promise<BudgetDocument> {
    const template = cloneTemplate(title);
    const generated = await platformGenAIService.generateJson<BudgetDocument>(
      buildBudgetPrompt(scenario, template),
      { temperature: 0.2, maxOutputTokens: 16384 }
    );

    return sanitizeBudget(generated, title);
  }

  private canUseFallback(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    return [
      'api_key',
      'expired',
      'invalid',
      'quota',
      'resource_exhausted',
      'timed out',
      'empty json payload',
      'invalid json payload',
      'not configured',
      'fetch failed',
      'econn',
      'enotfound',
    ].some((fragment) => message.includes(fragment));
  }

  private buildFallbackRuntime(
    scenario: string,
    title: string | undefined,
    reason: string
  ): BudgetRuntimeResult {
    logger.warn('budget_runtime_fallback_used', {
      title: title ?? 'Untitled Production Budget',
      reason,
    });

    return buildFallbackBudgetRuntime(scenario, title, cloneTemplate(title), reason);
  }

  async generateBudgetRuntime(
    scenario: string,
    title?: string
  ): Promise<BudgetRuntimeResult> {
    const config = getBudgetRuntimeConfig();

    if (config.aiMode === 'fallback-only') {
      logger.info('budget_runtime_fallback_forced', {
        title: title ?? 'Untitled Production Budget',
      });
      return this.buildFallbackRuntime(
        scenario,
        title,
        'BUDGET_AI_MODE forced fallback-only.'
      );
    }

    try {
      const [budget, analysis] = await Promise.all([
        this.generateBudgetFromProvider(scenario, title),
        this.analyzeScriptFromProvider(scenario),
      ]);

      return {
        budget,
        analysis,
        meta: {
          source: 'ai',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (config.aiMode === 'auto' && this.canUseFallback(error)) {
        const reason =
          error instanceof Error ? error.message : 'Budget runtime provider failed.';
        return this.buildFallbackRuntime(scenario, title, reason);
      }

      throw error;
    }
  }

  async generateBudget(scenario: string, title?: string): Promise<BudgetDocument> {
    const runtime = await this.generateBudgetRuntime(scenario, title);
    return runtime.budget;
  }

  private async analyzeScriptFromProvider(scenario: string): Promise<BudgetAnalysis> {
    const analysis = await platformGenAIService.generateJson<BudgetAnalysis>(
      buildAnalysisPrompt(scenario),
      { temperature: 0.2, maxOutputTokens: 8192 }
    );

    return normalizeBudgetAnalysis(analysis);
  }

  async analyzeBudgetRuntime(
    scenario: string,
    title?: string
  ): Promise<BudgetAnalysisRuntimeResult> {
    const config = getBudgetRuntimeConfig();

    if (config.aiMode === 'fallback-only') {
      const fallback = this.buildFallbackRuntime(
        scenario,
        title,
        'BUDGET_AI_MODE forced fallback-only.'
      );
      return {
        analysis: fallback.analysis,
        meta: fallback.meta,
      };
    }

    try {
      const analysis = await this.analyzeScriptFromProvider(scenario);
      return {
        analysis,
        meta: {
          source: 'ai',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (config.aiMode === 'auto' && this.canUseFallback(error)) {
        const reason =
          error instanceof Error ? error.message : 'Budget runtime provider failed.';
        const fallback = this.buildFallbackRuntime(scenario, title, reason);
        return {
          analysis: fallback.analysis,
          meta: fallback.meta,
        };
      }

      throw error;
    }
  }

  async analyzeScript(scenario: string): Promise<BudgetAnalysis> {
    const runtime = await this.analyzeBudgetRuntime(scenario);
    return runtime.analysis;
  }

  isValidBudget(candidate: unknown): candidate is BudgetDocument {
    const budget = candidate as BudgetDocument;
    return Boolean(
      budget &&
        Array.isArray(budget.sections) &&
        typeof budget.grandTotal === 'number' &&
        typeof budget.currency === 'string'
    );
  }

  async exportBudget(budget: BudgetDocument): Promise<Buffer> {
    const normalizedBudget = sanitizeBudget(
      budget,
      budget.metadata?.title ?? 'Production Budget'
    );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'The Copy Backend';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Top sheet');
    summarySheet.columns = [
      { header: 'ACCT#', key: 'code', width: 16 },
      { header: 'Description', key: 'description', width: 32 },
      { header: 'Total', key: 'total', width: 16 },
    ];

    normalizedBudget.sections.forEach((section) => {
      summarySheet.addRow({ code: section.id, description: section.name, total: section.total });
      section.categories.forEach((category) => {
        summarySheet.addRow({
          code: category.code,
          description: `  ${category.name}`,
          total: category.total,
        });
      });
      summarySheet.addRow({ code: '', description: '', total: '' });
    });
    summarySheet.addRow({
      code: 'TOTAL',
      description: 'Grand Total',
      total: normalizedBudget.grandTotal,
    });

    normalizedBudget.sections.forEach((section) => {
      const worksheet = workbook.addWorksheet(section.name.slice(0, 31));
      worksheet.columns = [
        { header: 'ACCT#', key: 'code', width: 16 },
        { header: 'Description', key: 'description', width: 36 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Unit', key: 'unit', width: 12 },
        { header: 'Rate', key: 'rate', width: 12 },
        { header: 'Total', key: 'total', width: 14 },
      ];

      section.categories.forEach((category) => {
        worksheet.addRow({
          code: category.code,
          description: category.name,
          amount: '',
          unit: '',
          rate: '',
          total: category.total,
        });

        category.items.forEach((item) => {
          worksheet.addRow({
            code: item.code,
            description: item.description,
            amount: item.amount,
            unit: item.unit,
            rate: item.rate,
            total: item.total,
          });
        });

        worksheet.addRow({ code: '', description: '', amount: '', unit: '', rate: '', total: '' });
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

export const budgetService = new BudgetService();

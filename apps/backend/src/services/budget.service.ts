/* eslint-disable max-lines */
import ExcelJS from 'exceljs';
import { platformGenAIService } from '@/services/platform-genai.service';
import { logger } from '@/lib/logger';
import { getBudgetRuntimeConfig } from '@/services/budget/budget-runtime.config';
import { buildFallbackBudgetRuntime } from '@/services/budget/budget-fallback.service';
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

const DEFAULT_TEMPLATE: BudgetDocument = {
  currency: 'USD',
  grandTotal: 0,
  metadata: {
    title: '',
    director: '',
    producer: '',
    productionCompany: '',
    shootingDays: 0,
    locations: [],
    genre: '',
  },
  sections: [
    {
      id: 'atl',
      name: 'Above The Line',
      color: '#3B82F6',
      total: 0,
      categories: [
        {
          code: '11-00',
          name: 'Story & Rights',
          total: 0,
          items: [
            { code: '11-01', description: 'Writers', amount: 0, unit: 'flat', rate: 0, total: 0 },
            { code: '11-02', description: 'Script Purchase', amount: 0, unit: 'flat', rate: 0, total: 0 },
          ],
        },
        {
          code: '14-00',
          name: 'Cast',
          total: 0,
          items: [
            { code: '14-01', description: 'Lead Cast', amount: 0, unit: 'day', rate: 0, total: 0 },
            { code: '14-02', description: 'Supporting Cast', amount: 0, unit: 'day', rate: 0, total: 0 },
          ],
        },
      ],
    },
    {
      id: 'production',
      name: 'Production Expenses',
      color: '#8B5CF6',
      total: 0,
      categories: [
        {
          code: '20-00',
          name: 'Production Staff',
          total: 0,
          items: [
            { code: '20-01', description: 'Line Producer', amount: 0, unit: 'week', rate: 0, total: 0 },
            { code: '20-02', description: 'Production Manager', amount: 0, unit: 'week', rate: 0, total: 0 },
            { code: '20-03', description: 'Production Assistants', amount: 0, unit: 'week', rate: 0, total: 0 },
          ],
        },
        {
          code: '30-00',
          name: 'Camera & Lighting',
          total: 0,
          items: [
            { code: '30-01', description: 'Camera Package', amount: 0, unit: 'day', rate: 0, total: 0 },
            { code: '29-01', description: 'Lighting Package', amount: 0, unit: 'day', rate: 0, total: 0 },
            { code: '25-01', description: 'Grip Package', amount: 0, unit: 'day', rate: 0, total: 0 },
          ],
        },
        {
          code: '34-00',
          name: 'Locations',
          total: 0,
          items: [
            { code: '34-01', description: 'Location Fees', amount: 0, unit: 'day', rate: 0, total: 0 },
            { code: '34-02', description: 'Permits', amount: 0, unit: 'flat', rate: 0, total: 0 },
            { code: '34-03', description: 'Transportation', amount: 0, unit: 'day', rate: 0, total: 0 },
          ],
        },
      ],
    },
    {
      id: 'post',
      name: 'Post Production Expenses',
      color: '#EC4899',
      total: 0,
      categories: [
        {
          code: '45-00',
          name: 'Editing',
          total: 0,
          items: [
            { code: '45-01', description: 'Editor', amount: 0, unit: 'week', rate: 0, total: 0 },
            { code: '45-02', description: 'Assistant Editor', amount: 0, unit: 'week', rate: 0, total: 0 },
          ],
        },
        {
          code: '48-00',
          name: 'Post Sound',
          total: 0,
          items: [
            { code: '48-01', description: 'Sound Design', amount: 0, unit: 'flat', rate: 0, total: 0 },
            { code: '48-02', description: 'Mix', amount: 0, unit: 'flat', rate: 0, total: 0 },
          ],
        },
      ],
    },
    {
      id: 'other',
      name: 'Other Expenses',
      color: '#F59E0B',
      total: 0,
      categories: [
        {
          code: '56-00',
          name: 'Legal & Accounting',
          total: 0,
          items: [
            { code: '56-01', description: 'Legal', amount: 0, unit: 'flat', rate: 0, total: 0 },
            { code: '56-02', description: 'Accounting', amount: 0, unit: 'flat', rate: 0, total: 0 },
          ],
        },
        {
          code: '58-00',
          name: 'Insurance',
          total: 0,
          items: [
            { code: '58-01', description: 'Production Insurance', amount: 0, unit: 'flat', rate: 0, total: 0 },
          ],
        },
      ],
    },
  ],
};

function cloneTemplate(title?: string): BudgetDocument {
  const budget = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as BudgetDocument;
  budget.metadata = {
    ...budget.metadata,
    title: title || 'Untitled Project',
  };
  return budget;
}

function recalculateBudget(budget: BudgetDocument): BudgetDocument {
  let grandTotal = 0;

  budget.sections.forEach((section) => {
    let sectionTotal = 0;
    section.categories.forEach((category) => {
      let categoryTotal = 0;
      category.items.forEach((item) => {
        item.amount = Number(item.amount) || 0;
        item.rate = Number(item.rate) || 0;
        item.total = item.amount * item.rate;
        categoryTotal += item.total;
      });
      category.total = categoryTotal;
      sectionTotal += categoryTotal;
    });
    section.total = sectionTotal;
    grandTotal += sectionTotal;
  });

  budget.grandTotal = grandTotal;
  return budget;
}

type BudgetRecord = Record<string, unknown>;

function asRecord(candidate: unknown): BudgetRecord {
  return candidate && typeof candidate === 'object'
    ? (candidate as BudgetRecord)
    : {};
}

function getStringField(
  source: BudgetRecord,
  key: string,
  fallback: string
): string {
  const value = source[key];
  return typeof value === 'string' ? value : fallback;
}

function getNumberField(
  source: BudgetRecord,
  key: string,
  fallback: number
): number {
  const value = source[key];
  return typeof value === 'number' ? value : fallback;
}

function getArrayField(source: BudgetRecord, key: string): unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

/* eslint-disable complexity -- deeply nested sanitization logic */
function sanitizeBudget(candidate: unknown, title?: string): BudgetDocument {
  const template = cloneTemplate(title);
  const source = asRecord(candidate);
  const sourceMetadata = asRecord(source["metadata"]);
  const sections = Array.isArray(source["sections"])
    ? source["sections"]
    : template.sections;

  const budget: BudgetDocument = {
    currency: getStringField(source, 'currency', 'USD'),
    metadata: {
      ...template.metadata,
      title: getStringField(
        sourceMetadata,
        'title',
        title || template.metadata?.["title"] || 'Untitled Project'
      ),
      director: getStringField(
        sourceMetadata,
        'director',
        template.metadata?.["director"] || ''
      ),
      producer: getStringField(
        sourceMetadata,
        'producer',
        template.metadata?.["producer"] || ''
      ),
      productionCompany: getStringField(
        sourceMetadata,
        'productionCompany',
        template.metadata?.["productionCompany"] || ''
      ),
      shootingDays: getNumberField(
        sourceMetadata,
        'shootingDays',
        template.metadata?.["shootingDays"] || 0
      ),
      locations: normalizeStringList(sourceMetadata["locations"]),
      genre: getStringField(sourceMetadata, 'genre', template.metadata?.["genre"] || ''),
    },
    sections: sections.map((sectionCandidate, sectionIndex) => {
      const section = asRecord(sectionCandidate);
      const templateSection = template.sections[sectionIndex];
      return {
        id: getStringField(
          section,
          'id',
          templateSection?.id ?? `section-${sectionIndex + 1}`
        ),
        name: getStringField(
          section,
          'name',
          templateSection?.name ?? `Section ${sectionIndex + 1}`
        ),
        color: getStringField(section, 'color', templateSection?.color ?? '#3B82F6'),
        total: 0,
        categories: getArrayField(section, 'categories').map(
          (categoryCandidate, categoryIndex) => {
            const category = asRecord(categoryCandidate);
            return {
              code: getStringField(
                category,
                'code',
                `${sectionIndex + 1}${categoryIndex + 1}-00`
              ),
              name: getStringField(
                category,
                'name',
                `Category ${sectionIndex + 1}.${categoryIndex + 1}`
              ),
              total: 0,
              items: getArrayField(category, 'items').map((itemCandidate, itemIndex) => {
                const item = asRecord(itemCandidate);
                return {
                  code: getStringField(
                    item,
                    'code',
                    `${sectionIndex + 1}${categoryIndex + 1}-${String(itemIndex + 1).padStart(2, '0')}`
                  ),
                  description: getStringField(
                    item,
                    'description',
                    `Line item ${itemIndex + 1}`
                  ),
                  amount: Number(item["amount"]) || 0,
                  unit: getStringField(item, 'unit', 'flat'),
                  rate: Number(item["rate"]) || 0,
                  total: 0,
                  ...(typeof item["notes"] === 'string' ? { notes: item["notes"] } : {}),
                };
              }),
            };
          }
        ),
      };
    }),
    grandTotal: 0,
  };

  return recalculateBudget(budget);
}
/* eslint-enable complexity */

function buildBudgetPrompt(scenario: string, template: BudgetDocument): string {
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

function buildAnalysisPrompt(scenario: string): string {
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

function normalizeStringList(candidate: unknown): string[] {
  return Array.isArray(candidate)
    ? candidate.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeNumericValue(candidate: unknown): number {
  return Number(candidate) || 0;
}

function normalizeBudgetAnalysis(analysis: BudgetAnalysis): BudgetAnalysis {
  const shootingSchedule = analysis.shootingSchedule;

  return {
    summary: analysis.summary || 'Production analysis completed.',
    recommendations: normalizeStringList(analysis.recommendations),
    riskFactors: normalizeStringList(analysis.riskFactors),
    costOptimization: normalizeStringList(analysis.costOptimization),
    shootingSchedule: {
      totalDays: normalizeNumericValue(shootingSchedule?.totalDays),
      phases: {
        preProduction: normalizeNumericValue(shootingSchedule?.phases?.preProduction),
        production: normalizeNumericValue(shootingSchedule?.phases?.production),
        postProduction: normalizeNumericValue(shootingSchedule?.phases?.postProduction),
      },
    },
  };
}

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
      title: title || 'Untitled Production Budget',
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
        title: title || 'Untitled Production Budget',
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

  private async analyzeScriptFromProvider(
    scenario: string
  ): Promise<BudgetAnalysis> {
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

  // eslint-disable-next-line max-lines-per-function
  async exportBudget(budget: BudgetDocument): Promise<Buffer> {
    const normalizedBudget = sanitizeBudget(
      budget,
      budget.metadata?.["title"] || 'Production Budget'
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
        summarySheet.addRow({ code: category.code, description: `  ${category.name}`, total: category.total });
      });
      summarySheet.addRow({ code: '', description: '', total: '' });
    });
    summarySheet.addRow({ code: 'TOTAL', description: 'Grand Total', total: normalizedBudget.grandTotal });

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

        worksheet.addRow({
          code: '',
          description: '',
          amount: '',
          unit: '',
          rate: '',
          total: '',
        });
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

export const budgetService = new BudgetService();

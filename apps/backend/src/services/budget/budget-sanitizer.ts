/**
 * @module services/budget/budget-sanitizer
 * @description تعقيم وتطبيع بيانات الميزانية القادمة من نماذج الذكاء الاصطناعي.
 * دوال خالصة — بدون آثار جانبية.
 */

import { cloneTemplate, recalculateBudget } from './budget-default-template';
import type { BudgetAnalysis, BudgetDocument } from './budget-types';

// ─── أدوات قراءة آمنة ────────────────────────────────────────────

type BudgetRecord = Record<string, unknown>;

export function asRecord(candidate: unknown): BudgetRecord {
  return candidate && typeof candidate === 'object' ? (candidate as BudgetRecord) : {};
}

export function getStringField(source: BudgetRecord, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : fallback;
}

export function getNumberField(source: BudgetRecord, key: string, fallback: number): number {
  const value = source[key];
  return typeof value === 'number' ? value : fallback;
}

export function getArrayField(source: BudgetRecord, key: string): unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

// ─── تطبيع القوائم والأرقام ──────────────────────────────────────

export function normalizeStringList(candidate: unknown): string[] {
  return Array.isArray(candidate)
    ? candidate.filter((item): item is string => typeof item === 'string')
    : [];
}

export function normalizeNumericValue(candidate: unknown): number {
  return Number(candidate) || 0;
}

// ─── تطبيع تحليل الميزانية ───────────────────────────────────────

export function normalizeBudgetAnalysis(analysis: BudgetAnalysis): BudgetAnalysis {
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

// ─── تعقيم وثيقة الميزانية الكاملة ──────────────────────────────

export function sanitizeBudget(candidate: unknown, title?: string): BudgetDocument {
  const template = cloneTemplate(title);
  const source = asRecord(candidate);
  const sourceMetadata = asRecord(source['metadata']);
  const sections = Array.isArray(source['sections']) ? source['sections'] : template.sections;

  const budget: BudgetDocument = {
    currency: getStringField(source, 'currency', 'USD'),
    metadata: {
      ...template.metadata,
      title: getStringField(
        sourceMetadata,
        'title',
        title ?? template.metadata?.title ?? 'Untitled Project'
      ),
      director: getStringField(sourceMetadata, 'director', template.metadata?.director ?? ''),
      producer: getStringField(sourceMetadata, 'producer', template.metadata?.producer ?? ''),
      productionCompany: getStringField(
        sourceMetadata,
        'productionCompany',
        template.metadata?.productionCompany ?? ''
      ),
      shootingDays: getNumberField(
        sourceMetadata,
        'shootingDays',
        template.metadata?.shootingDays ?? 0
      ),
      locations: normalizeStringList(sourceMetadata['locations']),
      genre: getStringField(sourceMetadata, 'genre', template.metadata?.genre ?? ''),
    },
    sections: sections.map((sectionCandidate, sectionIndex) => {
      const section = asRecord(sectionCandidate);
      const templateSection = template.sections[sectionIndex];
      return {
        id: getStringField(section, 'id', templateSection?.id ?? `section-${sectionIndex + 1}`),
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
                  amount: Number(item['amount']) || 0,
                  unit: getStringField(item, 'unit', 'flat'),
                  rate: Number(item['rate']) || 0,
                  total: 0,
                  ...(typeof item['notes'] === 'string' ? { notes: item['notes'] } : {}),
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

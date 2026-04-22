import { describe, expect, it } from 'vitest';
import { budgetService, type BudgetDocument } from './budget.service';

describe('budgetService', () => {
  it('exports a workbook even when optional budget sections are omitted', async () => {
    const buffer = await budgetService.exportBudget({
      currency: 'USD',
      grandTotal: 10,
      metadata: {
        title: 'Smoke Export',
      },
    } as BudgetDocument);

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('recognizes sanitized budget documents as valid', () => {
    const candidate = {
      currency: 'USD',
      grandTotal: 0,
      sections: [],
    };

    expect(budgetService.isValidBudget(candidate)).toBe(true);
  });
});

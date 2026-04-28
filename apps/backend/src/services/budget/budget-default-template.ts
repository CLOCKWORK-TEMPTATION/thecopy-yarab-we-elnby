/**
 * @module services/budget/budget-default-template
 * @description القالب الافتراضي لميزانية الإنتاج + دوال الاستنساخ وإعادة الحساب.
 */

import type { BudgetDocument } from "./budget-types";

// ─── القالب الافتراضي ─────────────────────────────────────────────

export const DEFAULT_TEMPLATE: BudgetDocument = {
  currency: "USD",
  grandTotal: 0,
  metadata: {
    title: "",
    director: "",
    producer: "",
    productionCompany: "",
    shootingDays: 0,
    locations: [],
    genre: "",
  },
  sections: [
    {
      id: "atl",
      name: "Above The Line",
      color: "#3B82F6",
      total: 0,
      categories: [
        {
          code: "11-00",
          name: "Story & Rights",
          total: 0,
          items: [
            {
              code: "11-01",
              description: "Writers",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
            {
              code: "11-02",
              description: "Script Purchase",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
          ],
        },
        {
          code: "14-00",
          name: "Cast",
          total: 0,
          items: [
            {
              code: "14-01",
              description: "Lead Cast",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
            {
              code: "14-02",
              description: "Supporting Cast",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
          ],
        },
      ],
    },
    {
      id: "production",
      name: "Production Expenses",
      color: "#8B5CF6",
      total: 0,
      categories: [
        {
          code: "20-00",
          name: "Production Staff",
          total: 0,
          items: [
            {
              code: "20-01",
              description: "Line Producer",
              amount: 0,
              unit: "week",
              rate: 0,
              total: 0,
            },
            {
              code: "20-02",
              description: "Production Manager",
              amount: 0,
              unit: "week",
              rate: 0,
              total: 0,
            },
            {
              code: "20-03",
              description: "Production Assistants",
              amount: 0,
              unit: "week",
              rate: 0,
              total: 0,
            },
          ],
        },
        {
          code: "30-00",
          name: "Camera & Lighting",
          total: 0,
          items: [
            {
              code: "30-01",
              description: "Camera Package",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
            {
              code: "29-01",
              description: "Lighting Package",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
            {
              code: "25-01",
              description: "Grip Package",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
          ],
        },
        {
          code: "34-00",
          name: "Locations",
          total: 0,
          items: [
            {
              code: "34-01",
              description: "Location Fees",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
            {
              code: "34-02",
              description: "Permits",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
            {
              code: "34-03",
              description: "Transportation",
              amount: 0,
              unit: "day",
              rate: 0,
              total: 0,
            },
          ],
        },
      ],
    },
    {
      id: "post",
      name: "Post Production Expenses",
      color: "#EC4899",
      total: 0,
      categories: [
        {
          code: "45-00",
          name: "Editing",
          total: 0,
          items: [
            {
              code: "45-01",
              description: "Editor",
              amount: 0,
              unit: "week",
              rate: 0,
              total: 0,
            },
            {
              code: "45-02",
              description: "Assistant Editor",
              amount: 0,
              unit: "week",
              rate: 0,
              total: 0,
            },
          ],
        },
        {
          code: "48-00",
          name: "Post Sound",
          total: 0,
          items: [
            {
              code: "48-01",
              description: "Sound Design",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
            {
              code: "48-02",
              description: "Mix",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
          ],
        },
      ],
    },
    {
      id: "other",
      name: "Other Expenses",
      color: "#F59E0B",
      total: 0,
      categories: [
        {
          code: "56-00",
          name: "Legal & Accounting",
          total: 0,
          items: [
            {
              code: "56-01",
              description: "Legal",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
            {
              code: "56-02",
              description: "Accounting",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
          ],
        },
        {
          code: "58-00",
          name: "Insurance",
          total: 0,
          items: [
            {
              code: "58-01",
              description: "Production Insurance",
              amount: 0,
              unit: "flat",
              rate: 0,
              total: 0,
            },
          ],
        },
      ],
    },
  ],
};

// ─── استنساخ القالب ───────────────────────────────────────────────

export function cloneTemplate(title?: string): BudgetDocument {
  const budget = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) as BudgetDocument;
  budget.metadata = {
    ...budget.metadata,
    title: title ?? "Untitled Project",
  };
  return budget;
}

// ─── إعادة حساب الإجماليات ───────────────────────────────────────

export function recalculateBudget(budget: BudgetDocument): BudgetDocument {
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

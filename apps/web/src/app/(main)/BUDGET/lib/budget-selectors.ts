import type { BudgetDocument } from "../types";

export function countBudgetLineItems(budget: BudgetDocument | null) {
  if (!budget) return 0;
  return budget.sections.reduce(
    (sectionSum, section) =>
      sectionSum +
      section.categories.reduce(
        (categorySum, category) => categorySum + category.items.length,
        0
      ),
    0
  );
}

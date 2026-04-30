"use client";

import { useCallback, useState } from "react";

import type { BudgetDocument, BudgetLineItem } from "../types";

type EditableItemField = keyof Pick<
  BudgetLineItem,
  "description" | "amount" | "unit" | "rate" | "notes"
>;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function recalculateTotals(budget: BudgetDocument): BudgetDocument {
  let grandTotal = 0;
  for (const section of budget.sections) {
    let sectionTotal = 0;
    for (const category of section.categories) {
      let categoryTotal = 0;
      for (const item of category.items) {
        const amount = Number(item.amount) || 0;
        const rate = Number(item.rate) || 0;
        item.total = amount * rate;
        categoryTotal += item.total;
      }
      category.total = categoryTotal;
      sectionTotal += categoryTotal;
    }
    section.total = sectionTotal;
    grandTotal += sectionTotal;
  }
  budget.grandTotal = grandTotal;
  return budget;
}

let itemCounter = 1;
function generateItemCode(categoryCode: string): string {
  return `${categoryCode}-NEW${itemCounter++}`;
}

export interface BudgetItemsEditorApi {
  editedBudget: BudgetDocument | null;
  updateItemField: (
    itemCode: string,
    field: EditableItemField,
    value: string | number,
  ) => void;
  addItem: (categoryCode: string) => void;
  removeItem: (itemCode: string) => void;
  setCurrency: (currency: string) => void;
  resetToSourceBudget: () => void;
  hasEdits: boolean;
}

interface BudgetItemsEditorState {
  sourceBudget: BudgetDocument | null;
  editedBudget: BudgetDocument | null;
  hasEdits: boolean;
}

function createBudgetItemsEditorState(
  sourceBudget: BudgetDocument | null
): BudgetItemsEditorState {
  return {
    sourceBudget,
    editedBudget: sourceBudget ? deepClone(sourceBudget) : null,
    hasEdits: false,
  };
}

export function useBudgetItemsEditor(
  sourceBudget: BudgetDocument | null,
): BudgetItemsEditorApi {
  const [editorState, setEditorState] = useState<BudgetItemsEditorState>(() =>
    createBudgetItemsEditorState(sourceBudget),
  );

  const activeState =
    editorState.sourceBudget === sourceBudget
      ? editorState
      : createBudgetItemsEditorState(sourceBudget);

  if (activeState !== editorState) {
    setEditorState(activeState);
  }

  const updateItemField = useCallback(
    (itemCode: string, field: EditableItemField, value: string | number) => {
      setEditorState((current) => {
        if (!current.editedBudget) return current;
        const next = deepClone(current.editedBudget);
        for (const section of next.sections) {
          for (const category of section.categories) {
            const item = category.items.find((i) => i.code === itemCode);
            if (item) {
              (item as unknown as Record<string, unknown>)[field] = value;
              // Recompute total whenever amount or rate changes
              if (field === "amount" || field === "rate") {
                item.total =
                  (Number(item.amount) || 0) * (Number(item.rate) || 0);
              }
              break;
            }
          }
        }
        return {
          ...current,
          editedBudget: recalculateTotals(next),
          hasEdits: true,
        };
      });
    },
    [],
  );

  const addItem = useCallback((categoryCode: string) => {
    setEditorState((current) => {
      if (!current.editedBudget) return current;
      const next = deepClone(current.editedBudget);
      for (const section of next.sections) {
        const category = section.categories.find(
          (c) => c.code === categoryCode,
        );
        if (category) {
          category.items.push({
            code: generateItemCode(categoryCode),
            description: "بند جديد",
            amount: 1,
            unit: "وحدة",
            rate: 0,
            total: 0,
          });
          break;
        }
      }
      return {
        ...current,
        editedBudget: recalculateTotals(next),
        hasEdits: true,
      };
    });
  }, []);

  const removeItem = useCallback((itemCode: string) => {
    setEditorState((current) => {
      if (!current.editedBudget) return current;
      const next = deepClone(current.editedBudget);
      for (const section of next.sections) {
        for (const category of section.categories) {
          const idx = category.items.findIndex((i) => i.code === itemCode);
          if (idx !== -1) {
            category.items.splice(idx, 1);
            break;
          }
        }
      }
      return {
        ...current,
        editedBudget: recalculateTotals(next),
        hasEdits: true,
      };
    });
  }, []);

  const setCurrency = useCallback((currency: string) => {
    setEditorState((current) => {
      if (!current.editedBudget) return current;
      return {
        ...current,
        editedBudget: { ...current.editedBudget, currency },
        hasEdits: true,
      };
    });
  }, []);

  const resetToSourceBudget = useCallback(() => {
    setEditorState(createBudgetItemsEditorState(sourceBudget));
  }, [sourceBudget]);

  return {
    editedBudget: activeState.editedBudget,
    updateItemField,
    addItem,
    removeItem,
    setCurrency,
    resetToSourceBudget,
    hasEdits: activeState.hasEdits,
  };
}

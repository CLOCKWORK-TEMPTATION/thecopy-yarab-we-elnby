import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBudgetItemsEditor } from "./useBudgetItemsEditor";

import type { BudgetDocument } from "../types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Totals must match amount×rate so recalculateTotals produces deterministic results.

function buildFixtureBudget(overrides?: Partial<BudgetDocument>): BudgetDocument {
  return {
    currency: "USD",
    grandTotal: 12500, // 10×1000 + 5×500
    sections: [
      {
        id: "atl",
        name: "Above The Line",
        total: 12500,
        categories: [
          {
            code: "14-00",
            name: "طاقم التمثيل",
            total: 12500,
            items: [
              {
                code: "14-01",
                description: "بطل رئيسي",
                amount: 10,
                unit: "يوم",
                rate: 1000,
                total: 10000,
              },
              {
                code: "14-02",
                description: "ممثل داعم",
                amount: 5,
                unit: "يوم",
                rate: 500,
                total: 2500,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
];

// ─── Helper: stable hook mount ────────────────────────────────────────────────
// sourceBudget MUST be a stable reference across renders to avoid infinite loops
// in the computed-state sync pattern inside the hook.

function mountEditor(source: BudgetDocument | null = null) {
  return renderHook(() => useBudgetItemsEditor(source));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useBudgetItemsEditor", () => {
  describe("initial state", () => {
    it("returns null editedBudget when sourceBudget is null", () => {
      const { result } = mountEditor(null);
      expect(result.current.editedBudget).toBeNull();
      expect(result.current.hasEdits).toBe(false);
    });

    it("clones the sourceBudget on init", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      expect(result.current.editedBudget).toEqual(source);
      // Must be a deep copy, not the same reference
      expect(result.current.editedBudget).not.toBe(source);
    });
  });

  describe("updateItemField", () => {
    it("updates the description field", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "description", "مدير التصوير");
      });

      const item = result.current.editedBudget!.sections[0]!.categories[0]!.items[0]!;
      expect(item.description).toBe("مدير التصوير");
      expect(result.current.hasEdits).toBe(true);
    });

    it("updates the unit field", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "unit", "أسبوع");
      });

      const item = result.current.editedBudget!.sections[0]!.categories[0]!.items[0]!;
      expect(item.unit).toBe("أسبوع");
    });

    it("recalculates item total when amount changes", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "amount", 20);
      });

      const item = result.current.editedBudget!.sections[0]!.categories[0]!.items[0]!;
      expect(item.amount).toBe(20);
      expect(item.total).toBe(20 * 1000); // 20 × rate 1000
    });

    it("recalculates item total when rate changes", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "rate", 2000);
      });

      const item = result.current.editedBudget!.sections[0]!.categories[0]!.items[0]!;
      expect(item.rate).toBe(2000);
      expect(item.total).toBe(10 * 2000); // amount 10 × 2000
    });

    it("updates category and section totals after item change", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "rate", 2000); // total: 10×2000=20000
      });

      const category = result.current.editedBudget!.sections[0]!.categories[0]!;
      // 14-01: 20000 + 14-02: 2500 = 22500
      expect(category.total).toBe(22500);
      expect(result.current.editedBudget!.grandTotal).toBe(22500);
    });

    it("stores XSS payloads as plain text without executing them", () => {
      for (const payload of XSS_PAYLOADS) {
        const source = buildFixtureBudget();
        const { result } = mountEditor(source);

        act(() => {
          result.current.updateItemField("14-01", "description", payload);
        });

        const item = result.current.editedBudget!.sections[0]!.categories[0]!.items[0]!;
        // Value must be stored verbatim — React ensures it's rendered as text not HTML
        expect(item.description).toBe(payload);
      }
    });

    it("does not mutate the source budget", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "description", "تعديل");
      });

      // Original source must be untouched
      expect(source.sections[0]!.categories[0]!.items[0]!.description).toBe("بطل رئيسي");
    });
  });

  describe("addItem", () => {
    it("adds a new blank item to the specified category", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);
      const beforeCount = result.current.editedBudget!.sections[0]!.categories[0]!.items.length;

      act(() => {
        result.current.addItem("14-00");
      });

      const afterCount = result.current.editedBudget!.sections[0]!.categories[0]!.items.length;
      expect(afterCount).toBe(beforeCount + 1);
      expect(result.current.hasEdits).toBe(true);
    });

    it("new item starts with amount 1 and rate 0 → total 0", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.addItem("14-00");
      });

      const items = result.current.editedBudget!.sections[0]!.categories[0]!.items;
      const newItem = items[items.length - 1]!;
      expect(newItem.amount).toBe(1);
      expect(newItem.rate).toBe(0);
      expect(newItem.total).toBe(0);
    });

    it("does not change item count when called with unknown category code", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);
      const beforeCount = result.current.editedBudget!.sections[0]!.categories[0]!.items.length;

      act(() => {
        result.current.addItem("NONEXISTENT-99");
      });

      const afterCount = result.current.editedBudget!.sections[0]!.categories[0]!.items.length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("removeItem", () => {
    it("removes the item with the given code", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.removeItem("14-01");
      });

      const items = result.current.editedBudget!.sections[0]!.categories[0]!.items;
      expect(items.every((i) => i.code !== "14-01")).toBe(true);
      expect(result.current.hasEdits).toBe(true);
    });

    it("recalculates grand total after removal", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.removeItem("14-01"); // removes 14-01 (10×1000=10000)
      });

      // Only 14-02 remains: 5×500=2500
      expect(result.current.editedBudget!.grandTotal).toBe(2500);
    });

    it("does not change item count when called with unknown code", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);
      const beforeCount = result.current.editedBudget!.sections[0]!.categories[0]!.items.length;

      act(() => {
        result.current.removeItem("NONEXISTENT-99");
      });

      const afterCount = result.current.editedBudget!.sections[0]!.categories[0]!.items.length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("setCurrency", () => {
    it("changes the currency without altering numeric values", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.setCurrency("EGP");
      });

      expect(result.current.editedBudget!.currency).toBe("EGP");
      expect(result.current.editedBudget!.grandTotal).toBe(12500);
      expect(result.current.hasEdits).toBe(true);
    });

    it("does nothing when budget is null", () => {
      const { result } = mountEditor(null);

      act(() => {
        result.current.setCurrency("SAR");
      });

      expect(result.current.editedBudget).toBeNull();
    });
  });

  describe("resetToSourceBudget", () => {
    it("discards edits and restores the source budget", () => {
      const source = buildFixtureBudget();
      const { result } = mountEditor(source);

      act(() => {
        result.current.updateItemField("14-01", "description", "تعديل مؤقت");
        result.current.setCurrency("EGP");
      });

      expect(result.current.hasEdits).toBe(true);

      act(() => {
        result.current.resetToSourceBudget();
      });

      expect(result.current.hasEdits).toBe(false);
      expect(result.current.editedBudget!.currency).toBe("USD");
      expect(
        result.current.editedBudget!.sections[0]!.categories[0]!.items[0]!.description,
      ).toBe("بطل رئيسي");
    });
  });

  describe("sync with new sourceBudget", () => {
    it("resets editedBudget when sourceBudget prop changes", () => {
      const firstBudget = buildFixtureBudget({ currency: "USD" });
      let sourceBudget = firstBudget;

      const { result, rerender } = renderHook(() =>
        useBudgetItemsEditor(sourceBudget),
      );

      // Make local edits
      act(() => {
        result.current.setCurrency("EGP");
      });
      expect(result.current.editedBudget!.currency).toBe("EGP");

      // New budget arrives from generation
      const secondBudget = buildFixtureBudget({ currency: "SAR" });
      sourceBudget = secondBudget;
      rerender();

      expect(result.current.editedBudget!.currency).toBe("SAR");
      expect(result.current.hasEdits).toBe(false);
    });

    it("sets editedBudget to null when sourceBudget becomes null", () => {
      const source = buildFixtureBudget();
      let sourceBudget: BudgetDocument | null = source;

      const { result, rerender } = renderHook(() =>
        useBudgetItemsEditor(sourceBudget),
      );

      sourceBudget = null;
      rerender();

      expect(result.current.editedBudget).toBeNull();
    });
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  clearBudgetFromLocalStorage,
  loadBudgetFromLocalStorage,
  saveBudgetToLocalStorage,
} from "./budget-local-storage";

import type { BudgetPersistedState } from "../types";

const MINIMAL_STATE: BudgetPersistedState = {
  title: "مطاردة في القاهرة",
  scenario: "فيلم قصير في القاهرة القديمة",
  budget: null,
  analysis: null,
  meta: null,
  persistedAt: "2026-04-30T12:00:00.000Z",
};

const XSS_STRINGS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  "'; DROP TABLE budgets; --",
];

describe("budget-local-storage", () => {
  describe("saveBudgetToLocalStorage", () => {
    it("saves a valid state to localStorage", () => {
      saveBudgetToLocalStorage(MINIMAL_STATE);
      const raw = localStorage.getItem("the-copy__budget-studio");
      expect(raw).not.toBeNull();
      if (raw === null) {
        throw new Error("Expected saved budget state.");
      }
      const parsed: unknown = JSON.parse(raw);
      expect(parsed).toMatchObject({
        v: 1,
        state: {
          title: "مطاردة في القاهرة",
        },
      });
    });

    it("stores XSS strings as plain text without executing them", () => {
      for (const xssString of XSS_STRINGS) {
        const stateWithXss: BudgetPersistedState = {
          ...MINIMAL_STATE,
          title: xssString,
          scenario: xssString,
        };
        saveBudgetToLocalStorage(stateWithXss);

        const restored = loadBudgetFromLocalStorage();
        expect(restored?.title).toBe(xssString);
        expect(restored?.scenario).toBe(xssString);
      }
    });

    it("does not throw when localStorage.setItem throws", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });
      expect(() => saveBudgetToLocalStorage(MINIMAL_STATE)).not.toThrow();
    });
  });

  describe("loadBudgetFromLocalStorage", () => {
    it("returns null when storage is empty", () => {
      expect(loadBudgetFromLocalStorage()).toBeNull();
    });

    it("returns null for corrupted JSON", () => {
      localStorage.setItem("the-copy__budget-studio", "not-valid-json{{");
      expect(loadBudgetFromLocalStorage()).toBeNull();
    });

    it("returns null when version does not match", () => {
      localStorage.setItem(
        "the-copy__budget-studio",
        JSON.stringify({ v: 99, state: MINIMAL_STATE }),
      );
      expect(loadBudgetFromLocalStorage()).toBeNull();
    });

    it("returns null when state is missing", () => {
      localStorage.setItem(
        "the-copy__budget-studio",
        JSON.stringify({ v: 1 }),
      );
      expect(loadBudgetFromLocalStorage()).toBeNull();
    });

    it("restores a previously saved state", () => {
      saveBudgetToLocalStorage(MINIMAL_STATE);
      const restored = loadBudgetFromLocalStorage();
      expect(restored).toEqual(MINIMAL_STATE);
    });

    it("returns null when localStorage.getItem throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
        throw new Error("SecurityError");
      });
      expect(loadBudgetFromLocalStorage()).toBeNull();
    });
  });

  describe("clearBudgetFromLocalStorage", () => {
    it("removes the stored entry", () => {
      saveBudgetToLocalStorage(MINIMAL_STATE);
      clearBudgetFromLocalStorage();
      expect(loadBudgetFromLocalStorage()).toBeNull();
    });

    it("does not throw when storage is already empty", () => {
      expect(() => clearBudgetFromLocalStorage()).not.toThrow();
    });

    it("does not throw when localStorage.removeItem throws", () => {
      vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => {
        throw new Error("SecurityError");
      });
      expect(() => clearBudgetFromLocalStorage()).not.toThrow();
    });
  });

  describe("round-trip fidelity", () => {
    it("preserves budget document with items through save and load", () => {
      const stateWithBudget: BudgetPersistedState = {
        ...MINIMAL_STATE,
        budget: {
          currency: "EGP",
          grandTotal: 150000,
          sections: [
            {
              id: "atl",
              name: "Above The Line",
              total: 150000,
              categories: [
                {
                  code: "14-00",
                  name: "طاقم التمثيل",
                  total: 150000,
                  items: [
                    {
                      code: "14-01",
                      description: "بطل رئيسي",
                      amount: 10,
                      unit: "يوم",
                      rate: 15000,
                      total: 150000,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      saveBudgetToLocalStorage(stateWithBudget);
      const restored = loadBudgetFromLocalStorage();

      expect(restored?.budget?.grandTotal).toBe(150000);
      expect(restored?.budget?.sections[0]?.categories[0]?.items[0]?.description).toBe(
        "بطل رئيسي",
      );
    });
  });
});

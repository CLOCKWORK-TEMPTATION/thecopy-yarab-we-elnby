import { isUnknownRecord } from "@/lib/utils/unknown-values";

import { BudgetSchema } from "../lib/types";
import type { Budget, SavedBudget, UserPreferences } from "../lib/types";

// — يُنسّق رقماً كعملة دولار أمريكي بدون كسور
export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// — يُعيد حساب مجاميع الميزانية (بنود → تصنيفات → أقسام → الإجمالي الكلي)
export const recalculateBudget = (budget: Budget): Budget => {
  const newSections = budget.sections.map((section) => {
    const newCategories = section.categories.map((category) => {
      const newItems = category.items.map((item) => ({
        ...item,
        total: item.amount * item.rate,
        lastModified: item.lastModified ?? new Date().toISOString(),
      }));
      const catTotal = newItems.reduce((sum, item) => sum + item.total, 0);
      return { ...category, items: newItems, total: catTotal };
    });
    const sectionTotal = newCategories.reduce((sum, cat) => sum + cat.total, 0);
    return { ...section, categories: newCategories, total: sectionTotal };
  });
  const grandTotal = newSections.reduce((sum, sec) => sum + sec.total, 0);
  return { ...budget, sections: newSections, grandTotal };
};

// — يُحلّل قائمة الميزانيات المحفوظة من localStorage ويُرجع المصفوفة الصحيحة فقط
export const parseSavedBudgets = (saved: string): SavedBudget[] => {
  const parsed: unknown = JSON.parse(saved);
  return Array.isArray(parsed) ? parsed.filter(isSavedBudget) : [];
};

// — يُحلّل تفضيلات المستخدم من localStorage مع التحقق من النوع
export const parsePreferences = (saved: string): Partial<UserPreferences> => {
  const parsed: unknown = JSON.parse(saved);
  if (!isUnknownRecord(parsed)) return {};

  const preferences: Partial<UserPreferences> = {};
  if (
    parsed["language"] === "en" ||
    parsed["language"] === "ar" ||
    parsed["language"] === "es" ||
    parsed["language"] === "fr"
  ) {
    preferences.language = parsed["language"];
  }
  if (
    parsed["theme"] === "light" ||
    parsed["theme"] === "dark" ||
    parsed["theme"] === "auto"
  ) {
    preferences.theme = parsed["theme"];
  }
  if (typeof parsed["currency"] === "string") {
    preferences.currency = parsed["currency"];
  }
  if (typeof parsed["dateFormat"] === "string") {
    preferences.dateFormat = parsed["dateFormat"];
  }
  if (typeof parsed["notifications"] === "boolean") {
    preferences.notifications = parsed["notifications"];
  }
  if (typeof parsed["autoSave"] === "boolean") {
    preferences.autoSave = parsed["autoSave"];
  }
  return preferences;
};

// — يتحقق من أن القيمة المجهولة هي SavedBudget صالحة
export const isSavedBudget = (value: unknown): value is SavedBudget => {
  if (!isUnknownRecord(value)) return false;
  return (
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    BudgetSchema.safeParse(value["budget"]).success &&
    typeof value["script"] === "string" &&
    typeof value["date"] === "string" &&
    (value["thumbnail"] === undefined ||
      typeof value["thumbnail"] === "string") &&
    (value["tags"] === undefined ||
      (Array.isArray(value["tags"]) &&
        value["tags"].every((tag) => typeof tag === "string")))
  );
};

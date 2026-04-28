// Budget Constants - Re-exports
// ثوابت الموازنة - إعادة تصدير

import { INITIAL_BUDGET_TEMPLATE } from "./budget-data";

import type { Budget } from "./types";

export {
  createLineItem,
  createCategory,
  createSection,
} from "./budget-helpers";
export { INITIAL_BUDGET_TEMPLATE, CURRENCIES, UNITS } from "./budget-data";

// =============================================================================
// لوحة الألوان للرسوم البيانية — مستهلكة في EnhancedChart عبر COLOR_PALETTE.charts
// مصفوفة ثابتة من ألوان hex متباينة وقابلة للتدوير عبر النسبة المئوية
// =============================================================================
export const COLOR_PALETTE: { readonly charts: readonly string[] } = {
  charts: [
    "#3B82F6", // أزرق
    "#10B981", // أخضر
    "#F59E0B", // كهرماني
    "#EF4444", // أحمر
    "#8B5CF6", // بنفسجي
    "#EC4899", // وردي
    "#14B8A6", // فيروزي
    "#F97316", // برتقالي
    "#06B6D4", // سماوي
    "#84CC16", // ليموني
  ] as const,
};

// =============================================================================
// قوالب الموازنة الجاهزة — مستهلكة في TemplateSelector و useBudgetState
// كل قالب يحدد فئة المشروع ويعتمد على INITIAL_BUDGET_TEMPLATE كهيكل أساسي
// =============================================================================
export interface BudgetTemplate {
  id: string;
  name: string;
  icon: string;
  category: "feature" | "short" | "documentary" | "commercial";
  description: string;
  budget: Budget;
}

export const BUDGET_TEMPLATES: readonly BudgetTemplate[] = [
  {
    id: "feature-default",
    name: "فيلم روائي طويل",
    icon: "🎬",
    category: "feature",
    description: "قالب موازنة لفيلم روائي طويل بتمويل متوسط",
    budget: INITIAL_BUDGET_TEMPLATE,
  },
  {
    id: "short-default",
    name: "فيلم قصير",
    icon: "🎞️",
    category: "short",
    description: "قالب موازنة لفيلم قصير منخفض التكلفة",
    budget: INITIAL_BUDGET_TEMPLATE,
  },
  {
    id: "documentary-default",
    name: "فيلم وثائقي",
    icon: "📽️",
    category: "documentary",
    description: "قالب موازنة لفيلم وثائقي طويل",
    budget: INITIAL_BUDGET_TEMPLATE,
  },
  {
    id: "commercial-default",
    name: "إعلان تجاري",
    icon: "📺",
    category: "commercial",
    description: "قالب موازنة لإعلان تجاري قصير عالي الإنتاج",
    budget: INITIAL_BUDGET_TEMPLATE,
  },
] as const;

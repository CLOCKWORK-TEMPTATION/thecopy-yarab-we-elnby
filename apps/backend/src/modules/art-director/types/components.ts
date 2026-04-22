/**
 * CineArchitect AI - Component-Specific Types
 * أنواع خاصة بالمكونات
 */

import { z } from "zod";

// ==================== Component-Specific Types ====================
// أنواع خاصة بالمكونات

/**
 * مخطط لوحة الألوان للإلهام
 */
export const ColorPaletteInspirationSchema = z.object({
  name: z.string(),
  nameAr: z.string(),
  colors: z.array(z.string()),
});

/**
 * واجهة لوحة الألوان للإلهام
 */
export interface ColorPaletteInspiration {
  name: string;
  nameAr: string;
  colors: string[];
}

/**
 * مخطط لوحة المزاج
 */
export const MoodBoardSchema = z.object({
  theme: z.string(),
  themeAr: z.string(),
  keywords: z.array(z.string()),
  suggestedPalette: ColorPaletteInspirationSchema.optional(),
});

/**
 * واجهة لوحة المزاج
 */
export interface MoodBoard {
  theme: string;
  themeAr: string;
  keywords: string[];
  suggestedPalette?: ColorPaletteInspiration;
}

/**
 * مخطط تقرير الاستدامة
 */
export const SustainabilityReportSchema = z.object({
  totalPieces: z.number(),
  reusablePercentage: z.number(),
  estimatedSavings: z.number(),
  environmentalImpact: z.string(),
});

/**
 * واجهة تقرير الاستدامة
 */
export interface SustainabilityReport {
  totalPieces: number;
  reusablePercentage: number;
  estimatedSavings: number;
  environmentalImpact: string;
}

/**
 * مخطط كتاب الإنتاج
 */
export const ProductionBookSchema = z.object({
  title: z.string(),
  titleAr: z.string(),
  sections: z.array(z.string()),
  createdAt: z.string(),
});

/**
 * واجهة كتاب الإنتاج
 */
export interface ProductionBook {
  title: string;
  titleAr: string;
  sections: string[];
  createdAt: string;
}

/**
 * مخطط دليل الأسلوب
 */
export const StyleGuideSchema = z.object({
  name: z.string(),
  nameAr: z.string(),
  elements: z.array(z.string()),
});

/**
 * واجهة دليل الأسلوب
 */
export interface StyleGuide {
  name: string;
  nameAr: string;
  elements: string[];
}

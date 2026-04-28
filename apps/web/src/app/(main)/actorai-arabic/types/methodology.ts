/**
 * @fileoverview أنواع المنهجيات التمثيلية
 */

import { z } from "zod";

/**
 * واجهة المنهجية التمثيلية
 * @description تمثل منهجية تمثيلية واحدة (ستانيسلافسكي، مايسنر، إلخ)
 */
export interface ActingMethodology {
  /** المعرف الفريد للمنهجية */
  id: string;
  /** الاسم بالعربية */
  name: string;
  /** الاسم بالإنجليزية */
  nameEn: string;
}

// مخطط Zod للتحقق من المنهجية
export const ActingMethodologySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().min(1),
});

/**
 * Common Critique Dimensions
 * معايير تقييم موحدة قابلة لإعادة الاستخدام
 */

import type { CritiqueDimension } from "./critiqueTypes";

export const COMMON_DIMENSIONS: Record<string, CritiqueDimension> = {
  accuracy: {
    name: "الدقة المعلوماتية",
    description: "مدى التزام التحليل بمعلومات النص الأصلي فقط",
    weight: 0.25,
    rubric: [
      { level: "excellent", score: 1.0, description: "التزام تام بالنص، لا ادعاءات خارجية", indicators: ["كل تحليل مدعوم بأدلة من النص", "لا توجد معلومات غير مذكورة", "رؤية دقيقة للتفاصيل"] },
      { level: "good", score: 0.8, description: "التزام جيد بالنص مع ادعاءات محدودة", indicators: ["معظم التحليل مدعوم", "ادعاءات قليلة خارج النص"] },
      { level: "satisfactory", score: 0.6, description: "التزام مقبول مع بعض الانحرافات", indicators: ["بعض الانحراف عن النص", "ادعاءات معقولة"] },
      { level: "needs_improvement", score: 0.4, description: "انحرافات واضحة عن النص", indicators: ["ادعاءات كثيرة غير مدعومة", "تحليلات خيالية"] },
      { level: "poor", score: 0.2, description: "لا التزام بالنص", indicators: ["تحليل كامل من الخيال", "معلومات خاطئة"] }
    ]
  },

  clarity: {
    name: "الوضوح والتنظيم",
    description: "وضوح العرض وتنظيم الأفكار",
    weight: 0.2,
    rubric: [
      { level: "excellent", score: 1.0, description: "بنية واضحة تماماً وأفكار مترابطة", indicators: ["مقدمة واضحة", "تسلسل منطقي", "خلاصة مركزة"] },
      { level: "good", score: 0.8, description: "بنية جيدة مع بعض القفزات", indicators: ["تسلسل جيد", "ربط جيد"] },
      { level: "satisfactory", score: 0.6, description: "تنظيم مقبول", indicators: ["بعض الفوضى", "أفكار مفككة"] },
      { level: "needs_improvement", score: 0.4, description: "تنظيم ضعيف", indicators: ["فوضى واضحة", "أفكار مبعثرة"] },
      { level: "poor", score: 0.2, description: "لا تنظيم", indicators: ["فوضى كاملة", "صعوبة المتابعة"] }
    ]
  },

  depth: {
    name: "العمق التحليلي",
    description: "عمق التحليل واستنتاج الرؤى",
    weight: 0.3,
    rubric: [
      { level: "excellent", score: 1.0, description: "تحليل عميق يكشف عن جوانب خفية", indicators: ["استنتاجات ذكية", "رؤى أصيلة", "تحليل متعدد المستويات"] },
      { level: "good", score: 0.8, description: "تحليل جيد مع رؤى قيمة", indicators: ["استنتاجات سليمة", "رؤى مفيدة"] },
      { level: "satisfactory", score: 0.6, description: "تحليل سطحي مقبول", indicators: ["ملاحظات عامة", "رؤي محدودة"] },
      { level: "needs_improvement", score: 0.4, description: "تحليل سطحي جداً", indicators: ["وصف فقط", "لا استنتاجات"] },
      { level: "poor", score: 0.2, description: "لا تحليل", indicators: ["تلخيص فقط", "لا قيمة مضافة"] }
    ]
  }
};

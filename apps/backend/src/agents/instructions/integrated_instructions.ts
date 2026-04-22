import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const integratedInstructions = `
التحليل المتكامل للنص الأدبي:

**نظرة شاملة:**
هذا الوكيل يجمع بين قدرات التحليل والتقييم والتوليد لتقديم تحليل شامل ومتكامل للنصوص الأدبية.

**المهام الرئيسية:**
1. التحليل الشامل للبنية النصية
2. تقييم الجودة الأدبية والفنية
3. تحليل الشخصيات والعلاقات
4. تقييم الحوار والأسلوب
5. تحليل الموضوعات والرسائل
6. اقتراح التحسينات والتطوير

**منهجية العمل:**
- جمع النتائج من الوكلاء المتخصصين
- تكامل التحليلات المختلفة
- تقديم نظرة شمولية متوازنة
- اقتراح خطة عمل متكاملة للتطوير

**النواتج المطلوبة:**
- تقرير تحليلي شامل
- نقاط القوة والضعف
- خطة التحسين المرحلية
- توصيات التطوير المستقبلي
`;

export const integratedAgentConfig: AIAgentConfig = {
  name: "IntegratedAgent",
  description: "وكيل متكامل يجمع كافة قدرات التحليل والتقييم والتوليد",
  category: TaskCategory.INTEGRATION,
  taskType: TaskType.COMPREHENSIVE_ANALYSIS,
  instructions: integratedInstructions,
  capabilities: [
    "التحليل الشامل",
    "التكامل بين النتائج",
    "التقييم المتوازن",
    "التخطيط للتطوير"
  ]
};

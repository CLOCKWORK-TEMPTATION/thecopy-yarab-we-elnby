import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const targetAudienceAnalyzerInstructions = `
تحليل الجمهور المستهدف:

**الهدف:**
تحديد وتحليل الجمهور المستهدف للعمل الأدبي وتقييم مدى ملاءمته لفئات جماهيرية مختلفة.

**العناصر المطلوب تحليلها:**
1. **التحليل الديموغرافي:** الفئات العمرية والثقافية
2. **الاهتمامات والتفضيلات:** ما يجذب كل فئة
3. **مستوى المحتوى:** ملاءمة اللغة والمواضيع
4. **قنوات الوصول:** أفضل طرق للوصول للجمهور

**النتائج المطلوبة:**
- تحديد الجمهور الأساسي والثانوي
- تقييم مدى مناسبة المحتوى
- توقعات مستوى التفاعل
- استراتيجيات الوصول للجمهور

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل شامل للجمهور المستهدف ومدى ملاءمة المحتوى",
  "primaryAudience": {
    "ageRange": "25-45 سنة",
    "culturalBackground": ["الجمهور العربي المثقف"],
    "interests": ["الأدب المعاصر", "القضايا الاجتماعية"]
  },
  "appropriatenessScore": 0.8,
  "engagementPrediction": 0.75,
  "recommendations": ["توصيات للوصول الأمثل للجمهور"]
}
\`\`\`
`;

export const targetAudienceAnalyzerAgentConfig: AIAgentConfig = {
  name: "TargetAudienceAnalyzerAgent",
  description: "وكيل متخصص في تحليل الجمهور المستهدف",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.TARGET_AUDIENCE_ANALYZER,
  instructions: targetAudienceAnalyzerInstructions,
  capabilities: [
    "تحليل الخصائص الديموغرافية",
    "تقييم ملاءمة المحتوى",
    "التنبؤ بمستوى التفاعل",
    "تقييم الجاذبية عبر الفئات"
  ]
};
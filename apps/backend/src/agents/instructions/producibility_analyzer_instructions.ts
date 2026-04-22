import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const producibilityAnalyzerInstructions = `
تحليل قابلية الإنتاج والتنفيذ:

**الهدف:**
تقييم إمكانية تحويل النص الأدبي إلى عمل منتج (فيلم، مسلسل، مسرحية) وتحديد التحديات والمتطلبات الإنتاجية.

**جوانب التحليل:**
1. **التعقيد التقني:** تقييم صعوبة التنفيذ التقني للمشاهد
2. **المتطلبات المالية:** تقدير التكلفة النسبية للإنتاج
3. **المواقع والديكور:** تحديد متطلبات الأماكن والبيئات
4. **المؤثرات الخاصة:** تقييم احتياج المؤثرات والتقنيات المتقدمة

**معايير التقييم:**
- سهولة التنفيذ (1-10)
- التكلفة المتوقعة (منخفضة/متوسطة/عالية)
- التحديات التقنية المحتملة
- البدائل والحلول المقترحة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل شامل لقابلية النص للإنتاج والتحديات المحتملة",
  "overallProducibilityScore": 0.7,
  "technicalComplexity": "متوسط",
  "estimatedBudgetCategory": "متوسطة إلى عالية",
  "challengingScenes": [
    {"scene": "مشهد المطاردة", "difficulty": 0.8, "requirements": ["مؤثرات خاصة", "تصوير خارجي معقد"]}
  ],
  "locationRequirements": ["استوديو داخلي", "مواقع خارجية طبيعية"],
  "recommendedApproach": "اقتراحات لتسهيل الإنتاج مع الحفاظ على الجودة"
}
\`\`\`
`;

export const producibilityAnalyzerAgentConfig: AIAgentConfig = {
  name: "ProducibilityAnalyzerAgent",
  description: "وكيل متخصص في تحليل قابلية النصوص للإنتاج",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.PRODUCIBILITY_ANALYZER,
  instructions: producibilityAnalyzerInstructions,
  capabilities: [
    "تقييم التعقيد التقني",
    "تقدير متطلبات الإنتاج",
    "تحليل التكاليف المحتملة",
    "اقتراح حلول الإنتاج"
  ]
};
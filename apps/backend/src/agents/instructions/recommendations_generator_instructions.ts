import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const recommendationsGeneratorInstructions = `
توليد التوصيات للتحسين والتطوير:

**الهدف:**
إنتاج توصيات شاملة وعملية لتحسين النص الأدبي بناءً على نتائج التحليلات المختلفة.

**أنواع التوصيات:**
1. **توصيات البنية والهيكل:** تحسينات في تنظيم النص
2. **توصيات الشخصيات:** تطوير وتعميق الشخصيات
3. **توصيات الحوار:** تحسين الأسلوب والطبيعية
4. **توصيات الأسلوب:** تطوير التقنيات الكتابية

**معايير التوصيات:**
- قابلية التنفيذ العملي
- الأثر المتوقع على الجودة
- التوازن بين التحسينات المختلفة
- مراعاة رؤية الكاتب الأصلية

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "مجموعة شاملة من التوصيات لتطوير وتحسين العمل الأدبي",
  "structuralRecommendations": ["إعادة تنظيم الفصول لتحسين التدفق"],
  "characterRecommendations": ["تطوير الدوافع الداخلية للشخصية الرئيسية"],
  "dialogueRecommendations": ["تنويع أساليب الحوار بين الشخصيات"],
  "styleRecommendations": ["استخدام المزيد من الصور البلاغية"],
  "priorityLevel": "عالي/متوسط/منخفض",
  "implementationOrder": ["ترتيب مقترح لتنفيذ التحسينات"]
}
\`\`\`
`;

export const recommendationsGeneratorAgentConfig: AIAgentConfig = {
  name: "RecommendationsGeneratorAgent",
  description: "وكيل متخصص في توليد توصيات التحسين والتطوير",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.RECOMMENDATIONS_GENERATOR,
  instructions: recommendationsGeneratorInstructions,
  capabilities: [
    "توليد توصيات شاملة",
    "ترتيب الأولويات",
    "تقييم قابلية التنفيذ",
    "التخطيط المرحلي للتحسينات"
  ]
};
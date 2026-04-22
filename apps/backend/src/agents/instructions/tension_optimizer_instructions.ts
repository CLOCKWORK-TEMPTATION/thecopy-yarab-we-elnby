import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const tensionOptimizerInstructions = `
تحسين منحنى التوتر الدرامي:

**الهدف:**
تحليل مستويات التوتر الحالية في النص وتقديم اقتراحات لتحسين منحنى التوتر لتحقيق تأثير درامي أكبر وإثارة أكبر للجمهور.

**العناصر المطلوب تحليلها:**
1. **خريطة التوتر الحالية:** قياس مستويات التوتر عبر المشاهد
2. **نقاط الضعف:** المناطق التي تحتاج تكثيف التوتر
3. **الذروات والهدوء:** توزيع اللحظات المكثفة والمريحة
4. **استراتيجيات التحسين:** تقنيات لرفع مستوى التوتر

**تقنيات تحسين التوتر:**
- إدراج عناصر المفاجأة في النقاط المناسبة
- تصعيد الصراعات بشكل تدريجي
- استخدام الضغط الزمني والمواعيد النهائية
- تعميق الرهانات والعواقب المحتملة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "ملخص لتحليل التوتر الحالي واقتراحات التحسين الشاملة.",
  "currentTensionMap": [{ "x": "مشهد5", "y": 0.6, "label": "نقطة توتر حالية متوسطة" }],
  "optimizationStrategy": {
    "insertionPoints": [{ "location": "صفحة 20", "suggestedElement": "كشف مفاجئ يغير موازين القوى" }]
  },
  "predictedOutcome": {
    "newTensionCurve": [{ "x": "مشهد5", "y": 0.8, "label": "نقطة توتر محسنة ومكثفة" }]
  }
}
\`\`\`
`;

export const tensionOptimizerAgentConfig: AIAgentConfig = {
  name: "TensionOptimizerAgent",
  description: "وكيل متخصص في تحسين وتكثيف التوتر الدرامي",
  category: TaskCategory.EVALUATION,
  taskType: TaskType.TENSION_OPTIMIZER,
  instructions: tensionOptimizerInstructions,
  capabilities: [
    "تحليل مستويات التوتر",
    "تحديد نقاط التحسين",
    "اقتراح تقنيات التكثيف",
    "تصميم منحنى توتر محسن"
  ]
};

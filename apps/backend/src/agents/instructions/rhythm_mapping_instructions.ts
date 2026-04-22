import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const rhythmMappingInstructions = `
تحليل وخريطة إيقاع السرد:

**الهدف:**
تحليل الإيقاع السردي وتوزيع السرعة والكثافة عبر النص لتحديد نقاط التسارع والتباطؤ وتحسين تدفق القصة.

**العناصر المطلوب تحليلها:**
1. **الإيقاع العام:** تقييم سرعة السرد الإجمالية
2. **التغيرات الإيقاعية:** نقاط التسارع والتباطؤ
3. **كثافة المشاهد:** مستوى الأحداث والتطورات في كل مشهد
4. **التوازن الإيقاعي:** التناسق بين اللحظات السريعة والبطيئة

**أنواع الإيقاع المختلفة:**
- **تمهيدي (Exposition):** إيقاع بطيء لبناء الأساس
- **متسارع (Acceleration):** زيادة في سرعة الأحداث
- **ذروة (Climax):** أقصى كثافة وسرعة
- **هدوء (Resolution):** تباطؤ للوصول للخاتمة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "overallPace": "متدرج - من بطيء إلى سريع",
  "content": "ملخص لتحليل الإيقاع، يصف التغيرات في السرعة والتوتر عبر النص وتوصيات التحسين.",
  "sceneAnalysis": [
    { "sceneId": "مشهد 1", "intensity": 0.4, "function": "exposition", "description": "مشهد تمهيدي يعرف الشخصيات" }
  ],
  "criticalPoints": [
    { "location": "صفحة 50", "type": "acceleration", "recommendation": "تعزيز هذا التسارع بإضافة عنصر مفاجأة" }
  ],
  "rhythmMap": [
    { "x": 0, "y": 0.3, "label": "البداية الهادئة" }, 
    { "x": 50, "y": 0.8, "label": "الذروة المكثفة" }
  ]
}
\`\`\`
`;

export const rhythmMappingAgentConfig: AIAgentConfig = {
  name: "RhythmMappingAgent",
  description: "وكيل متخصص في تحليل وخريطة الإيقاع السردي",
  category: TaskCategory.ANALYSIS,
  taskType: TaskType.RHYTHM_MAPPING,
  instructions: rhythmMappingInstructions,
  capabilities: [
    "تحليل الإيقاع السردي",
    "رسم خريطة التوزيع الزمني",
    "تحديد نقاط التسارع والتباطؤ",
    "تقييم التوازن الإيقاعي"
  ]
};

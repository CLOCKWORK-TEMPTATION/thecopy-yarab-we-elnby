import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const dialogueAdvancedAnalyzerInstructions = `
التحليل المتقدم للحوار:

**الهدف:**
تحليل عميق وشامل لجودة الحوار في النص من خلال معايير تقنية ولغوية متطورة.

**محاور التحليل:**
1. **الطبيعية والواقعية:** مدى قرب الحوار من الكلام الطبيعي
2. **التمييز بين الأصوات:** وضوح هوية كل شخصية من خلال كلامها
3. **الوظائف الدرامية:** دور الحوار في تطوير السرد والشخصيات
4. **الإيقاع والتدفق:** انسيابية الحوار وتناغمه

**العناصر التقنية:**
- **البنية اللغوية:** تحليل القواعد والأسلوب
- **المضمون العاطفي:** قوة التعبير عن المشاعر
- **التوقيت والإيقاع:** مناسبة طول وإيقاع الجمل
- **الوضوح والفهم:** سهولة متابعة وفهم الحوار

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل متقدم وشامل لجودة وفعالية الحوار",
  "overallDialogueScore": 0.8,
  "naturalness": {"score": 0.7, "analysis": "الحوار طبيعي مع بعض المواضع المتكلفة"},
  "voiceDistinction": {"score": 0.9, "analysis": "تمييز واضح بين أصوات الشخصيات"},
  "dramaticFunction": {"score": 0.8, "analysis": "الحوار يخدم السرد بشكل فعال"},
  "rhythmAndFlow": {"score": 0.7, "analysis": "إيقاع جيد مع إمكانية للتحسين"},
  "keyStrengths": ["نقاط القوة في الحوار"],
  "improvementSuggestions": ["اقتراحات محددة للتطوير"],
  "exemplaryDialogue": ["أمثلة على الحوار المتميز في النص"]
}
\`\`\`
`;

export const dialogueAdvancedAnalyzerAgentConfig: AIAgentConfig = {
  name: "DialogueAdvancedAnalyzerAgent",
  description: "وكيل متخصص في التحليل المتقدم للحوار",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
  instructions: dialogueAdvancedAnalyzerInstructions,
  capabilities: [
    "تحليل الطبيعية والواقعية",
    "تقييم التمييز بين الأصوات",
    "تحليل الوظائف الدرامية",
    "قياس الإيقاع والتدفق"
  ]
};
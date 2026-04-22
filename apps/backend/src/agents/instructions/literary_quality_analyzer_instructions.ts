import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const literaryQualityAnalyzerInstructions = `
تحليل الجودة الأدبية:

**الهدف:**
تقييم شامل للجودة الأدبية والفنية للنص من خلال معايير نقدية متعددة.

**معايير التقييم:**
1. **الأصالة والإبداع:** مدى تفرد العمل وإبداعيته
2. **التماسك الفني:** قوة البناء والتنظيم
3. **عمق المضمون:** ثراء الأفكار والموضوعات
4. **جودة التعبير:** مستوى اللغة والأسلوب

**جوانب التحليل:**
- **البناء السردي:** تقييم هيكل القصة وتطورها
- **تطوير الشخصيات:** عمق وواقعية الشخصيات
- **الأسلوب اللغوي:** جودة اللغة والتعبير
- **الرسالة والمعنى:** وضوح وقوة الرسالة المقصودة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تقييم شامل للجودة الأدبية والفنية للعمل",
  "overallQualityScore": 0.8,
  "dimensions": {
    "originality": {"score": 0.7, "notes": "عمل يحمل بعض الأفكار المبتكرة"},
    "artisticCohesion": {"score": 0.8, "notes": "بناء محكم ومترابط"},
    "contentDepth": {"score": 0.9, "notes": "معالجة عميقة للموضوعات"},
    "expressiveQuality": {"score": 0.7, "notes": "لغة جيدة مع إمكانية للتحسين"}
  },
  "strengths": ["نقاط القوة الأساسية"],
  "improvementAreas": ["مجالات التطوير المقترحة"],
  "literarySignificance": "تقييم الأهمية الأدبية للعمل"
}
\`\`\`
`;

export const literaryQualityAnalyzerAgentConfig: AIAgentConfig = {
  name: "LiteraryQualityAnalyzerAgent",
  description: "وكيل متخصص في تحليل وتقييم الجودة الأدبية",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.LITERARY_QUALITY_ANALYZER,
  instructions: literaryQualityAnalyzerInstructions,
  capabilities: [
    "تقييم الأصالة والإبداع",
    "تحليل التماسك الفني",
    "قياس عمق المضمون",
    "تقييم جودة التعبير"
  ]
};
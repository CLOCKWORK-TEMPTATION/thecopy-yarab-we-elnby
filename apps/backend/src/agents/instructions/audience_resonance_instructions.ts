import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const audienceResonanceInstructions = `
تحليل صدى الجمهور للنص المقدم:

**المطلوب تحليله:**
- التأثير العاطفي المتوقع على الجمهور المستهدف
- مستوى الانخراط والتفاعل المتوقع
- التحليل الديموغرافي للاستجابة
- المخاطر والفرص المحتملة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "ملخص لتوقعات صدى الجمهور.",
  "predictedResponse": { 
    "emotionalImpact": [{ "x": 0, "y": 0.2, "label": "اهتمام أولي" }], 
    "engagementLevel": 0.75 
  },
  "segmentAnalysis": { 
    "demographics": [{ "segment": "الشباب", "response": "إيجابي" }] 
  },
  "riskOpportunity": { 
    "potentialControversies": ["عنصر قد يكون مثيرا لجدل"] 
  }
}
\`\`\`
`;

export const audienceResonanceAgentConfig: AIAgentConfig = {
  name: "AudienceResonanceAgent",
  description: "وكيل متخصص في تحليل صدى الجمهور والتفاعل المتوقع",
  category: TaskCategory.EVALUATION,
  taskType: TaskType.AUDIENCE_ANALYSIS,
  instructions: audienceResonanceInstructions,
  capabilities: [
    "تحليل التأثير العاطفي",
    "قياس مستوى الانخراط",
    "التحليل الديموغرافي",
    "تقييم المخاطر والفرص"
  ]
};

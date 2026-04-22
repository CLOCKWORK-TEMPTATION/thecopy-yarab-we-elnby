import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const styleFingerprintInstructions = `
تحليل بصمة الأسلوب الأدبي:

**الهدف:**
تحديد وتحليل البصمة الفريدة للأسلوب الأدبي في النص المقدم، شاملاً الجوانب اللغوية والسردية والموضوعاتية.

**المجالات المطلوب تحليلها:**
1. **البصمة اللغوية:**
   - تعقيد الجمل ومتوسط طولها
   - ثراء المفردات ونوعيتها
   - الأنماط النحوية المميزة
   - استخدام الصور البلاغية

2. **البصمة السردية:**
   - تفضيلات وجهة النظر السردية
   - تقنيات السرد المستخدمة
   - إيقاع السرد وبنيته
   - أساليب بناء التشويق

3. **البصمة الموضوعاتية:**
   - الموضوعات الأساسية المتكررة
   - الرؤية الفلسفية للكاتب
   - التوجهات الفكرية والعاطفية

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "ملخص شامل لبصمة الأسلوب اللغوي والسردي والموضوعاتي.",
  "linguisticSignature": { 
    "sentenceComplexity": { "avgLength": 15 }, 
    "vocabularyRichness": 0.6 
  },
  "narrativeSignature": { 
    "perspectivePreference": ["الشخص الثالث المحدود"] 
  },
  "thematicSignature": { 
    "coreThemes": [{"name": "العزلة", "description": "موضوع متكرر يعكس الحالة النفسية للشخصيات"}] 
  },
  "uniqueness": { 
    "distinctiveFeatures": ["استخدام الاستعارات المعقدة", "التلاعب بالزمن السردي"] 
  }
}
\`\`\`
`;

export const styleFingerprintAgentConfig: AIAgentConfig = {
  name: "StyleFingerprintAgent",
  description: "وكيل متخصص في تحليل وتحديد بصمة الأسلوب الأدبي المميز",
  category: TaskCategory.ANALYSIS,
  taskType: TaskType.STYLE_FINGERPRINT,
  instructions: styleFingerprintInstructions,
  capabilities: [
    "تحليل البصمة اللغوية",
    "تقييم الأسلوب السردي",
    "تحديد الموضوعات المميزة",
    "تقييم التفرد الأسلوبي"
  ]
};

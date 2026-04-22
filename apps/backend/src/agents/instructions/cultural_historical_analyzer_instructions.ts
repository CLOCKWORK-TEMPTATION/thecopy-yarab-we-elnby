import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const culturalHistoricalAnalyzerInstructions = `
التحليل الثقافي والتاريخي:

**الهدف:**
تحليل السياق الثقافي والتاريخي للنص وتقييم دقة التمثيل التاريخي والثقافي ومدى ارتباطه بالخلفية الاجتماعية.

**محاور التحليل:**
1. **السياق التاريخي:** دقة المعلومات والأحداث التاريخية
2. **التمثيل الثقافي:** صحة تصوير العادات والتقاليد
3. **البيئة الاجتماعية:** واقعية الأوضاع الاجتماعية المصورة
4. **اللغة والأسلوب:** مناسبة اللغة للفترة والمكان

**عناصر التقييم:**
- **المصداقية التاريخية:** مدى اتفاق النص مع الحقائق التاريخية
- **الحساسية الثقافية:** احترام وفهم الثقافات المختلفة
- **التوثيق والبحث:** عمق البحث وجودة المراجع
- **التوازن والإنصاف:** تجنب الصور النمطية والأحكام المسبقة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل شامل للسياق الثقافي والتاريخي للعمل",
  "historicalAccuracy": {"score": 0.8, "analysis": "معظم التفاصيل التاريخية دقيقة"},
  "culturalRepresentation": {"score": 0.7, "analysis": "تمثيل جيد للثقافة مع بعض التبسيط"},
  "socialContext": {"score": 0.9, "analysis": "تصوير واقعي للأوضاع الاجتماعية"},
  "languageAppropriatenesa": {"score": 0.8, "analysis": "لغة مناسبة للسياق التاريخي"},
  "researchDepth": "تقييم مستوى البحث والتوثيق",
  "culturalSensitivity": "تقييم الحساسية الثقافية والاحترام",
  "recommendations": ["توصيات لتحسين الدقة التاريخية والثقافية"]
}
\`\`\`
`;

export const culturalHistoricalAnalyzerAgentConfig: AIAgentConfig = {
  name: "CulturalHistoricalAnalyzerAgent",
  description: "وكيل متخصص في التحليل الثقافي والتاريخي",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.CULTURAL_HISTORICAL_ANALYZER,
  instructions: culturalHistoricalAnalyzerInstructions,
  capabilities: [
    "تحليل السياق التاريخي",
    "تقييم التمثيل الثقافي",
    "فحص البيئة الاجتماعية",
    "تقييم الحساسية الثقافية"
  ]
};
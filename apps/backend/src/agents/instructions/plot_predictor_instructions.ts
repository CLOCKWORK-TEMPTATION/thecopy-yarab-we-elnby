import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const plotPredictorInstructions = `
توقع مسار الأحداث والتطور الدرامي:

**الهدف:**
التنبؤ بالأحداث المستقبلية في القصة بناءً على التطورات الحالية وطبيعة الشخصيات والعناصر الدرامية المطروحة.

**العناصر المطلوب تحليلها:**
1. **الأحداث التالية المحتملة:** توقعات منطقية للتطورات القادمة
2. **تطور الشخصيات:** كيف ستتغير وتنمو الشخصيات
3. **الصراعات المتوقعة:** النزاعات والتحديات القادمة
4. **النقاط المحورية:** اللحظات المهمة المرتقبة في القصة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل للسياق الحالي وتوقعات التطورات المستقبلية ضمن النطاق المحدد.",
  "currentTrajectory": [{ "point": "الحدث الحالي 1", "description": "وصف موجز للوضع الراهن" }],
  "predictions": {
    "likelyDevelopments": [{ "scenario": "تطور محتمل 1", "probability": 0.7 }],
    "alternativePaths": [{ "path": "مسار بديل 1", "innovationScore": 0.5 }]
  },
  "recommendations": {
    "optimalPath": "المسار الموصى به للتطوير",
    "avoidPitfalls": ["مأزق محتمل يجب تجنبه"]
  }
}
\`\`\`
`;

export const plotPredictorAgentConfig: AIAgentConfig = {
  name: "PlotPredictorAgent",
  description: "وكيل متخصص في التنبؤ بمسار الأحداث والتطور الدرامي",
  category: TaskCategory.PREDICTIVE,
  taskType: TaskType.PLOT_PREDICTOR,
  instructions: plotPredictorInstructions,
  capabilities: [
    "توقع الأحداث المستقبلية",
    "تحليل تطور الشخصيات", 
    "تقدير احتماليات السيناريوهات",
    "تحديد النقاط المحورية"
  ]
};

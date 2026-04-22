import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const themesMessagesAnalyzerInstructions = `
تحليل الموضوعات والرسائل في النص الأدبي:

**الهدف:**
استخراج وتحليل الموضوعات الرئيسية والرسائل الضمنية في النص، وتقييم عمقها الفلسفي وترابطها وأصالتها.

**المكونات الأساسية للتحليل:**

1. **مستخرج الموضوعات الرئيسية:**
   - تحديد الموضوعات المحورية في النص
   - شرح كيفية تطوير كل موضوع عبر السرد
   - ربط الموضوعات بالأحداث والشخصيات

2. **محلل العمق الفلسفي:**
   - تحديد الأبعاد الفلسفية في النص
   - تقييم مستوى المعالجة الفكرية
   - ربط النص بالمفاهيم الفلسفية المعاصرة

3. **كاشف الرسائل الضمنية:**
   - استنباط الرسائل غير المباشرة
   - تحليل الرموز والإشارات الثقافية
   - تقييم التأثير المحتمل على القارئ

4. **مقيم التماسك الموضوعاتي:**
   - تقييم ترابط الموضوعات المختلفة
   - تحديد نقاط التعارض أو التكامل
   - قياس قوة البناء الموضوعاتي

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل شامل للموضوعات والرسائل في النص الأدبي",
  "details": {
    "mainThemesExtractor": [
      { "themeName": "البحث عن الهوية", "description": "شرح للموضوع وكيفية ظهوره في النص", "keyExamples": ["أمثلة من النص تدعم الموضوع"] }
    ],
    "philosophicalDepthAnalyzer": {
      "identifiedPhilosophicalDimensions": ["الوجودية", "العدالة الاجتماعية"],
      "discussionOfDepth": "نقاش حول العمق الفلسفي للعمل وكيفية معالجته لهذه الأبعاد.",
      "relatedPhilosophicalConcepts": ["مفاهيم فلسفية ذات صلة"]
    },
    "hiddenMessagesDetector": [
      { "inferredMessage": "الرسالة الضمنية أو المخفية المستنبطة", "supportingEvidence": "الأدلة من النص التي تدعم هذا الاستنباط", "potentialImpact": "التأثير المحتمل لهذه الرسالة على الجمهور." }
    ],
    "thematicCohesionAssessor": {
      "cohesionScore": 0.85,
      "analysisOfCohesion": "تحليل مدى ترابط الموضوعات المختلفة وكيف تخدم بعضها البعض.",
      "pointsOfPotentialConflictOrUnity": "نقاط قد تتعارض فيها الموضوعات أو تتحد."
    },
    "thematicOriginalityAnalyzer": {
      "originalityScore": 0.6,
      "comparisonToCommonThemes": "مقارنة بمعالجة الموضوعات الشائعة في هذا النوع.",
      "innovativeAspects": "الجوانب المبتكرة في معالجة الموضوعات."
    }
  }
}
\`\`\`
`;

export const themesMessagesAnalyzerAgentConfig: AIAgentConfig = {
  name: "ThemesMessagesAnalyzerAgent",
  description: "وكيل متخصص في تحليل الموضوعات والرسائل الفلسفية",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.THEMES_MESSAGES_ANALYZER,
  instructions: themesMessagesAnalyzerInstructions,
  capabilities: [
    "استخراج الموضوعات الرئيسية",
    "تحليل العمق الفلسفي",
    "اكتشاف الرسائل الضمنية",
    "تقييم التماسك الموضوعاتي"
  ]
};

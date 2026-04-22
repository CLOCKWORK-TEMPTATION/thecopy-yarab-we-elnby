import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const visualCinematicAnalyzerInstructions = `
تحليل الجوانب البصرية والسينمائية للنص:

**الهدف:**
تحليل شامل للعناصر البصرية والسينمائية في النص لتقييم قابليته للإخراج المرئي وتحديد الرؤية البصرية المطلوبة.

**المكونات الأساسية للتحليل:**

1. **مفسر التعليمات الإخراجية:**
   - استخراج وتفسير التوجيهات البصرية من النص
   - تحليل الرؤية الإخراجية المقصودة
   - تقييم وضوح التعليمات التقنية

2. **محلل الأجواء البصرية:**
   - تحديد الحالة المزاجية البصرية لكل مشهد
   - تحليل العناصر البصرية المساهمة في الجو
   - ربط الألوان والإضاءة بالمعنى الدرامي

3. **كاشف الرمزية البصرية:**
   - اكتشاف الاستعارات والرموز المرئية
   - تحليل المعاني الضمنية للعناصر البصرية
   - ربط الرمزية بالموضوعات الأساسية

4. **مقيم قابلية التصوير:**
   - تقييم إمكانية تنفيذ المشاهد بصريًا
   - تحديد التحديات الإنتاجية المحتملة
   - اقتراح حلول تقنية للمشاهد المعقدة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "content": "تحليل شامل للجوانب البصرية والسينمائية للنص",
  "details": {
    "directorialInstructionsInterpreter": {
      "keyStageDirections": [
        { "directionText": "نص التعليمات الإخراجية", "interpretation": "تفسير الرؤية البصرية المقصودة (إضاءة، كاميرا، تكوين)" }
      ],
      "overallVisualVision": "ملخص للرؤية البصرية العامة المستنبطة من التعليمات."
    },
    "atmosphereAnalyzer": [
      {
        "sceneOrSection": "وصف المشهد أو الجزء",
        "visualMood": "الحالة المزاجية البصرية (مثال: قاتم، مشرق، متوتر)",
        "contributingElements": ["العناصر البصرية المساهمة في الجو (ألوان، إضاءة، بيئة)"]
      }
    ],
    "visualSymbolismDetector": [
      {
        "symbolDescription": "وصف الرمز البصري أو الاستعارة المرئية",
        "potentialMeanings": ["المعاني المحتملة للرمز"],
        "thematicConnection": "كيف يرتبط الرمز بالموضوعات الرئيسية."
      }
    ],
    "shootabilityAssessor": {
      "overallShootabilityScore": 0.7,
      "challengingScenes": [
        { "sceneDescription": "وصف المشهد", "potentialChallenges": ["تحديات الإنتاج المحتملة (مؤثرات خاصة، مواقع معقدة)"] }
      ],
      "shootabilityNotes": "ملاحظات عامة حول قابلية النص للتصوير."
    },
    "cinematicFlowAnalyzer": {
      "sceneTransitionAnalysis": "تحليل عام لتدفق المشاهد والانتقالات بينها (مثال: سلس، متقطع، إيقاع سريع).",
      "keyTransitions": [
        { "fromScene": "وصف المشهد السابق", "toScene": "وصف المشهد التالي", "transitionType": "نوع الانتقال (قطع، مزج، تلاشي)", "effect": "تأثير هذا الانتقال على السرد." }
      ],
      "pacingAndRhythmVisuals": "كيف يساهم التدفق البصري في الإيقاع العام."
    }
  }
}
\`\`\`
`;

export const visualCinematicAnalyzerAgentConfig: AIAgentConfig = {
  name: "VisualCinematicAnalyzerAgent",
  description: "وكيل متخصص في تحليل الجوانب البصرية والسينمائية للنصوص",
  category: TaskCategory.ADVANCED_MODULES,
  taskType: TaskType.VISUAL_CINEMATIC_ANALYZER,
  instructions: visualCinematicAnalyzerInstructions,
  capabilities: [
    "تفسير التعليمات الإخراجية",
    "تحليل الأجواء البصرية",
    "اكتشاف الرمزية المرئية",
    "تقييم قابلية التصوير"
  ]
};

import { ADVANCED_MODULE_OUTPUT_STRUCTURE } from "../shared/advancedModuleOutputStructure";

export const CULTURAL_HISTORICAL_ANALYZER_INSTRUCTIONS = `
### الوحدة 7: محلل السياق الثقافي والتاريخي (TaskType.CULTURAL_HISTORICAL_ANALYZER)
**الهدف:** تحليل الدقة الثقافية والتاريخية للنص، والتعامل مع القضايا الحساسة.
${ADVANCED_MODULE_OUTPUT_STRUCTURE}
**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
\`\`\`json
{
  "historicalPeriodIdentifier": {
    "identifiedPeriod": "الفترة التاريخية التي تدور فيها الأحداث (إذا كانت محددة)",
    "periodCharacteristics": ["خصائص الفترة التاريخية البارزة"],
    "accuracyOfPeriodRepresentation": "تقييم دقة تمثيل الفترة (إذا كانت المعلومات متوفرة في النص)."
  },
  "culturalAccuracyAnalyzer": {
    "culturalElementsDepicted": ["عناصر ثقافية مصورة (عادات، تقاليد، لغة)"],
    "assessmentOfAccuracy": "تقييم صحة ودقة التمثيل الثقافي.",
    "potentialMisrepresentations": ["نقاط قد يكون فيها سوء تمثيل ثقافي أو تبسيط مخل."]
  },
  "biasDetector": [
    { "potentialBiasType": "نوع التحيز (مثال: ثقافي، تاريخي، جنساني)", "evidenceInText": "أمثلة من النص قد تشير إلى هذا التحيز", "impactOfBias": "التأثير المحتمل لهذا التحيز." }
  ],
  "sensitivityAssessor": [
    { "sensitiveIssue": "القضية الحساسة التي تم تناولها", "mannerOfTreatment": "كيفية تناول القضية في النص", "sensitivityEvaluation": "تقييم مدى حساسية وملاءمة التناول.", "recommendationsForHandling": "توصيات للتعامل مع القضية بحساسية أكبر." }
  ],
  "socialImpactAnalyzer": {
    "potentialPositiveImpacts": ["التأثيرات الإيجابية المحتملة على المجتمع أو الفئات المعنية"],
    "potentialNegativeImpactsOrControversies": ["التأثيرات السلبية أو الجدل المحتمل"],
    "overallSocialCommentary": "التعليق الاجتماعي العام الذي يقدمه العمل."
  }
}
\`\`\`
`;

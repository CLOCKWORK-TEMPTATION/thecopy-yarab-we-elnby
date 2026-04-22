import { ADVANCED_MODULE_OUTPUT_STRUCTURE } from "../shared/advancedModuleOutputStructure";

export const TARGET_AUDIENCE_ANALYZER_INSTRUCTIONS = `
### الوحدة 9: محلل الجمهور المستهدف (TaskType.TARGET_AUDIENCE_ANALYZER)
**الهدف:** تحديد وتحليل الجمهور المثالي للنص، وتوقعاتهم، وجاذبية العمل لهم.
${ADVANCED_MODULE_OUTPUT_STRUCTURE}
**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
\`\`\`json
{
  "demographicsIdentifier": {
    "primaryTargetAudience": { "ageRange": "الفئة العمرية", "gender": "الجنس", "interests": ["الاهتمامات"] },
    "secondaryTargetAudiences": [{ "description": "وصف جمهور ثانوي محتمل" }],
    "justificationForSelection": "مبررات اختيار هذه الفئات الجماهيرية بناءً على محتوى النص."
  },
  "expectationsAnalyzer": {
    "audienceExpectationsBasedOnGenre": "توقعات الجمهور بناءً على نوع العمل (إذا كان واضحًا).",
    "expectationsFromThemesAndPlot": "التوقعات الناشئة عن الموضوعات والحبكة.",
    "howWellTextMeetsExpectations": "مدى تلبية النص لهذه التوقعات أو تحديها بشكل فعال."
  },
  "attractionAssessor": {
    "keyAttractionFactors": ["عوامل الجذب الرئيسية في النص (قصة، شخصيات، أسلوب، موضوع)"],
    "uniqueSellingPoints": ["نقاط البيع الفريدة التي تميز العمل."],
    "potentialWeaknessesInAppeal": ["نقاط ضعف محتملة في جاذبية العمل لفئات معينة."]
  },
  "sensitiveContentDetectorForAudience": [
    { "elementDescription": "وصف العنصر الحساس", "targetAudienceSegment": "الفئة الجماهيرية التي قد تجده حساسًا", "potentialReaction": "رد الفعل المحتمل", "mitigationSuggestion": "اقتراح للتعامل معه أو تعديله." }
  ],
  "marketabilityAnalyzer": {
    "overallMarketabilityScore": 0.7,
    "marketingAngles": ["زوايا تسويقية محتملة للعمل"],
    "comparisonToSimilarWorksInMarket": "مقارنة بأعمال مشابهة في السوق."
  }
}
\`\`\`
`;

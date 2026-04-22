import { ADVANCED_MODULE_OUTPUT_STRUCTURE } from "../shared/advancedModuleOutputStructure";

export const DIALOGUE_ADVANCED_ANALYZER_INSTRUCTIONS = `
### الوحدة 4: محلل الحوار المتطور (TaskType.DIALOGUE_ADVANCED_ANALYZER)
**الهدف:** تحليل شامل لجودة وفعالية الحوار في النص.
${ADVANCED_MODULE_OUTPUT_STRUCTURE}
**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
\`\`\`json
{
  "distinctiveVoicesAnalyzer": [
    {
      "characterName": "اسم الشخصية",
      "voiceUniquenessScore": 0.8,
      "linguisticMarkers": ["استخدام مفردات معينة", "نمط جمل شائع"],
      "voiceConsistencyEvaluation": "تقييم مدى اتساق صوت الشخصية عبر النص."
    }
  ],
  "subtextDetector": [
    {
      "dialogueSnippet": "مقتطف من الحوار",
      "speaker": "اسم المتحدث",
      "surfaceMeaning": "المعنى الحرفي الظاهري",
      "inferredSubtext": "المعنى الضمني أو المخفي",
      "emotionalUndertones": ["العاطفة 1", "العاطفة 2"],
      "subtextSignificance": "أهمية هذا النص الفرعي في السياق."
    }
  ],
  "naturalismAssessor": {
    "overallNaturalismScore": 0.65,
    "naturalismEvaluation": "تقييم مدى واقعية الحوار بشكل عام، مع ذكر نقاط القوة والضعف.",
    "comparisonToRealSpeechPatterns": "مقارنة بأنماط الكلام الواقعية (إذا أمكن).",
    "clicheDialogueDetector": [
       { "clicheExample": "مثال على حوار مبتذل", "location": "موقع الكليشيه في النص", "suggestion": "اقتراح لتحسينه" }
    ]
  },
  "linguisticRhythmAnalyzer": {
    "overallDialoguePacing": "سريع/بطيء/متنوع",
    "rhythmPatternsObserved": ["أنماط إيقاعية ملحوظة في الحوار"],
    "musicOfSpeechEvaluation": "تقييم الجانب الموسيقي أو الإيقاعي للحوار."
  }
}
\`\`\`
**العملية:** ركز على تحليل الحوار من الزوايا المذكورة، وقدم أمثلة عند الضرورة.
`;

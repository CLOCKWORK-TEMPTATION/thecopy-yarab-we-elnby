import { ADVANCED_MODULE_OUTPUT_STRUCTURE } from "../shared/advancedModuleOutputStructure";

export const RECOMMENDATIONS_GENERATOR_INSTRUCTIONS = `
### الوحدة 11: مولد التوصيات والتحسينات (TaskType.RECOMMENDATIONS_GENERATOR)
**الهدف:** تقديم اقتراحات تحسين مفصلة للنص الدرامي تغطي جوانب مثل البنية، تطوير الشخصيات، تحسين الحوار، وتقديم بدائل إبداعية. يتم ذلك بناءً على تحليل النص (أو نتائج وحدات تحليلية سابقة إذا تم توفيرها).
${ADVANCED_MODULE_OUTPUT_STRUCTURE}
**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
\`\`\`json
{
  "intelligentRecommendationsEngine": {
    "improvementPriorities": ["مجالات التحسين ذات الأولوية (بنية، شخصيات، حوار، إلخ)"],
    "specificTargetedSuggestions": [
      {
        "id": "rec_gen_1",
        "priority": "high",
        "category": "structure",
        "issue": "مشكلة محددة في البنية",
        "solution": "حل مقترح ومفصل",
        "estimatedEffort": "moderate"
      }
    ]
  },
  "structureOptimizerSuggestions": {
    "identifiedWeaknesses": ["نقاط ضعف هيكلية محددة"],
    "structuralAdjustments": ["تعديلات هيكلية مقترحة (إضافة/حذف/نقل مشاهد)"],
    "pacingImprovements": ["اقتراحات لتحسين الإيقاع العام."]
  },
  "characterDeveloperSuggestions": [
    {
      "characterName": "اسم الشخصية",
      "areasForDevelopment": ["جوانب يمكن تطويرها في الشخصية (دوافع، صراعات، قوس تطور)"],
      "specificSuggestions": ["اقتراحات محددة لتعميق الشخصية."]
    }
  ],
  "dialogueEnhancerSuggestions": [
    {
      "dialogueIssue": "مشكلة محددة في الحوار (مثال: حوار غير طبيعي، صوت شخصية غير متسق)",
      "examplesFromText": ["أمثلة من النص توضح المشكلة"],
      "suggestedImprovements": ["اقتراحات لتحسين جودة الحوار."]
    }
  ],
  "creativeAlternativeGenerator": [
    {
      "originalElement": "وصف للعنصر الأصلي في النص (حبكة، شخصية، مشهد)",
      "alternativeScenario": "وصف لسيناريو أو مسار بديل مقترح",
      "potentialImpactOfAlternative": "التأثير المحتمل للبديل على العمل."
    }
  ]
}
\`\`\`
**تعليمات إضافية صارمة:** بناءً على التحليل، يجب عليك تقديم اقتراحات محددة وقابلة للتنفيذ لكل قسم من الأقسام التالية ضمن كائن \`details\`: \`structureOptimizerSuggestions\`، \`characterDeveloperSuggestions\`، \`dialogueEnhancerSuggestions\`، و \`creativeAlternativeGenerator\`. يجب أن تكون هذه الأقسام مليئة بالرؤى العملية.
**ملاحظة هامة:** إذا كان هذا الطلب يهدف إلى تحسين نص بناءً على نتائج تحليل سابقة من وحدات أخرى، يرجى الإشارة إلى ذلك في "المتطلبات الخاصة" للمستخدم، ويفضل أن يتم تزويدك بملخص لتلك النتائج.
`;

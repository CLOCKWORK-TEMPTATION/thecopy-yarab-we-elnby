import { ADVANCED_MODULE_OUTPUT_STRUCTURE } from "../shared/advancedModuleOutputStructure";

export const CHARACTER_DEEP_ANALYZER_INSTRUCTIONS = `
### الوحدة 3: مُحلل الشخصيات العميق (TaskType.CHARACTER_DEEP_ANALYZER)
**الهدف:** إجراء تحليل شامل ومتعمق للشخصيات في النص الدرامي.
${ADVANCED_MODULE_OUTPUT_STRUCTURE}
**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
\`\`\`json
{
  "intelligentCharacterExtractor": {
    "identifiedCharacters": [
      { "name": "اسم الشخصية", "classification": "رئيسية/ثانوية/هامشية", "initialImpression": "الانطباع الأولي عن الشخصية عند ظهورها." }
    ],
    "notesOnExtraction": "ملاحظات حول عملية استخلاص الشخصيات وتصنيفها."
  },
  "characterArcAnalyzer": [
    {
      "characterName": "اسم الشخصية",
      "arcType": "نوع القوس (تطور إيجابي، سلبي، ثابت، دائري، إلخ)",
      "initialStateSummary": "وصف الحالة الأولية للشخصية.",
      "keyTransformationPoints": ["وصف نقطة تحول رئيسية 1", "وصف نقطة تحول رئيسية 2"],
      "finalStateSummary": "وصف الحالة النهائية للشخصية أو حالتها عند نهاية التحليل.",
      "growthMetrics": { "clarityOfMotivation": 0.8, "consistencyOfActions": 0.7, "impactOfConflict": "مرتفع" }
    }
  ],
  "relationshipDetector": {
    "nodes": [{ "id": "اسم الشخصية", "label": "اسم الشخصية", "group": "رئيسية/ثانوية" }],
    "edges": [{ "from": "اسم الشخصية 1", "to": "اسم الشخصية 2", "label": "نوع العلاقة (صداقة، عداوة، حب)" , "dynamics": "وصف تطور العلاقة"}],
    "relationshipNetworkSummary": "ملخص لأهم العلاقات وتأثيرها على الحبكة."
  },
  "psychologicalDepthAssessor": [
    {
      "characterName": "اسم الشخصية",
      "motivations": ["الدافع الأول", "الدافع الثاني"],
      "internalConflicts": ["وصف الصراع الداخلي الأول"],
      "psychologicalComplexityScore": 0.75,
      "depthEvaluationNotes": "تقييم عمق الشخصية النفسي ومصداقيتها."
    }
  ],
  "uniquenessAnalyzer": [
    {
      "characterName": "اسم الشخصية",
      "distinctiveTraits": ["سمة مميزة 1", "سمة مميزة 2"],
      "comparisonToArchetypes": "مدى تطابقها أو اختلافها عن النماذج الشائعة.",
      "uniquenessScore": 0.6,
      "originalityNotes": "ملاحظات حول مدى تفرد الشخصية وإبداعها."
    }
  ]
}
\`\`\`
**العملية:** قم بتطبيق التحليلات المذكورة لكل شخصية رئيسية على الأقل.
`;

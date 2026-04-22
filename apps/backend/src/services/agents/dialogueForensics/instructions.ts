export const DIALOGUE_FORENSICS_INSTRUCTIONS = `### مهمة تحليل الحوار الجنائي (TaskType.DIALOGUE_FORENSICS)
**الهدف:** تحليل خصائص الحوار لكل شخصية.
**المخرجات المطلوبة (JSON - واجهة \`CharacterAnalysis\` لكل شخصية رئيسية، مع التركيز على \`dialogueAnalysis\`):**
\`\`\`json
{
  "name": "اسم الشخصية",
  "content": "ملخص لخصائص حوار الشخصية.",
  "dialogueAnalysis": {
    "voiceConsistency": 0.9,
    "vocabularyProfile": { "commonWords": ["كلمة1", "كلمة2"], "complexity": "متوسط" },
    "speechPatterns": ["يميل لاستخدام جمل قصيرة"],
    "emotionalRange": [{ "emotion": "غضب", "intensity": 0.7 }]
  }
}
\`\`\`
`;

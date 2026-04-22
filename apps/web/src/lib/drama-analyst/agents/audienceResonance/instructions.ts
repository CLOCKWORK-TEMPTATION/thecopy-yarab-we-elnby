export const AUDIENCE_RESONANCE_INSTRUCTIONS = `### مهمة محلل صدى الجمهور (TaskType.AUDIENCE_RESONANCE)
**الهدف:** تحليل كيف يمكن أن يتفاعل الجمهور مع النص أو الجزء المكتمل.
**المخرجات المطلوبة (JSON - واجهة \`AudienceResonanceAnalysis\`):**
\`\`\`json
{
  "content": "ملخص لتوقعات صدى الجمهور.",
  "predictedResponse": { "emotionalImpact": [{ "x": 0, "y": 0.2, "label": "اهتمام أولي" }], "engagementLevel": 0.75 },
  "segmentAnalysis": { "demographics": [{ "segment": "الشباب", "response": "إيجابي" }] },
  "riskOpportunity": { "potentialControversies": ["عنصر قد يكون مثيرا لجدل"] }
}
\`\`\`
`;

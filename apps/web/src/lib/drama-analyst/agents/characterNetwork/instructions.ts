export const CHARACTER_NETWORK_INSTRUCTIONS = `### مهمة تحليل شبكة الشخصيات (TaskType.CHARACTER_NETWORK)
**الهدف:** تحليل العلاقات بين الشخصيات وتأثيرها.
**المخرجات المطلوبة (JSON - واجهة \`EnhancedAnalysisResult\` مع التركيز على \`visualizations.characterNetwork\`):**
\`\`\`json
{
  "title": "تحليل شبكة الشخصيات لـ [اسم العمل]",
  "content": "وصف للعلاقات الرئيسية وديناميكياتها وتأثيرها على الحبكة.",
  "visualizations": {
    "characterNetwork": {
      "nodes": [{ "id": "شخصية1", "label": "شخصية1" }, { "id": "شخصية2", "label": "شخصية2" }],
      "edges": [{ "from": "شخصية1", "to": "شخصية2", "label": "صداقة/عداوة/حب" }],
      "description": "تفسير للشبكة المعروضة وأهميتها."
    }
  }
}
\`\`\`
`;

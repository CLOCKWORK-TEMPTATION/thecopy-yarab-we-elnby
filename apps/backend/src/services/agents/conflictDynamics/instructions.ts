export const CONFLICT_DYNAMICS_INSTRUCTIONS = `### مهمة ديناميكيات الصراع (TaskType.CONFLICT_DYNAMICS)
**الهدف:** تحليل تطور الصراعات وأنواعها.
**المخرجات المطلوبة (JSON - واجهة \`EnhancedAnalysisResult\` مع التركيز على \`metrics\` و \`visualizations.conflictMatrix\` إذا أمكن):**
\`\`\`json
{
  "title": "تحليل ديناميكيات الصراع في [اسم العمل]",
  "content": "وصف لأنواع الصراعات الرئيسية، تطورها، ونقاط التحول.",
  "metrics": { "conflictIntensity": 0.8 },
  "recommendations": [{ "id": "conflict_rec1", "category": "conflict", "issue": "صراع غير مقنع", "solution": "تعميق دوافع الشخصيات" }]
}
\`\`\`
`;

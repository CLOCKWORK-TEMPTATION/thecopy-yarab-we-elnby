export const CORE_ANALYSIS_INSTRUCTIONS = `
### مهمة التحليل النقدي (TaskType.ANALYSIS)
**الهدف:** تقديم تحليل نقدي معمق للنص.
**المخرجات المطلوبة (JSON - واجهة \`EnhancedAnalysisResult\`):**
\`\`\`json
{
  "title": "تحليل نقدي لـ [اسم العمل]",
  "content": "ملخص شامل للتحليل يغطي نقاط القوة والضعف الرئيسية، البنية، الشخصيات، والموضوعات...",
  "metrics": {
    "dramaticTension": 0.75,
    "paceIndex": 0.6,
    "dialogueEfficiency": 0.8,
    "structuralIntegrity": 0.7,
    "characterDepth": 0.85,
    "thematicResonance": 0.9
  },
  "visualizations": {
    "tensionCurve": [{ "x": "الفصل الأول", "y": 0.5 }, { "x": "ذروة الفصل الثاني", "y": 0.9 }],
    "characterNetwork": {
      "nodes": [{ "id": "الشخصية أ", "label": "الشخصية أ" }],
      "edges": [{ "from": "الشخصية أ", "to": "الشخصية ب", "label": "صراع" }],
      "description": "شبكة تظهر العلاقات الرئيسية بين الشخصيات."
    }
  },
  "recommendations": [
    {
      "id": "rec1",
      "priority": "high",
      "category": "character",
      "issue": "دافع الشخصية 'س' غير واضح.",
      "solution": "إضافة مشهد يوضح خلفية دافع الشخصية 'س'."
    }
  ]
}
\`\`\`
**العملية:** طبق "المحطات السبع للتحليل الدرامي". قم بتضمين قياسات كمية، توصيات ذكية، ووصف لتصورات بيانية ممكنة.
`;

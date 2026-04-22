export const PLOT_PREDICTOR_INSTRUCTIONS = `### مهمة متنبئ مسار الحبكة (TaskType.PLOT_PREDICTOR)
**الهدف:** التنبؤ بالتطورات المحتملة للحبكة ضمن "نطاق الاستكمال المطلوب".
**المخرجات المطلوبة (JSON - واجهة \`PlotPredictorResult\`):**
\`\`\`json
{
  "content": "تحليل للياق الحالي وتوقعات التطورات المستقبلية ضمن النطاق المحدد.",
  "currentTrajectory": [{ "point": "الحدث الحالي 1", "description": "وصف موجز" }],
  "predictions": {
    "likelyDevelopments": [{ "scenario": "تطور محتمل 1", "probability": 0.7 }],
    "alternativePaths": [{ "path": "مسار بديل 1", "innovationScore": 0.5 }]
  },
  "recommendations": {
    "optimalPath": "المسار الموصى به",
    "avoidPitfalls": ["مأزق محتمل لتجنبه"]
  }
}
\`\`\`
`;

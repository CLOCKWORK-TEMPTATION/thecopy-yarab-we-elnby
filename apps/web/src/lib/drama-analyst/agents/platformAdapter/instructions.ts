export const PLATFORM_ADAPTER_INSTRUCTIONS = `### مهمة محول المنصات (TaskType.PLATFORM_ADAPTER)
**الهدف:** اقتراح تعديلات لتكييف النص أو الجزء المكتمل مع منصة عرض مختلفة (سينما، تلفزيون، إلخ).
**المخرجات المطلوبة (JSON - واجهة \`PlatformAdapterResult\`):**
\`\`\`json
{
  "platform": "tv_series",
  "content": "ملخص للتعديلات المقترحة لتناسب منصة [المنصة المحددة].",
  "adaptations": {
    "structural": { "modifications": ["تقسيم إلى حلقات"] },
    "pacing": { "cliffhangers": ["نقطة تشويق مقترحة لنهاية حلقة"] }
  },
  "platformSpecificFeatures": { "episodicStructure": [{ "episode": 1, "summary": "ملخص الحلقة الأولى" }] }
}
\`\`\`
**تعليمات إضافية:** يرجى تحديد المنصة المستهدفة في "المتطلبات الخاصة".
`;

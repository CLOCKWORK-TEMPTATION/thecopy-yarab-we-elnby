import { ADVANCED_MODULE_OUTPUT_STRUCTURE } from "../shared/advancedModuleOutputStructure";

export const PRODUCIBILITY_ANALYZER_INSTRUCTIONS = `
### الوحدة 8: محلل القابلية للإنتاج (TaskType.PRODUCIBILITY_ANALYZER)
**الهدف:** تقييم الجوانب العملية لإنتاج النص (ميزانية تقديرية، متطلبات فنية، تحديات).
${ADVANCED_MODULE_OUTPUT_STRUCTURE}
**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
\`\`\`json
{
  "smartBudgetEstimator": {
    "estimatedBudgetRange": "تقدير نطاق الميزانية (مثال: منخفض، متوسط، مرتفع، أو أرقام تقديرية إن أمكن)",
    "keyCostDrivers": ["العوامل الرئيسية المؤثرة في التكلفة (مثل عدد المواقع، المؤثرات الخاصة، عدد الشخصيات)"],
    "costOptimizationSuggestions": ["اقتراحات لتقليل التكاليف المحتملة."]
  },
  "technicalRequirementsAnalyzer": {
    "visualEffectsNeeds": ["الحاجة إلى مؤثرات بصرية ونوعها"],
    "soundAndMusicNeeds": ["متطلبات الصوت والموسيقى"],
    "specialEquipment": ["أي معدات خاصة قد تكون مطلوبة"],
    "crewExpertise": ["الخبرات المطلوبة في طاقم العمل"]
  },
  "shootingDifficultyAssessor": [
    { "sceneOrElement": "وصف المشهد أو العنصر", "difficultyRating": "تقدير الصعوبة (سهل، متوسط، صعب)", "reasonsForDifficulty": ["أسباب الصعوبة (لوجستيات، تقنيات معقدة)"], "mitigationStrategies": ["استراتيجيات مقترحة لتجاوز الصعوبات"] }
  ],
  "locationAnalyzer": {
    "numberOfUniqueLocations": "العدد التقريبي للمواقع الفريدة المطلوبة",
    "locationTypes": ["أنواع المواقع (داخلي، خارجي، استوديو)"],
    "specificLocationChallenges": ["تحديات متعلقة بمواقع معينة مذكورة في النص."]
  },
  "schedulingPlanner": {
    "estimatedProductionTime": "تقدير لوقت الإنتاج الإجمالي (أيام، أسابيع)",
    "factorsAffectingSchedule": ["العوامل التي قد تؤثر على الجدول الزمني"],
    "potentialSchedulingBlocks": ["أقسام رئيسية للجدول الزمني (مثال: تصوير خارجي، تصوير داخلي)."]
  }
}
\`\`\`
`;

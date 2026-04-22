import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const DIALOGUE_FORENSICS_INSTRUCTIONS = `
**العملية:** طبق "نموذج التحليل القضائي للحوار".

\`\`\`json
{
  "title": "تحليل قضائي للحوار في [اسم العمل]",
  "summary": "تحليل شامل لجودة وفعالية الحوارات في العمل الدرامي.",
  "details": {
    "dialogueAnalysis": {
      "authenticityScore": 0.85,
      "distinctiveness": 0.78,
      "subtextDepth": 0.92,
      "rhythmAnalysis": {
        "pace": "متوسط",
        "variation": "جيدة"
      }
    },
    "characterVoiceProfiles": [
      {
        "character": "اسم الشخصية",
        "distinctivenessScore": 0.8,
        "verbalPatterns": ["نمط لغوي مميز"],
        "speechMarkers": ["علامات كلام مميزة"]
      }
    ],
    "recommendations": [
      {
        "id": "dialogue_rec1",
        "category": "dialogue",
        "issue": "حوار غير طبيعي لشخصية معينة",
        "solution": "مراجعة وتحسين نمط كلام الشخصية"
      }
    ]
  }
}
\`\`\`
`;
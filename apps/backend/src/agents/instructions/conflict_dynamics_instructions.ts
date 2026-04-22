import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const CONFLICT_DYNAMICS_INSTRUCTIONS = `
**العملية:** طبق "نموذج تحليل الصراعات المتعددة الطبقات".

\`\`\`json
{
  "title": "تحليل ديناميكيات الصراع لـ [اسم العمل]",
  "summary": "تحليل شامل لمستوى الصراعات في العمل الدرامي.",
  "details": {
    "conflictAnalysis": {
      "internalConflicts": [
        {
          "character": "اسم الشخصية",
          "type": "نوع الصراع الداخلي",
          "intensity": 0.8,
          "description": "وصف الصراع الداخلي"
        }
      ],
      "externalConflicts": [
        {
          "type": "نوع الصراع الخارجي",
          "parties": ["الطرف الأول", "الطرف الثاني"],
          "intensity": 0.9,
          "description": "وصف الصراع الخارجي"
        }
      ]
    },
    "metrics": { 
      "conflictIntensity": 0.8 
    },
    "recommendations": [
      { 
        "id": "conflict_rec1", 
        "category": "conflict", 
        "issue": "صراع غير مقنع", 
        "solution": "تعميق دوافع الشخصيات" 
      }
    ]
  }
}
\`\`\`
`;
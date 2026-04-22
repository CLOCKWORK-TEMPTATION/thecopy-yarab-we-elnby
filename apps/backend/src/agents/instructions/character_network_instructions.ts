import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const CHARACTER_NETWORK_INSTRUCTIONS = `
**العملية:** طبق "نموذج تحليل الشبكة الدرامية المتقدمة".

\`\`\`json
{
  "title": "تحليل شبكة الشخصيات لـ [اسم العمل]",
  "summary": "تحليل شامل للعلاقات والتفاعلات بين الشخصيات في العمل الدرامي.",
  "details": {
    "characterNetwork": {
      "nodes": [
        {
          "id": "char_1",
          "name": "اسم الشخصية",
          "role": "دور الشخصية",
          "centrality": 0.85
        }
      ],
      "edges": [
        {
          "source": "char_1",
          "target": "char_2",
          "relationship": "نوع العلاقة",
          "strength": 0.7
        }
      ]
    },
    "keyInsights": [
      {
        "id": "insight_1",
        "description": "رؤية مهمة حول شبكة الشخصيات"
      }
    ],
    "recommendations": [
      {
        "id": "network_rec1",
        "category": "character",
        "issue": "علاقة غير واضحة بين شخصيتين",
        "solution": "توضيح طبيعة العلاقة من خلال مشهد إضافي"
      }
    ]
  }
}
\`\`\`
`;
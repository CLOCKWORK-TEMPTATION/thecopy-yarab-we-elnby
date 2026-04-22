import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const CREATIVE_INSTRUCTIONS = `
**العملية:** طبق "المراحل الثلاث للإبداع المحاكي".

\`\`\`json
{
  "title": "اقتراحات إبداعية لـ [اسم العمل]",
  "summary": "مجموعة من الاقتراحات الإبداعية لتحسين العمل الدرامي.",
  "details": {
    "creativeIdeas": [
      {
        "id": "idea_1",
        "type": "مشهد جديد",
        "description": "وصف لمشهد مقترح جديد",
        "justification": "سبب إضافة هذا المشهد"
      }
    ]
  },
  "recommendations": [
    {
      "id": "rec_creative_1",
      "priority": "medium",
      "category": "creative",
      "issue": "فرصة للتطوير الإبداعي",
      "solution": "اقتراح محدد للتحسين"
    }
  ]
}
\`\`\`
`;
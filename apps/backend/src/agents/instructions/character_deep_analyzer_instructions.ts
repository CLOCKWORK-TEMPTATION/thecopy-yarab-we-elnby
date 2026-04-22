import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const CHARACTER_DEEP_ANALYZER_INSTRUCTIONS = `
**العملية:** طبق "نموذج التحليل النفسي العميق للشخصيات".

**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
- \`psychologicalProfile\`: تحليل شامل للسمات النفسية للشخصية
- \`unconsciousMotivations\`: دوافع لاواعية محتملة
- \`defenseMechanisms\`: آليات الدفاع النفسية المستخدمة
- \`psychologicalArchetypes\`: النماذج الأصلية من علم النفس اليونغي
- \`developmentalTrajectory\`: مسار التطور النفسي عبر السرد
`;

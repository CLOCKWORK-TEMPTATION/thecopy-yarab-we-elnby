import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const THEMATIC_MINING_INSTRUCTIONS = `
**العملية:** طبق "نموذج التنقيب عن الموضوعات المتقدم".

**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
- \`coreThemes\`: الموضوعات الرئيسية في العمل
- \`thematicEvolution\`: تطور الموضوعات عبر السرد
- \`symbolSystem\`: نظام الرموز والمسميات
- \`philosophicalUnderpinnings\`: الأسس الفلسفية للموضوعات
- \`culturalContext\`: السياق الثقافي للموضوعات
`;
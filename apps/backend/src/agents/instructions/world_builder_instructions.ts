import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const WORLD_BUILDER_INSTRUCTIONS = `
**العملية:** طبق "نموذج بناء العالم الدرامي المتقدم".

**تفاصيل حقل \`details\` المطلوبة لهذه الوحدة:**
- \`content\`: وصف للعناصر الجديدة أو الموسعة في العالم الدرامي
- \`physicalWorld\`: العالم المادي والإعدادات
- \`worldRules\`: قواعد وقوانين العالم
- \`worldContext\`: السياق التاريخي والثقافي للعالم
`;
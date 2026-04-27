import { ADVANCED_AGENTS } from "./advanced-agents";
import { ANALYSIS_AGENTS } from "./analysis-agents";
import { CORE_AGENTS } from "./core-agents";
import { CREATIVE_AGENTS } from "./creative-agents";
import { PREDICTIVE_AGENTS } from "./predictive-agents";

import type { BrainstormAgentDefinition } from "./types";

/**
 * سجل الوكلاء الحقيقيين مع بياناتهم الكاملة
 * يجمع كل الفئات في مصفوفة واحدة مجمّدة بنفس ترتيب النسخة الأصلية:
 * core → analysis → creative → predictive → advanced
 */
export const REAL_AGENTS: readonly BrainstormAgentDefinition[] = Object.freeze([
  ...CORE_AGENTS,
  ...ANALYSIS_AGENTS,
  ...CREATIVE_AGENTS,
  ...PREDICTIVE_AGENTS,
  ...ADVANCED_AGENTS,
]);

export {
  CORE_AGENTS,
  ANALYSIS_AGENTS,
  CREATIVE_AGENTS,
  PREDICTIVE_AGENTS,
  ADVANCED_AGENTS,
};

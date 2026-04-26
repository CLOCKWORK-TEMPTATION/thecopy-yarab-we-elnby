import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
} from "../shared/standardAgentPattern";

import { CHARACTER_DEEP_ANALYZER_AGENT_CONFIG } from "./agent";

/**
 * CharacterDeepAnalyzerAgent - وكيل التحليل العميق للشخصيات
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * يحلل الشخصيات بعمق: الدوافع، الصراعات، التطور النفسي، والأقواس السردية.
 */
export class CharacterDeepAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "CharacterDeepAnalyzer AI",
      TaskType.CHARACTER_DEEP_ANALYZER,
      CHARACTER_DEEP_ANALYZER_AGENT_CONFIG.systemPrompt || ""
    );

    this.confidenceFloor = 0.75;
  }

  /**
   * بناء الـ prompt من المدخلات
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: userInput, context } = input;

    // Extract character context
    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const typedCtx = contextObj;
    const characterName = (typedCtx?.['characterName'] as string) || "الشخصية المستهدفة";
    const previousAnalysis = typedCtx?.['previousAnalysis'] as string | undefined;

    let prompt = `## مهمة التحليل العميق للشخصية: ${characterName}

${userInput}

`;

    // Add previous analysis context if available
    if (previousAnalysis) {
      prompt += `### سياق التحليل السابق:
${previousAnalysis.substring(0, 1000)}

`;
    }

    prompt += `
## محاور التحليل المطلوبة:

1. **التحليل النفسي والدوافع**:
   - ما هي الدوافع الظاهرة والمخفية للشخصية؟
   - تحليل العقد النفسية والجروح القديمة (The Ghost).
   - المخاوف والرغبات الأساسية.

2. **قوس التطور (Character Arc)**:
   - تحديد نوع القوس (إيجابي، سلبي، ثابت).
   - لحظات التغيير الكبرى.
   - نقطة التحول والمواجهة النهائية.

3. **الصراعات**:
   - الصراع الداخلي (مع الذات).
   - الصراع الخارجي (مع الآخرين/المجتمع).
   - كيف تؤثر هذه الصراعات على القرارات؟

4. **العلاقات والديناميكيات**:
   - دور الشخصية في شبكة العلاقات.
   - التحالفات والعداوات وتأثيرها.

## التنسيق المطلوب:

قدم تحليلاً عميقاً ومركزاً كنص سردي منظم.
تجنب السرد السطحي وركز على "لماذا" تتصرف الشخصية بهذه الطريقة.
لا تستخدم JSON.
`;

    return prompt;
  }

  /**
   * استجابة احتياطية
   */
  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `# تحليل شخصية (احتياطي)

نواجه صعوبة في إجراء التحليل العميق الكامل حالياً. إليك ملاحظات أولية:

1. **الدوافع**: تحتاج إلى استكشاف أعمق لربط الأفعال بالأسباب الجذرية.
2. **الصراع**: يبدو أن هناك صراعاً داخلياً يحتاج لتمييزه بوضوح عن الصراعات الخارجية.
3. **التوصية**: أعد المحاولة مع توفير تفاصيل أكثر عن ماضي الشخصية (Backstory).`;
  }
}

// Export singleton instance
export const characterDeepAnalyzerAgent = new CharacterDeepAnalyzerAgent();

import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";

import { DIALOGUE_ADVANCED_ANALYZER_AGENT_CONFIG } from "./agent";

/**
 * DialogueAdvancedAnalyzerAgent - وكيل التحليل المتقدم للحوار
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * يحلل الحوار بعمق: الطبقات النصية (Subtext)، الديناميكيات، التوتر، والوظائف الدرامية.
 */
export class DialogueAdvancedAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "DialogueDeepScan AI",
      TaskType.DIALOGUE_ADVANCED_ANALYZER,
      DIALOGUE_ADVANCED_ANALYZER_AGENT_CONFIG.systemPrompt ?? ""
    );

    this.confidenceFloor = 0.75;
  }

  /**
   * بناء الـ prompt من المدخلات
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: userInput, context } = input;

    // Extract dialogue context
    const contextObj: Record<string, unknown> =
      typeof context === "object" && context !== null ? context : {};
    const rawDialogueContext = contextObj["dialogueContext"];
    const dialogueContext =
      typeof rawDialogueContext === "string" ? rawDialogueContext : "مشهد عام";

    const prompt = `## مهمة التحليل المتقدم للحوار

### سياق الحوار:
${dialogueContext}

### الحوار المراد تحليله:
${userInput}

### محاور التحليل المطلوبة:

1. **النص الضمني (Subtext)**:
   - ماذا تقول الشخصيات حقاً خلف الكلمات؟
   - ما هي الأسرار أو المشاعر المخفية في كل سطر؟

2. **ديناميكيات القوة (Power Dynamics)**:
   - من يسيطر على المشهد في البداية؟
   - كيف تنتقل السلطة خلال الحوار (Beats)؟
   - من يسيطر في النهاية؟

3. **الوظيفة الدرامية**:
   - هل يدفع الحوار القصة للأمام؟
   - هل يكشف عن الشخصيات؟
   - هل يزيد من التوتر؟

4. **التميز الصوتي (Voice Distinctiveness)**:
   - هل لكل شخصية صوت فريد؟
   - هل يعكس الحوار الخلفية والحالة النفسية لكل متحدث؟

## التنسيق المطلوب:

قدم تحليلاً نقدياً مفصلاً.
استخدم مصطلحات درامية دقيقة (Beats, Subtext, Exposition).
لا تستخدم JSON.
`;

    return prompt;
  }

  /**
   * استجابة احتياطية
   */
  protected override getFallbackResponse(_input: StandardAgentInput): string {
    return `# تحليل حوار (احتياطي)

تحليل أولي للحوار:

1. **التدفق**: يبدو طبيعياً ولكن يحتاج لمزيد من التوتر.
2. **النص الضمني**: الحوار مباشر جداً (On the nose)، حاول إضافة المزيد من المعاني المبطنة.
3. **التوصية**: ركز على رغبات الشخصيات في المشهد، ماذا يريد كل منهم من الآخر؟`;
  }
}

// Export singleton instance
export const dialogueAdvancedAnalyzerAgent =
  new DialogueAdvancedAnalyzerAgent();

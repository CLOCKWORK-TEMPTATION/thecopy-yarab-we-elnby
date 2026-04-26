import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

/**
 * PlotPredictorAgent - وكيل التنبؤ بالحبكة
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * يتنبأ بالتطورات المحتملة للحبكة بناءً على السياق السردي
 */
export class PlotPredictorAgent extends BaseAgent {
  constructor() {
    super(
      "PlotPredictorAgent",
      TaskType.PLOT_PREDICTOR,
      `أنت NarrativeOracle AI، وكيل متطور للتنبؤ بالحبكة. مهمتك الأساسية هي تحليل سياق سردي معين (الحبكة، الشخصيات، الثيمات) والتنبؤ بالتطورات المحتملة للحبكة في المستقبل.

يجب عليك:
- استخدام نماذج التحليل السردي المتقدمة لاستكشاف مجموعة واسعة من المسارات المحتملة
- تقديم درجة احتمالية ودرجة إبداعية لكل مسار متوقع
- الاستناد إلى قاعدة بيانات الأنماط السردية وخوارزميات التعلم التسلسلي
- عرض المسارات البديلة بوضوح مع شرح المنطق وراء كل تنبؤ
- تزويد الكتاب والمبدعين ببصيرة ثاقبة ومبتكرة ومبنية على البيانات

مخرجاتك يجب أن تكون نصية فقط، واضحة ومباشرة بدون أي JSON أو كتل كود.`
    );

    this.confidenceFloor = 0.78;
  }

  /**
   * بناء الـ prompt من المدخلات
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: userInput, context } = input;

    let prompt = `## مهمة التنبؤ بالحبكة

${userInput}

`;

    // إضافة السياق من المحطات السابقة
    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const previousStations = (contextObj as any)?.previousStations;
    if (previousStations) {
      prompt += `## السياق من المحطات السابقة:\n`;

      if (previousStations.analysis) {
        prompt += `\n### التحليل الأولي:\n${previousStations.analysis}\n`;
      }

      if (previousStations.characterAnalysis) {
        prompt += `\n### تحليل الشخصيات:\n${previousStations.characterAnalysis}\n`;
      }

      if (previousStations.thematicAnalysis) {
        prompt += `\n### التحليل الموضوعي:\n${previousStations.thematicAnalysis}\n`;
      }
    }

    prompt += `

## متطلبات التنبؤ:

1. **تحليل الوضع الحالي**: افحص نقاط الحبكة القائمة والصراعات والشخصيات
2. **استكشاف المسارات**: حدد 3-5 تطورات محتملة للحبكة
3. **تقييم الاحتمالية**: قيّم احتمالية كل مسار (عالي/متوسط/منخفض)
4. **تقييم الإبداع**: قيّم مستوى الإبداع والأصالة لكل مسار
5. **التبرير**: قدم شرحاً منطقياً لكل تنبؤ بناءً على الأنماط السردية

## التنسيق المطلوب:

اكتب تنبؤاتك في نص واضح ومنظم:
- استخدم العناوين والفقرات لتنظيم المسارات المختلفة
- اذكر احتمالية ومستوى إبداع كل مسار بوضوح
- قدم تبريراً مفصلاً لكل تنبؤ
- تجنب تماماً أي JSON أو كتل كود

قدم تنبؤات عميقة ومبنية على الأنماط السردية المعروفة، مع إبراز الإمكانات الإبداعية.`;

    return prompt;
  }

  /**
   * معالجة ما بعد التنفيذ - تنظيف المخرجات من JSON
   */
  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    let cleanedText = output.text;

    // إزالة أي كتل JSON
    cleanedText = cleanedText.replace(/```json\s*\n[\s\S]*?\n```/g, "");
    cleanedText = cleanedText.replace(/```\s*\n[\s\S]*?\n```/g, "");

    // إزالة أي JSON objects ظاهرة
    cleanedText = cleanedText.replace(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/g, "");

    // تنظيف المسافات الزائدة
    cleanedText = cleanedText.replace(/\n{3,}/g, "\n\n").trim();

    // إضافة ملاحظة حول جودة التنبؤات
    const enhancedNotes: string[] = [...(output.notes || [])];

    if (output.confidence >= 0.85) {
      enhancedNotes.push("تنبؤات عالية الثقة مبنية على أنماط سردية قوية");
    } else if (output.confidence >= 0.7) {
      enhancedNotes.push("تنبؤات متوسطة الثقة تتطلب مراجعة إبداعية");
    } else {
      enhancedNotes.push("تنبؤات استكشافية تحتاج تحقق إضافي");
    }

    return {
      ...output,
      text: cleanedText,
      notes: enhancedNotes,
    };
  }

  /**
   * استجابة احتياطية في حالة الفشل
   */
  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `# تنبؤات الحبكة - وضع الطوارئ

بناءً على السياق المتاح، إليك تنبؤات أولية للحبكة:

## المسار المحتمل 1: التطور الطبيعي
الاحتمالية: متوسطة
الإبداع: متوسط

تستمر الأحداث في مسارها الحالي مع تصاعد تدريجي للصراع. الشخصيات تواجه عقبات متزايدة تدفعها نحو لحظات حاسمة.

## المسار المحتمل 2: المفاجأة الدرامية
الاحتمالية: متوسطة إلى منخفضة
الإبداع: عالي

تحدث نقطة تحول غير متوقعة تغير اتجاه السرد بالكامل، مما يخلق فرصاً لتطورات شخصية عميقة ومواقف درامية جديدة.

## التوصيات:
- استكشاف دوافع الشخصيات بعمق أكبر
- بناء التوتر تدريجياً نحو الذروة
- الحفاظ على التماسك المنطقي للأحداث

ملاحظة: هذه تنبؤات أولية. يُنصح بإعادة التحليل مع سياق إضافي للحصول على رؤى أعمق.`;
  }
}

// Export singleton instance
export const plotPredictorAgent = new PlotPredictorAgent();

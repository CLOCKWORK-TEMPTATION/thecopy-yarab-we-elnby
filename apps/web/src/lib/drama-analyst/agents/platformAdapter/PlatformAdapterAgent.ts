import { TaskType } from "../../enums";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { PLATFORM_ADAPTER_AGENT_CONFIG } from "./agent";

/**
 * PlatformAdapterAgent - وكيل التحويل الإعلامي المتعدد (MediaTransmorph AI)
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * يحول المحتوى ليناسب متطلبات المنصات المختلفة (تويتر، إنستغرام، يوتيوب، إلخ)
 */
export class PlatformAdapterAgent extends BaseAgent {
  constructor() {
    super(
      "MediaTransmorph AI",
      TaskType.PLATFORM_ADAPTER,
      PLATFORM_ADAPTER_AGENT_CONFIG.systemPrompt || ""
    );

    this.confidenceFloor = 0.78;
  }

  /**
   * بناء الـ prompt من المدخلات
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: userInput, context } = input;

    // Extract platform-specific context
    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const targetPlatform = (contextObj as any)?.targetPlatform || "غير محدد";
    const sourceContent = (contextObj as any)?.sourceContent || userInput;
    const constraints = (contextObj as any)?.constraints || {};

    let prompt = `## مهمة تحويل المحتوى للمنصة

${userInput}

`;

    // Add source content if provided separately
    if (sourceContent !== userInput) {
      prompt += `### المحتوى المصدر:
${sourceContent.substring(0, 2000)}

`;
    }

    // Add target platform information
    prompt += `### المنصة المستهدفة: ${targetPlatform}

`;

    // Add platform-specific constraints
    if (Object.keys(constraints).length > 0) {
      prompt += `### قيود المنصة:\n`;
      if (constraints.characterLimit) {
        prompt += `- حد الأحرف: ${constraints.characterLimit}\n`;
      }
      if (constraints.videoLength) {
        prompt += `- طول الفيديو: ${constraints.videoLength}\n`;
      }
      if (constraints.imageSpecs) {
        prompt += `- مواصفات الصور: ${constraints.imageSpecs}\n`;
      }
      if (constraints.hashtagCount) {
        prompt += `- عدد الهاشتاغات: ${constraints.hashtagCount}\n`;
      }
      prompt += `\n`;
    }

    // Add context from previous stations if available
    const previousStations = (contextObj as any)?.previousStations;
    if (previousStations) {
      prompt += `### السياق من المحطات السابقة:\n`;

      if (previousStations.analysis) {
        prompt += `\n**التحليل الأولي:**\n${previousStations.analysis.substring(0, 500)}\n`;
      }

      if (previousStations.targetAudience) {
        prompt += `\n**الجمهور المستهدف:**\n${previousStations.targetAudience.substring(0, 300)}\n`;
      }
    }

    prompt += `

## متطلبات التحويل:

1. **تحليل المنصة المستهدفة**:
   - حدد الخصائص الرئيسية للمنصة
   - افهم أعراف وتوقعات الجمهور على هذه المنصة
   - احترم جميع القيود التقنية

2. **تفكيك المحتوى المصدر**:
   - استخرج الرسالة الأساسية والمعلومات الرئيسية
   - حدد النبرة والأسلوب
   - حدد العناصر متعددة الوسائط

3. **إعادة البناء الاستراتيجي**:
   - حافظ على جوهر الرسالة الأصلية
   - اضبط النبرة والأسلوب ليتناسب مع المنصة
   - أعد هيكلة المحتوى ليناسب نمط الاستهلاك على المنصة
   - التزم بجميع القيود التقنية

4. **التأكد من الأصالة**:
   - يجب أن يبدو المحتوى أصيلاً ومخصصاً للمنصة
   - ليس مجرد نسخ لصق معاد تنسيقه

## التنسيق المطلوب:

قدم المحتوى المحول في نص واضح ومنظم:
- اذكر المنصة المستهدفة
- قدم المحتوى المحول مباشرة
- أضف أي توصيات أو ملاحظات
- تجنب تماماً أي JSON أو كتل كود

قدم تحويلاً احترافياً يحافظ على الرسالة الأساسية ويتناسب تماماً مع المنصة المستهدفة.`;

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

    // إضافة ملاحظة حول جودة التحويل
    const enhancedNotes: string[] = [...(output.notes || [])];

    if (output.confidence >= 0.85) {
      enhancedNotes.push("تحويل عالي الجودة - مُحسّن للمنصة المستهدفة");
    } else if (output.confidence >= 0.7) {
      enhancedNotes.push("تحويل جيد - يحتاج مراجعة بسيطة");
    } else {
      enhancedNotes.push("تحويل أولي - يُنصح بالمراجعة والتحسين");
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
    input: StandardAgentInput
  ): Promise<string> {
    const contextObj =
      typeof input.context === "object" && input.context !== null
        ? input.context
        : {};
    const targetPlatform =
      (contextObj as any)?.targetPlatform || "المنصة المستهدفة";

    return `# تحويل المحتوى - وضع الطوارئ

## المنصة المستهدفة: ${targetPlatform}

**ملاحظة**: حدث خطأ في التحويل الكامل. إليك إرشادات عامة:

### توصيات التحويل:
1. **للمنصات الاجتماعية القصيرة** (تويتر، إنستغرام):
   - اختصر الرسالة الأساسية في نقاط موجزة
   - استخدم لغة جذابة ومباشرة
   - أضف هاشتاغات ذات صلة

2. **للمنصات المرئية** (يوتيوب، TikTok):
   - حوّل النص إلى سيناريو مرئي
   - قسّم المحتوى إلى مشاهد قصيرة
   - ركز على العناصر البصرية الجذابة

3. **للمنصات الطويلة** (المدونات، LinkedIn):
   - وسّع المحتوى بأمثلة وتفاصيل
   - استخدم تنسيقاً احترافياً
   - أضف روابط ومراجع

### الخطوة التالية:
يُنصح بتفعيل جميع الخيارات المتقدمة (RAG، التحليل الدستوري، كشف الهلوسة) للحصول على تحويل دقيق ومُحسّن للمنصة.

ملاحظة: هذا تحليل احتياطي. للحصول على نتائج أفضل، يرجى المحاولة مرة أخرى مع توفير سياق أكثر اكتمالاً.`;
  }
}

// Export singleton instance
export const platformAdapterAgent = new PlatformAdapterAgent();

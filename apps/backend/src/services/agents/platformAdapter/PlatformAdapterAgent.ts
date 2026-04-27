import { TaskType } from "@core/enums";

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
      PLATFORM_ADAPTER_AGENT_CONFIG.systemPrompt ?? ""
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
      typeof context === "object" && context !== null
        ? (context)
        : {};
    const targetPlatform = (contextObj["targetPlatform"] as string) || "غير محدد";
    const sourceContent = (contextObj["sourceContent"] as string) || userInput;
    const constraints = (contextObj["constraints"] as Record<string, unknown>) || {};

    let prompt = `## مهمة تحويل المحتوى للمنصة

${userInput}

`;

    prompt += this.buildSourceSection(sourceContent, userInput);
    prompt += this.buildPlatformSection(targetPlatform);
    prompt += this.buildConstraintsSection(constraints);
    prompt += this.buildPreviousStationsSection(contextObj);

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
  protected override postProcess(
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

    return Promise.resolve({
      ...output,
      text: cleanedText,
      notes: enhancedNotes,
    });
  }

  private buildSourceSection(sourceContent: string, userInput: string): string {
    if (sourceContent === userInput) return "";
    return `### المحتوى المصدر:\n${sourceContent.substring(0, 2000)}\n\n`;
  }

  private buildPlatformSection(targetPlatform: string): string {
    return `### المنصة المستهدفة: ${targetPlatform}\n\n`;
  }

  private buildConstraintsSection(constraints: Record<string, unknown>): string {
    if (Object.keys(constraints).length === 0) return "";
    let section = `### قيود المنصة:\n`;
    section += this.formatConstraint("حد الأحرف", constraints["characterLimit"]);
    section += this.formatConstraint("طول الفيديو", constraints["videoLength"]);
    section += this.formatConstraint("مواصفات الصور", constraints["imageSpecs"]);
    section += this.formatConstraint("عدد الهاشتاغات", constraints["hashtagCount"]);
    section += `\n`;
    return section;
  }

  private formatConstraint(label: string, value: unknown): string {
    const rendered = this.renderConstraintValue(value);
    return rendered ? `- ${label}: ${rendered}\n` : "";
  }

  private renderConstraintValue(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return undefined;
  }

  private buildPreviousStationsSection(contextObj: Record<string, unknown>): string {
    const previousStations = contextObj["previousStations"] as Record<string, string> | undefined;
    if (!previousStations) return "";
    let section = `### السياق من المحطات السابقة:\n`;
    if (previousStations["analysis"]) {
      section += `\n**التحليل الأولي:**\n${previousStations["analysis"].substring(0, 500)}\n`;
    }
    if (previousStations["targetAudience"]) {
      section += `\n**الجمهور المستهدف:**\n${previousStations["targetAudience"].substring(0, 300)}\n`;
    }
    return section;
  }

  /**
   * استجابة احتياطية في حالة الفشل
   */
  protected override getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    const contextObj =
      typeof input.context === "object" && input.context !== null
        ? input.context
        : {};
    const targetPlatform = (contextObj)["targetPlatform"] as string || "المنصة المستهدفة";

    return Promise.resolve(`# تحويل المحتوى - وضع الطوارئ

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

ملاحظة: هذا تحليل احتياطي. للحصول على نتائج أفضل، يرجى المحاولة مرة أخرى مع توفير سياق أكثر اكتمالاً.`);
  }
}

// Export singleton instance
export const platformAdapterAgent = new PlatformAdapterAgent();

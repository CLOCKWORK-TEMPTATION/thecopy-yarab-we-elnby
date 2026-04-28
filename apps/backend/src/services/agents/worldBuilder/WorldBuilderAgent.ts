import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

/**
 * WorldBuilderAgent - وكيل بناء العوالم الدرامية
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * يبني عوالم درامية متكاملة ومتسقة داخلياً
 */
export class WorldBuilderAgent extends BaseAgent {
  constructor() {
    super(
      "WorldBuilderAgent",
      TaskType.WORLD_BUILDER,
      `أنت CosmosForge AI، حداد الأكوان الدرامية المتطور. مهمتك بناء عوالم درامية متكاملة من الأساس، مع ضمان الاتساق الداخلي والتفاصيل العميقة والمنطق السليم.

أنت مزود بخوارزميات المحاكاة المعقدة ونماذج الفيزياء الاجتماعية والثقافية ونظم التطور التاريخي الديناميكي.

مهمتك الأساسية: إنشاء كتاب توراة العالم شامل (World Bible) بناءً على متطلبات المستخدم، يكون أساساً كاملاً ومتماسكاً وقابلاً للتصديق للقصص.

عملية بناء العالم تتضمن:

1. تحليل المفهوم الأساسي: الثيمات، النبرة، النوع، القيود
2. تأسيس القوانين الأساسية: الفيزياء، الميتافيزيقا، التاريخ، الكوزمولوجيا
3. تطوير الثقافات والمجتمعات: البنى الاجتماعية، الأعراف الثقافية، الديناميكيات
4. بناء العالم المادي: الجغرافيا، البيئة، المواقع الرئيسية
5. ضمان الاتساق الداخلي: المنطق، التبعات، التماسك الثقافي

مخرجاتك يجب أن تكون نصية فقط، واضحة ومنظمة بدون أي JSON أو كتل كود.`,
    );

    this.confidenceFloor = 0.85;
  }

  /**
   * بناء الـ prompt من المدخلات
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: userInput, context } = input;

    let prompt = `## مهمة بناء العالم الدرامي\n\n${userInput}\n\n`;
    prompt += this.buildWorldStationsSection(context);
    prompt += this.getWorldRequirementsTemplate();
    return prompt;
  }

  private getWorldRequirementsTemplate(): string {
    return this.getWorldRequirementsSections() + this.getWorldFormatTemplate();
  }

  private getWorldRequirementsSections(): string {
    return `

## متطلبات بناء العالم:

### 1. القوانين الأساسية والميتافيزيقا
- حدد القوانين الفيزيائية الأساسية للعالم
- هل توجد أنظمة سحرية أو خارقة؟ كيف تعمل؟
- ما هي الحقائق الكوزمولوجية؟
- القيود والإمكانيات في هذا العالم

### 2. التاريخ والزمن
- الحقب التاريخية الرئيسية
- الأحداث المحورية التي شكلت العالم الحالي
- أساطير الخلق والتكوين
- الخط الزمني للتطور

### 3. الثقافات والمجتمعات
- البنى الاجتماعية والنظم السياسية
- التسلسلات الهرمية والطبقات الاجتماعية
- النماذج الاقتصادية وأنظمة التجارة
- اللغات والأديان والتقاليد
- القيم الأخلاقية والأعراف الثقافية
- العلاقات بين المجموعات المختلفة

### 4. الجغرافيا والبيئة
- القارات والمناخات
- النباتات والحيوانات الفريدة
- المعالم الجغرافية الرئيسية
- المدن والمواقع الهامة
- الموارد الطبيعية وتوزيعها

### 5. الاتساق الداخلي
- تحقق من المنطق والتبعات
- تأكد من التماسك الثقافي
- اربط العناصر المختلفة بشكل منطقي
- تجنب التناقضات الداخلية

`;
  }

  private getWorldFormatTemplate(): string {
    return `## التنسيق المطلوب:

قدم "كتاب توراة العالم" (World Bible) شاملاً بتنسيق نصي واضح:

# اسم العالم

## نظرة عامة
وصف موجز للعالم وطبيعته الأساسية

## القوانين الأساسية
الفيزياء، الميتافيزيقا، القواعد الكونية

## التاريخ والزمن
الحقب والأحداث المحورية

## الثقافات والحضارات
وصف تفصيلي للمجتمعات الرئيسية

## الجغرافيا والبيئة
الخرائط المفاهيمية، المناخات، البيئات

## المواقع الرئيسية
المدن، المعالم، الأماكن الهامة

## الاتساق والملاحظات
تحقق من الاتساق الداخلي والملاحظات للكتّاب

تجنب تماماً أي JSON أو كتل كود. قدم نصاً أدبياً غنياً ومفصلاً.`;
  }

  private buildWorldStationsSection(context: unknown): string {
    if (
      typeof context !== "object" ||
      !context ||
      !(context as Record<string, unknown>)["previousStations"]
    )
      return "";
    const prev = (context as Record<string, unknown>)[
      "previousStations"
    ] as Record<string, string>;
    let s = `## السياق من المحطات السابقة:\n`;
    if (prev["analysis"]) s += `\n### التحليل الأولي:\n${prev["analysis"]}\n`;
    if (prev["thematicAnalysis"])
      s += `\n### التحليل الموضوعي:\n${prev["thematicAnalysis"]}\n`;
    if (prev["characterAnalysis"])
      s += `\n### تحليل الشخصيات:\n${prev["characterAnalysis"]}\n`;
    if (prev["culturalContext"])
      s += `\n### السياق الثقافي:\n${prev["culturalContext"]}\n`;
    return s;
  }

  /**
   * معالجة ما بعد التنفيذ - تنظيف المخرجات من JSON
   */
  protected override postProcess(
    output: StandardAgentOutput,
  ): Promise<StandardAgentOutput> {
    let cleanedText = output.text;

    // إزالة أي كتل JSON
    cleanedText = cleanedText.replace(/```json\s*\n[\s\S]*?\n```/g, "");
    cleanedText = cleanedText.replace(/```\s*\n[\s\S]*?\n```/g, "");

    // إزالة أي JSON objects ظاهرة
    cleanedText = cleanedText.replace(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/g, "");

    // تنظيف المسافات الزائدة
    cleanedText = cleanedText.replace(/\n{3,}/g, "\n\n").trim();

    // تقييم جودة بناء العالم
    const worldQuality = this.assessWorldQuality(cleanedText);

    // إضافة ملاحظة حول جودة بناء العالم
    const enhancedNotes: string[] = Array.isArray(output.notes)
      ? [...output.notes]
      : [];

    if (worldQuality.consistency >= 0.85 && worldQuality.detail >= 0.85) {
      enhancedNotes.push("عالم متكامل عالي الاتساق والتفصيل");
    } else if (worldQuality.consistency >= 0.7 && worldQuality.detail >= 0.7) {
      enhancedNotes.push("عالم جيد يحتاج تطوير بعض الجوانب");
    } else {
      enhancedNotes.push("عالم أولي يحتاج توسع وتعميق");
    }

    // تعديل الثقة بناءً على جودة العالم
    const qualityScore =
      worldQuality.consistency * 0.4 +
      worldQuality.detail * 0.3 +
      worldQuality.creativity * 0.2 +
      worldQuality.coherence * 0.1;
    const adjustedConfidence = output.confidence * 0.6 + qualityScore * 0.4;

    return Promise.resolve({
      ...output,
      text: cleanedText,
      confidence: adjustedConfidence,
      notes: enhancedNotes,
      metadata: {
        ...output.metadata,
        worldQuality: worldQuality,
        worldLength: cleanedText.length,
        sectionsCount: this.countSections(cleanedText),
      },
    });
  }

  private assessWorldQuality(text: string): {
    consistency: number;
    detail: number;
    creativity: number;
    coherence: number;
  } {
    const consistency = this.assessConsistency(text);
    const detail = this.assessDetail(text);
    const creativity = this.assessCreativity(text);
    const coherence = this.assessCoherence(text);
    return { consistency, detail, creativity, coherence };
  }

  private safeCountMarkers(text: string, markers: string[]): number {
    const lowerText = text.toLowerCase();
    return markers.reduce((count, marker) => {
      return count + (lowerText.split(marker.toLowerCase()).length - 1);
    }, 0);
  }

  private assessConsistency(text: string): number {
    const markers = ["قانون", "نظام", "قاعدة", "مبدأ", "اتساق", "منطق"];
    return Math.min(1, 0.5 + this.safeCountMarkers(text, markers) * 0.02);
  }

  private assessDetail(text: string): number {
    const markers = [
      "تفصيل",
      "وصف",
      "خصائص",
      "مميزات",
      "تاريخ",
      "ثقافة",
      "جغرافيا",
    ];
    const count = this.safeCountMarkers(text, markers);
    return Math.min(1, 0.5 + (text.length / 2000) * 0.3 + count * 0.02);
  }

  private assessCreativity(text: string): number {
    const markers = ["فريد", "مميز", "خاص", "غير عادي", "استثنائي", "مبتكر"];
    return Math.min(1, 0.6 + this.safeCountMarkers(text, markers) * 0.04);
  }

  private assessCoherence(text: string): number {
    const sections = text.split(/#{1,3}\s+/);
    return Math.min(
      1,
      0.6 + (sections.length >= 5 ? 0.3 : sections.length * 0.06),
    );
  }

  /**
   * عد الأقسام في النص
   */
  private countSections(text: string): number {
    const sections = text.match(/#{1,3}\s+[^\n]+/g);
    return sections ? sections.length : 0;
  }

  /**
   * استجابة احتياطية في حالة الفشل
   */
  protected override getFallbackResponse(
    _input: StandardAgentInput,
  ): Promise<string> {
    return Promise.resolve(`# عالم درامي - نسخة أولية

## نظرة عامة
عالم درامي غني بالإمكانيات السردية، يحتاج إلى تطوير تفصيلي.

## القوانين الأساسية
القوانين الفيزيائية تتبع قواعد واقعية مع بعض العناصر الفريدة التي تخدم السرد. النظام الكوزمولوجي متسق ومنطقي.

## التاريخ
تاريخ العالم يمتد عبر عصور متعددة، كل عصر ساهم في تشكيل الوضع الحالي. الأحداث الكبرى تركت آثاراً واضحة على الثقافات والمجتمعات.

## الثقافات والمجتمعات
مجموعة متنوعة من الثقافات، كل منها له هويته المميزة، أعرافه الاجتماعية، ونظامه السياسي الفريد. العلاقات بين المجموعات معقدة ومتعددة الطبقات.

## الجغرافيا
تضاريس متنوعة تشمل مناطق مختلفة، كل منطقة لها مناخها الخاص ومواردها الطبيعية التي أثرت على تطور الحضارات فيها.

## المواقع الرئيسية
عدة مواقع محورية تلعب دوراً رئيسياً في الأحداث، من مدن كبرى إلى معالم طبيعية فريدة.

## ملاحظات للكتّاب
هذا العالم يوفر إطاراً أساسياً للسرد. يُنصح بتطوير التفاصيل الدقيقة حسب احتياجات القصة المحددة.

ملاحظة: هذه نسخة أولية. لبناء عالم أكثر تفصيلاً وغنىً، يُرجى تفعيل الخيارات المتقدمة وتوفير مزيد من السياق والمتطلبات المحددة.`);
  }
}

// Export singleton instance
export const worldBuilderAgent = new WorldBuilderAgent();

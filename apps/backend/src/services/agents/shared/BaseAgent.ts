import { logger } from "@/lib/logger";
import { geminiService } from "@/services/gemini.service";
import { TaskType } from "@core/types";

import {
  StandardAgentInput,
  StandardAgentOptions,
  StandardAgentOutput,
 executeStandardAgentPattern } from "./standardAgentPattern";


/**
 * واجهة إعدادات الوكيل
 * 
 * @description
 * تحدد هيكل كائن إعدادات الوكيل
 */
export interface AgentConfig {
  /** اسم الوكيل */
  name: string;
  /** نوع المهمة */
  taskType: TaskType;
  /** الحد الأدنى للثقة */
  confidenceFloor: number;
  /** دعم RAG */
  supportsRAG: boolean;
  /** دعم النقد الذاتي */
  supportsSelfCritique: boolean;
  /** دعم القواعد الدستورية */
  supportsConstitutional: boolean;
  /** دعم قياس عدم اليقين */
  supportsUncertainty: boolean;
  /** دعم كشف الهلوسة */
  supportsHallucination: boolean;
  /** دعم المناظرة */
  supportsDebate: boolean;
}

/**
 * الفئة الأساسية للوكيل - Base Agent Class
 * 
 * @description
 * النمط القياسي لجميع الوكلاء في النظام.
 * يطبق سلسلة المعالجة: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON في الواجهة
 * 
 * @example
 * ```typescript
 * class MyAgent extends BaseAgent {
 *   constructor() {
 *     super('MyAgent', TaskType.ANALYSIS, 'system prompt');
 *   }
 *   protected buildPrompt(input: StandardAgentInput): string {
 *     return `Analyze: ${input.input}`;
 *   }
 * }
 * ```
 */
export abstract class BaseAgent {
  /** اسم الوكيل - Agent name */
  protected name: string;
  /** نوع المهمة - Task type */
  protected taskType: TaskType;
  /** تعليمات النظام - System prompt */
  protected systemPrompt: string;
  /** الحد الأدنى للثقة - Minimum confidence threshold */
  protected confidenceFloor = 0.7;

  /**
   * منشئ الفئة الأساسية للوكيل
   * 
   * @param name - اسم الوكيل المعرّف
   * @param taskType - نوع المهمة التي يقوم بها الوكيل
   * @param systemPrompt - تعليمات النظام الأساسية للوكيل
   */
  constructor(name: string, taskType: TaskType, systemPrompt: string) {
    this.name = name;
    this.taskType = taskType;
    this.systemPrompt = systemPrompt;
  }

  /**
   * تنفيذ المهمة باستخدام النمط القياسي للوكيل
   * 
   * @description
   * يقوم بتنفيذ المهمة المطلوبة مع تطبيق جميع مراحل المعالجة
   * المدخلات: { input, options, context }
   * المخرجات: { text, confidence, notes } - نصي فقط
   * 
   * @param input - مدخلات الوكيل تشمل النص والخيارات والسياق
   * @returns وعد بنتيجة التنفيذ مع نص الإخراج ودرجة الثقة والملاحظات
   * @throws يعيد نتيجة احتياطية في حالة الخطأ بدلاً من رمي استثناء
   */
  async executeTask(input: StandardAgentInput): Promise<StandardAgentOutput> {
    logger.info(`بدء تنفيذ المهمة`, { agentName: this.name, taskType: this.taskType });

    try {
      return await this.executeTaskCore(input);
    } catch (error) {
      return await this.handleTaskError(error, input);
    }
  }

  /**
   * التنفيذ الأساسي للمهمة
   */
  private async executeTaskCore(input: StandardAgentInput): Promise<StandardAgentOutput> {
    const basePrompt = this.buildPrompt(input);
    const options = this.mergeOptions(input.options);

    const result = await executeStandardAgentPattern(basePrompt, options, {
      ...(typeof input.context === "object" ? input.context : {}),
      taskType: this.taskType,
      agentName: this.name,
      systemPrompt: this.systemPrompt,
    });

    const processedResult = await this.postProcess(result);
    const normalizedResult = this.normalizeOutput(processedResult);

    logger.info(`اكتمل تنفيذ المهمة`, {
      agentName: this.name,
      confidence: normalizedResult.confidence,
    });

    return normalizedResult;
  }

  /**
   * دمج الخيارات مع القيم الافتراضية
   */
  private mergeOptions(inputOptions?: StandardAgentOptions): StandardAgentOptions {
    const defaults: StandardAgentOptions = {
      temperature: 0.7,
      maxTokens: 48192,
      timeout: 30000,
      retries: 2,
      enableCaching: true,
      enableLogging: true,
    };
    return { ...defaults, ...inputOptions };
  }

  /**
   * معالجة أخطاء التنفيذ
   */
  private async handleTaskError(error: unknown, input: StandardAgentInput): Promise<StandardAgentOutput> {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";

    logger.error(`فشل في تنفيذ المهمة`, {
      agentName: this.name,
      error: errorMessage,
    });

    return {
      text: await this.getFallbackResponse(input),
      confidence: 0.3,
      notes: [`خطأ في التنفيذ: ${errorMessage}`],
      metadata: {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        ragUsed: false,
        critiqueIterations: 0,
        constitutionalViolations: 0,
        uncertaintyScore: 1.0,
        hallucinationDetected: false,
        debateRounds: 0,
      },
    };
  }

  private normalizeOutput(output: StandardAgentOutput): StandardAgentOutput {
    const normalizedNotes = Array.isArray(output.notes)
      ? output.notes.map((note) => String(note))
      : output.notes === undefined || output.notes === null
        ? []
        : [String(output.notes)];

    const normalizedText =
      typeof output.text === "string" ? output.text.trim() : String(output.text ?? "");
    const clampedConfidence = Math.min(1, Math.max(0, output.confidence));

    return {
      ...output,
      text: normalizedText,
      confidence: Number(clampedConfidence.toFixed(2)),
      notes: normalizedNotes,
      metadata: {
        ...(output.metadata ?? {}),
        timestamp:
          typeof output.metadata?.timestamp === "string"
            ? output.metadata.timestamp
            : new Date().toISOString(),
      },
    };
  }

  /**
   * بناء النص من المدخلات - يجب تنفيذه في كل وكيل فرعي
   * 
   * @description
   * طريقة مجردة يجب تنفيذها في الفئات الفرعية لبناء النص المطلوب
   * 
   * @param input - مدخلات الوكيل
   * @returns النص المبني للمعالجة
   */
  protected abstract buildPrompt(input: StandardAgentInput): string;

  /**
   * المعالجة اللاحقة - يمكن للوكلاء الفرعية تجاوز هذه الطريقة
   * 
   * @description
   * معالجة اختيارية بعد الحصول على النتيجة الأولية
   * 
   * @param output - نتيجة المعالجة الأولية
   * @returns النتيجة بعد المعالجة اللاحقة
   */
  protected async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // افتراضي: لا توجد معالجة لاحقة
    return output;
  }

  /**
   * توليد استجابة احتياطية عند فشل التنفيذ
   * 
   * @description
   * يُستخدم لتوفير استجابة بديلة في حالة فشل المعالجة الرئيسية
   * 
   * @param input - مدخلات الوكيل الأصلية
   * @returns نص الاستجابة الاحتياطية
   */
  protected async getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    try {
      // محاولة التوليد البسيط باستخدام تعليمات النظام فقط
      const fallbackPrompt = `${this.systemPrompt}\n\nالمهمة: ${input.input}\n\nقدم إجابة مختصرة ومباشرة.`;

      const response = await geminiService.generateText(fallbackPrompt, {
        temperature: 0.5,
        maxTokens: 4096,
      });

      return response || "عذراً، لم أتمكن من إكمال المهمة المطلوبة.";
    } catch {
      return "عذراً، حدث خطأ في معالجة الطلب. يرجى المحاولة مرة أخرى.";
    }
  }

  /**
   * الحصول على إعدادات الوكيل
   * 
   * @description
   * يُرجع كائن يحتوي على جميع إعدادات وقدرات الوكيل
   * 
   * @returns كائن إعدادات الوكيل
   */
  getConfig(): AgentConfig {
    return {
      name: this.name,
      taskType: this.taskType,
      confidenceFloor: this.confidenceFloor,
      supportsRAG: true,
      supportsSelfCritique: true,
      supportsConstitutional: true,
      supportsUncertainty: true,
      supportsHallucination: true,
      supportsDebate: true,
    };
  }

  /**
   * تعيين الحد الأدنى للثقة لهذا الوكيل
   * 
   * @description
   * يحدد الحد الأدنى المقبول لدرجة الثقة (بين 0 و 1)
   * 
   * @param threshold - قيمة الحد الأدنى للثقة (0-1)
   */
  setConfidenceFloor(threshold: number): void {
    this.confidenceFloor = Math.max(0, Math.min(1, threshold));
  }
}

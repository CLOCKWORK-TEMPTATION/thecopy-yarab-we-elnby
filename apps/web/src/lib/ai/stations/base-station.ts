// frontend/src/lib/ai/stations/base-station.ts

import { GeminiService } from "./gemini-service";
import { StationMetadata } from "../core/models/base-entities";
import { checkConstitutionalCompliance } from "../constitutional/principles";
import { getUncertaintyQuantificationEngine } from "../constitutional/uncertainty-quantification";

// تعريف واجهة للخيارات الجديدة
export interface StationOptions {
  // خيارات Constitutional AI
  enableConstitutionalCheck?: boolean;

  // خيارات Uncertainty Quantification
  enableUncertaintyQuantification?: boolean;

  // خيارات RAG
  enableRAG?: boolean;

  // خيارات عامة
  temperature?: number;
  maxTokens?: number;
}

import type {
  PreviousResults,
  TextChunk,
  ContextMap,
  StationResult,
} from "../interfaces/response-types";

export interface StationInput {
  text: string;
  projectName?: string | undefined;
  options?: StationOptions | undefined;
  // يمكن إضافة المزيد من المدخلات حسب الحاجة
  previousResults?: PreviousResults | undefined;
  chunks?: TextChunk[] | undefined;
  contextMap?: ContextMap | undefined;
}

export interface StationOutput {
  // النتيجة الأساسية من المحطة
  result: StationResult;

  // البيانات الوصفية المحسنة
  metadata: StationMetadata & {
    // نتائج Constitutional AI
    constitutionalCheck?: {
      checked: boolean;
      compliant: boolean;
      violations: string[];
      improvementScore: number;
      correctedAnalysis?: string;
    };

    // نتائج Uncertainty Quantification
    uncertaintyQuantification?: {
      quantified: boolean;
      overallConfidence: number;
      uncertaintyType: "epistemic" | "aleatoric";
      sources: Array<{
        aspect: string;
        reason: string;
        reducible: boolean;
      }>;
    };

    // معلومات RAG
    ragInfo?: {
      wasChunked: boolean;
      chunksCount: number;
      retrievalTime: number;
    };
  };
}

export abstract class BaseStation {
  protected geminiService: GeminiService;
  protected stationName: string;
  protected stationNumber: number;

  constructor(
    geminiService: GeminiService,
    stationName: string,
    stationNumber: number
  ) {
    this.geminiService = geminiService;
    this.stationName = stationName;
    this.stationNumber = stationNumber;
  }

  /**
   * نقطة الدخول الرئيسية لتشغيل المحطة
   */
  async run(input: StationInput): Promise<StationOutput> {
    const startTime = Date.now();
    const options = this.mergeWithDefaultOptions(input.options);

    try {
      // 1. تنفيذ منطق المحطة الأساسي
      let result = await this.execute(input, options);

      // 2. تطبيق Constitutional AI إذا كان مفعلاً
      if (options.enableConstitutionalCheck) {
        result = await this.applyConstitutionalCheck(result, input.text);
      }

      // 3. تطبيق Uncertainty Quantification إذا كان مفعلاً
      if (options.enableUncertaintyQuantification) {
        result = await this.applyUncertaintyQuantification(result, input);
      }

      // 4. إنشاء البيانات الوصفية النهائية
      const metadata = await this.createMetadata(startTime, options, input);

      return {
        result,
        metadata,
      };
    } catch (error) {
      // SECURITY FIX: Pass stationName as separate argument to prevent format string injection
      console.error("Error in station:", this.stationName, error);

      // إرجاع نتيجة خطأ مع البيانات الوصفية المناسبة
      return {
        result: null,
        metadata: {
          stationName: this.stationName,
          stationNumber: this.stationNumber,
          status: "Failed",
          error: (error as Error).message,
          executionTime: Date.now() - startTime,
          agentsUsed: [],
          tokensUsed: 0,
        },
      };
    }
  }

  /**
   * دالة مجردة يجب على كل محطة تطبيقها
   */
  protected abstract execute(
    input: StationInput,
    options: StationOptions
  ): Promise<StationResult>;

  /**
   * دمج الخيارات المدخلة مع الخيارات الافتراضية
   */
  private mergeWithDefaultOptions(options?: StationOptions): StationOptions {
    return {
      enableConstitutionalCheck: true,
      enableUncertaintyQuantification: true,
      enableRAG: false, // يتم تفعيله عادةً في المنسق
      temperature: 0.4,
      maxTokens: 4096,
      ...options,
    };
  }

  /**
   * تطبيق فحص التوافق مع المبادئ الدستورية
   */
  private async applyConstitutionalCheck(
    result: StationResult,
    originalText: string
  ): Promise<StationResult> {
    try {
      // استخراج النصوص التي تحتاج إلى فحص
      const textsToCheck = this.extractTextsForConstitutionalCheck(result);

      const constitutionalResults = [];
      let hasViolations = false;
      let overallImprovementScore = 1.0;

      for (const text of textsToCheck) {
        const checkResult = await checkConstitutionalCompliance(
          text,
          originalText,
          this.geminiService
        );

        constitutionalResults.push(checkResult);

        if (!checkResult.compliant) {
          hasViolations = true;
          overallImprovementScore = Math.min(
            overallImprovementScore,
            checkResult.improvementScore
          );

          // استبدال النص بالنسخة المصححة
          result = this.replaceTextInResult(
            result,
            text,
            checkResult.correctedAnalysis || text
          );
        }
      }

      // إضافة نتائج الفحص الدستوري إلى النتيجة
      const resultObj = result as Record<string, unknown>;
      resultObj.constitutionalCheck = {
        checked: true,
        compliant: !hasViolations,
        violations: constitutionalResults.flatMap((r) =>
          r.violations.map((v) => `${v.principle}: ${v.description}`)
        ),
        improvementScore: overallImprovementScore,
      };

      return result;
    } catch (error) {
      console.error("Constitutional check failed:", error);

      // إضافة معلومات الفشل إلى النتيجة
      const resultObj = result as Record<string, unknown>;
      resultObj.constitutionalCheck = {
        checked: false,
        compliant: false,
        violations: [`فشل الفحص: ${(error as Error).message}`],
        improvementScore: 0,
      };

      return result;
    }
  }

  /**
   * تطبيق قياس عدم اليقين
   */
  private async applyUncertaintyQuantification(
    result: StationResult,
    input: StationInput
  ): Promise<StationResult> {
    try {
      const uncertaintyEngine = getUncertaintyQuantificationEngine(
        this.geminiService
      );

      // استخراج النصوص التي تحتاج إلى قياس عدم اليقين
      const textsToQuantify =
        this.extractTextsForUncertaintyQuantification(result);

      const uncertaintyResults = [];
      let overallConfidence = 0;
      let uncertaintyType: "epistemic" | "aleatoric" = "epistemic";
      const allSources = [];

      for (const text of textsToQuantify) {
        const metrics = await uncertaintyEngine.quantify(text, {
          originalText: input.text,
          analysisType: this.stationName,
          previousResults: input.previousResults,
        });

        uncertaintyResults.push(metrics);
        overallConfidence += metrics.confidence;
        uncertaintyType = metrics.type;
        allSources.push(...metrics.sources);
      }

      // حساب متوسط درجات عدم اليقين
      overallConfidence =
        overallConfidence / Math.max(uncertaintyResults.length, 1);

      // إضافة نتائج قياس عدم اليقين إلى النتيجة
      const resultObj = result as Record<string, unknown>;
      resultObj.uncertaintyQuantification = {
        quantified: true,
        overallConfidence,
        uncertaintyType,
        sources: allSources.slice(0, 5), // أهم 5 مصادر
      };

      return result;
    } catch (error) {
      console.error("Uncertainty quantification failed:", error);

      // إضافة معلومات الفشل إلى النتيجة
      const resultObj = result as Record<string, unknown>;
      resultObj.uncertaintyQuantification = {
        quantified: false,
        overallConfidence: 0.5,
        uncertaintyType: "epistemic",
        sources: [
          {
            aspect: "فشل التحليل",
            reason: (error as Error).message,
            reducible: false,
          },
        ],
      };

      return result;
    }
  }

  /**
   * إنشاء البيانات الوصفية النهائية
   */
  private async createMetadata(
    startTime: number,
    options: StationOptions,
    input: StationInput
  ): Promise<StationMetadata> {
    const executionTime = Date.now() - startTime;

    return {
      stationName: this.stationName,
      stationNumber: this.stationNumber,
      status: "Success",
      executionTime,
      agentsUsed: this.getAgentsUsed(),
      tokensUsed: this.estimateTokensUsed(input.text),
      options: {
        ...(options.enableConstitutionalCheck !== undefined && {
          constitutionalCheck: options.enableConstitutionalCheck,
        }),
        ...(options.enableUncertaintyQuantification !== undefined && {
          uncertaintyQuantification: options.enableUncertaintyQuantification,
        }),
        ...(options.enableRAG !== undefined && { rag: options.enableRAG }),
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
        ...(options.maxTokens !== undefined && {
          maxTokens: options.maxTokens,
        }),
      },
      ragInfo:
        options.enableRAG && input.chunks
          ? {
              wasChunked: true,
              chunksCount: input.chunks.length,
              retrievalTime: 0, // سيتم حسابه في المنسق
            }
          : {
              wasChunked: false,
              chunksCount: 0,
              retrievalTime: 0,
            },
    };
  }

  /**
   * استخراج النصوص التي تحتاج إلى فحص دستوري (يمكن تجاوزه في المحطات الفرعية)
   */
  protected extractTextsForConstitutionalCheck(
    result: StationResult
  ): string[] {
    const texts = [];

    // استخراج النصوص الرئيسية من نتيجة المحطة
    if (typeof result === "object" && result !== null) {
      const resultObj = result as Record<string, unknown>;
      if (typeof resultObj.logline === "string") texts.push(resultObj.logline);
      if (typeof resultObj.storyStatement === "string")
        texts.push(resultObj.storyStatement);
      if (typeof resultObj.elevatorPitch === "string")
        texts.push(resultObj.elevatorPitch);
      if (typeof resultObj.executiveSummary === "string")
        texts.push(resultObj.executiveSummary);
    }

    // استخراج النصوص من التحليلات الفرعية
    if (
      typeof result === "object" &&
      result !== null &&
      "characterAnalysis" in result
    ) {
      const characterAnalysis = result.characterAnalysis;
      if (typeof characterAnalysis === "object" && characterAnalysis !== null) {
        for (const [_character, analysis] of Object.entries(
          characterAnalysis
        )) {
          if (typeof analysis === "string") texts.push(analysis);
        }
      }
    }

    if (typeof result === "object" && result !== null && "themes" in result) {
      const themes = result.themes;
      if (
        typeof themes === "object" &&
        themes !== null &&
        "primary" in themes
      ) {
        const primaryThemes = (
          themes as { primary?: Array<{ description?: string }> }
        ).primary;
        if (Array.isArray(primaryThemes)) {
          for (const theme of primaryThemes) {
            if (
              theme &&
              typeof theme === "object" &&
              "description" in theme &&
              typeof theme.description === "string"
            ) {
              texts.push(theme.description);
            }
          }
        }
      }
    }

    return texts;
  }

  /**
   * استخراج النصوص التي تحتاج إلى قياس عدم اليقين (يمكن تجاوزه في المحطات الفرعية)
   */
  protected extractTextsForUncertaintyQuantification(
    result: StationResult
  ): string[] {
    // للتبسيط، نستخدم نفس النصوص المستخدمة في الفحص الدستوري
    return this.extractTextsForConstitutionalCheck(result);
  }

  /**
   * استبدال نص في نتيجة المحطة
   */
  protected replaceTextInResult(
    result: StationResult,
    oldText: string,
    newText: string
  ): StationResult {
    // نسخة عميقة من النتيجة لتجنب التعديل المباشر
    const newResult = JSON.parse(JSON.stringify(result)) as StationResult;

    // دالة تعاودية للبحث والاستبدال
    function replaceInObject(obj: unknown): void {
      if (typeof obj !== "object" || obj === null) {
        return;
      }

      for (const key in obj) {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === "string" && value === oldText) {
          (obj as Record<string, unknown>)[key] = newText;
        } else if (typeof value === "object" && value !== null) {
          replaceInObject(value);
        }
      }
    }

    replaceInObject(newResult);
    return newResult;
  }

  /**
   * الحصول على قائمة الوكلاء المستخدمين في هذه المحطة (يجب تجاوزه)
   */
  protected abstract getAgentsUsed(): string[];

  /**
   * تقدير عدد التوكنز المستخدمة
   */
  protected estimateTokensUsed(text: string): number {
    // تقدير بسيط: 1 توكن ≈ 4 أحرف
    return Math.ceil(text.length / 4);
  }
}

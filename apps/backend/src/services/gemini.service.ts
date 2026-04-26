import { GoogleGenerativeAI } from '@google/generative-ai';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { trackGeminiRequest, trackGeminiCache } from '@/middleware/metrics.middleware';

import { cacheService } from './cache.service';
import {
  generateGeminiCacheKey,
  getGeminiCacheTTL,
  cachedGeminiCall,
  getAdaptiveTTL,
  GEMINI_CACHE_PREFIX,
} from './gemini-cache.strategy';
import { geminiCostTracker } from './gemini-cost-tracker.service';
import { llmGuardrails } from './llm-guardrails.service';

/**
 * نوع فئات ذاكرة التخزين المؤقت المدعومة
 * 
 * @description
 * يحدد الفئات الصالحة لمفاتيح ذاكرة التخزين المؤقت في Gemini API
 */
type GeminiCacheCategory = keyof typeof GEMINI_CACHE_PREFIX;

/**
 * إعدادات طلب Gemini API
 * 
 * @description
 * يحدد كافة المعاملات المطلوبة لتنفيذ طلب Gemini مع التخزين المؤقت والقياسات
 */
interface GeminiRequestConfig {
  /** معرّف نوع الطلب (للتخزين المؤقت والقياسات والتسجيل) */
  requestType: string;
  /** النص الموجه لإرساله إلى Gemini API */
  prompt: string;
  /** النص المدخل الأصلي للتحقق من الحماية */
  originalInput: string;
  /** معاملات مفتاح ذاكرة التخزين المؤقت */
  cacheKeyParams: Record<string, unknown>;
  /** فئة مفتاح ذاكرة التخزين المؤقت */
  cacheCategory: GeminiCacheCategory;
  /** استخدام TTL تكيفي بناءً على نسبة الإصابة */
  useAdaptiveTTL?: boolean;
  /** رسالة الخطأ عند الفشل (بالعربية) */
  errorMessage: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MODEL = 'gemini-2.5-flash';

  constructor() {
    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_GENAI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('GEMINI_API_KEY أو GOOGLE_GENAI_API_KEY غير محدد في البيئة');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.DEFAULT_MODEL });
  }

  /**
   * Track token usage from Gemini API response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async trackTokenUsage(apiResult: any, analysisType: string): Promise<void> {
    try {
      // Extract usage metadata from the response
      const usageMetadata = apiResult?.response?.usageMetadata;

      if (usageMetadata) {
        const inputTokens = usageMetadata.promptTokenCount || 0;
        const outputTokens = usageMetadata.candidatesTokenCount || 0;

        // Track usage and cost
        await geminiCostTracker.trackUsage(inputTokens, outputTokens, analysisType);
      } else {
        logger.debug('No usage metadata in Gemini response', { analysisType });
      }
    } catch (error) {
      logger.error('Failed to track token usage', { error, analysisType });
    }
  }

  /**
   * Apply guardrails to input and output with comprehensive validation
   */
   
  private applyGuardrails(
    input: string,
    output: string,
    requestType: string,
    userId?: string
  ): { sanitizedInput: string; sanitizedOutput: string; warnings: string[] } {
    const warnings: string[] = [];
    
    // Validate input
    const inputValidation = llmGuardrails.checkInput(input, {
      ...(userId && { userId }),
      requestType
    });

    if (!inputValidation.isAllowed) {
      logger.warn('Input blocked by guardrails', {
        requestType,
        violations: inputValidation.violations,
        riskLevel: inputValidation.riskLevel
      });
      throw new Error('تم رفض المدخلات بواسطة نظام الحماية');
    }

    // Validate output
    const outputValidation = llmGuardrails.checkOutput(output, {
      ...(userId && { userId }),
      requestType
    });

    if (!outputValidation.isAllowed) {
      logger.warn('Output blocked by guardrails', {
        requestType,
        violations: outputValidation.violations,
        riskLevel: outputValidation.riskLevel
      });
      throw new Error('تم رفض المخرجات بواسطة نظام الحماية');
    }

    // Collect warnings
    if (inputValidation.warnings && inputValidation.warnings.length > 0) {
      warnings.push(...inputValidation.warnings.map(w => `Input: ${w}`));
    }
    if (outputValidation.warnings && outputValidation.warnings.length > 0) {
      warnings.push(...outputValidation.warnings.map(w => `Output: ${w}`));
    }

    return {
      sanitizedInput: inputValidation.sanitizedContent || input,
      sanitizedOutput: outputValidation.sanitizedContent || output,
      warnings
    };
  }

  /**
   * Execute a Gemini API request with caching, guardrails, metrics tracking, and error handling.
   * This is the core method that consolidates common logic from all public API methods.
   */
   
  private async executeGeminiRequest(config: GeminiRequestConfig): Promise<string> {
    const { requestType, prompt, originalInput, cacheKeyParams, cacheCategory, useAdaptiveTTL, errorMessage } = config;
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = generateGeminiCacheKey(cacheCategory, cacheKeyParams);

      // Determine TTL (adaptive or fixed based on config)
      let ttl: number;
      if (useAdaptiveTTL) {
        const stats = cacheService.getStats();
        ttl = getAdaptiveTTL(cacheCategory, stats.hitRate);
        logger.debug(`Using adaptive TTL: ${ttl}s (hit rate: ${stats.hitRate}%)`);
      } else {
        ttl = getGeminiCacheTTL(cacheCategory);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let apiResult: any = null;

      // Execute cached call with stale-while-revalidate
      const result = await cachedGeminiCall(
        cacheKey,
        ttl,
        async () => {
          // Apply guardrails to input
          this.applyGuardrails(prompt, '', requestType, 'system');

          // Execute with timeout to prevent hanging requests
          apiResult = await Promise.race([
            this.model.generateContent(prompt),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini request timeout')), this.REQUEST_TIMEOUT)
            ),
          ]);

           
          return (apiResult).response.text();
        },
        {
          staleWhileRevalidate: true,
          staleTTL: ttl * 2,
        }
      );

      // Apply guardrails to output
      const { sanitizedOutput, warnings } = this.applyGuardrails(
        originalInput,
        result,
        requestType,
        'system'
      );

      if (warnings.length > 0) {
        logger.warn('Guardrails warnings', { warnings, type: requestType });
      }

      // Track token usage and cost
      if (apiResult) {
        await this.trackTokenUsage(apiResult, cacheCategory);
      }

      // Track success metrics
      const duration = Date.now() - startTime;
      trackGeminiRequest(cacheCategory, duration, true);
      trackGeminiCache(result !== null);

      return sanitizedOutput;
    } catch (error) {
      // Track failure metrics
      const duration = Date.now() - startTime;
      trackGeminiRequest(cacheCategory, duration, false);
      trackGeminiCache(false);

      logger.error(`${requestType} failed:`, error);
      if (
        error instanceof Error &&
        (error.message === 'تم رفض المدخلات بواسطة نظام الحماية' ||
          error.message === 'تم رفض المخرجات بواسطة نظام الحماية')
      ) {
        throw error;
      }
      throw new Error(errorMessage);
    }
  }

  async analyzeText(text: string, analysisType: string): Promise<string> {
    // Map analysis type to valid cache category
    const validCategories: Record<string, GeminiCacheCategory> = {
      'characters': 'character',
      'themes': 'analysis',
      'structure': 'analysis',
      'quick': 'analysis',
      'detailed': 'analysis',
      'full': 'analysis',
      'default': 'analysis',
    };
    const cacheCategory: GeminiCacheCategory = validCategories[analysisType] || 'analysis';

    return this.executeGeminiRequest({
      requestType: `analyze-${analysisType}`,
      prompt: this.buildPrompt(text, analysisType),
      originalInput: text,
      cacheKeyParams: { text, analysisType },
      cacheCategory,
      useAdaptiveTTL: true,
      errorMessage: 'فشل في تحليل النص باستخدام الذكاء الاصطناعي',
    });
  }

  /**
   * Generate text from prompt through the centralized Gemini wrapper.
   * إنشاء نص من prompt عبر الخدمة المركزية
   */
  async generateText(prompt: string, _options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
       
      return (result).response.text();
    } catch (error) {
      logger.error('Error in generateText:', error);
      throw error;
    }
  }

  async generateJson<T>(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<T> {
    const text = await this.generateText(prompt, options);
    const trimmed = text.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    const payload = fenced?.[1]?.trim() ?? trimmed;
    return JSON.parse(payload) as T;
  }

  async reviewScreenplay(text: string): Promise<string> {
    const prompt = `أنت خبير في كتابة السيناريوهات العربية. قم بمراجعة النص التالي وقدم ملاحظات على:
1. استمرارية الحبكة
2. تطور الشخصيات
3. قوة الحوار
4. التناقضات في النص

قدم اقتراحات محددة لتحسين النص مع الحفاظ على الأسلوب العربي الأصيل.

النص:
${text}`;

    return this.executeGeminiRequest({
      requestType: 'screenplay-review',
      prompt,
      originalInput: text,
      cacheKeyParams: { text },
      cacheCategory: 'screenplay',
      errorMessage: 'فشل في مراجعة السيناريو',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async chatWithAI(message: string, context?: any): Promise<string> {
    const prompt = context
      ? `أنت مساعد ذكاء اصطناعي متخصص في تحليل الأعمال الدرامية العربية. استخدم السياق التالي للإجابة على السؤال:

السياق: ${JSON.stringify(context)}

السؤال: ${message}`
      : `أنت مساعد ذكاء اصطناعي متخصص في تحليل الأعمال الدرامية العربية.

السؤال: ${message}`;

    return this.executeGeminiRequest({
      requestType: 'ai-chat',
      prompt,
      originalInput: message,
      cacheKeyParams: { message, context },
      cacheCategory: 'chat',
      errorMessage: 'فشل في التواصل مع الذكاء الاصطناعي',
    });
  }

  async getShotSuggestion(sceneDescription: string, shotType: string): Promise<string> {
    const prompt = `أنت خبير في إخراج الأفلام العربية. قدم اقتراحًا مفصلًا لنوع اللقطة "${shotType}" للمشهد التالي:

وصف المشهد: ${sceneDescription}

قدم اقتراحات تشمل:
1. زاوية الكاميرا
2. حركة الكاميرا
3. التكوين البصري
4. الإضاءة المقترحة
5. المدة التقديرية`;

    return this.executeGeminiRequest({
      requestType: 'shot-suggestion',
      prompt,
      originalInput: sceneDescription,
      cacheKeyParams: { sceneDescription, shotType },
      cacheCategory: 'shot-suggestion',
      errorMessage: 'فشل في توليد اقتراحات اللقطة',
    });
  }

  private buildPrompt(text: string, analysisType: string): string {
    const prompts = {
      characters: `حلل الشخصيات في النص التالي واستخرج:
1. الشخصيات الرئيسية
2. العلاقات بينها
3. تطور كل شخصية

النص: ${text}`,
      
      themes: `حلل المواضيع والأفكار في النص التالي:
1. الموضوع الرئيسي
2. المواضيع الفرعية
3. الرسائل المضمنة

النص: ${text}`,
  
      structure: `حلل البنية الدرامية للنص التالي:
1. البداية والعقدة والحل
2. نقاط التحول
3. الإيقاع الدرامي

النص: ${text}`,

      relationships: `حلل شبكة العلاقات والصراعات في النص التالي:
1. الصراعات الرئيسية والفرعية
2. التحالفات بين الشخصيات
3. ميزان القوى وتغيراته

النص: ${text}`,

      effectiveness: `قم بقياس فعالية النص الدرامي من خلال:
1. قوة الحوار وتأثيره
2. بناء التشويق والتوتر
3. أصالة الفكرة وجاذبيتها للجمهور المستهدف

النص: ${text}`,

      symbolism: `حلل الرموز والديناميكيات الخفية في النص:
1. الرموز البصرية والمجازية
2. الدوافع النفسية للشخصيات
3. الرسائل العميقة وغير المباشرة

النص: ${text}`,

      summary: `بناءً على التحليلات المقدمة، قم بإنشاء تقرير نهائي متكامل وموجز:
${text}`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.characters;
  }
}

/**
 * Singleton instance export
 */
let geminiServiceInstance: GeminiService | null = null;

function resolveGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }

  return geminiServiceInstance;
}

export const geminiService = new Proxy({} as GeminiService, {
  get(_target, property, _receiver) {
    const service = resolveGeminiService();
    const value = Reflect.get(service, property, service);

    return typeof value === 'function' ? value.bind(service) : value;
  },
});

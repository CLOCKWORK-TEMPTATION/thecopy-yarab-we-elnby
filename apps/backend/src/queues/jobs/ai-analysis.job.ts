/**
 * معالج مهام تحليل الذكاء الاصطناعي في الخلفية
 * AI Analysis Background Job Processor
 *
 * @module ai-analysis.job
 * @description
 * يعالج مهام تحليل الذكاء الاصطناعي طويلة المدى في الخلفية.
 * يدعم تحليل المشاهد والشخصيات واللقطات والمشاريع.
 */

import { Job } from 'bullmq';

import { logger } from '@/lib/logger';
import { queueManager, QueueName } from '@/queues/queue.config';

/**
 * واجهة بيانات مهمة تحليل الذكاء الاصطناعي
 * 
 * @description
 * تحدد هيكل البيانات المطلوبة لتنفيذ مهمة التحليل
 */
export interface AIAnalysisJobData {
  /** نوع الكيان المراد تحليله */
  type: 'scene' | 'character' | 'shot' | 'project';
  /** معرّف الكيان */
  entityId: string;
  /** معرّف المستخدم صاحب الطلب */
  userId: string;
  /** نوع التحليل المطلوب */
  analysisType: 'full' | 'quick' | 'detailed';
  /** خيارات إضافية للتحليل */
  options?: Record<string, unknown>;
}

/**
 * واجهة نتيجة تحليل الذكاء الاصطناعي
 * 
 * @description
 * تحدد هيكل النتيجة المُرجعة من مهمة التحليل
 */
export interface AIAnalysisResult {
  /** معرّف الكيان المُحلّل */
  entityId: string;
  /** نوع الكيان */
  entityType: string;
  /** نتيجة التحليل */
  analysis: AnalysisOutput;
  /** تاريخ إنشاء النتيجة */
  generatedAt: Date;
  /** وقت المعالجة بالميلي ثانية */
  processingTime: number;
}

/**
 * واجهة مخرجات التحليل
 */
interface AnalysisOutput {
  /** النتيجة الخام من Gemini */
  raw: string;
  /** تاريخ التحليل */
  analyzedAt: string;
  /** نوع التحليل */
  analysisType: string;
}

/**
 * واجهة نتيجة تحليل المشهد
 */
interface SceneAnalysisResult {
  sceneId: string;
  analysis: AnalysisOutput;
}

/**
 * واجهة نتيجة تحليل الشخصية
 */
interface CharacterAnalysisResult {
  characterId: string;
  analysis: AnalysisOutput;
}

/**
 * واجهة نتيجة تحليل اللقطة
 */
interface ShotAnalysisResult {
  shotId: string;
  analysis: AnalysisOutput;
}

/**
 * واجهة نتيجة تحليل المشروع
 */
interface ProjectAnalysisResult {
  projectId: string;
  analysis: AnalysisOutput;
}

/**
 * معالجة مهمة تحليل الذكاء الاصطناعي
 * 
 * @description
 * الوظيفة الرئيسية التي تعالج مهام التحليل وتوجهها للمعالج المناسب
 * 
 * @param job - كائن المهمة من BullMQ يحتوي على البيانات المطلوبة
 * @returns وعد بنتيجة التحليل
 * @throws خطأ إذا فشلت عملية التحليل
 */
async function processAIAnalysis(job: Job<AIAnalysisJobData>): Promise<AIAnalysisResult> {
  const startTime = Date.now();
  const { type, entityId, analysisType, options } = job.data;

  logger.info("بدء معالجة مهمة تحليل الذكاء الاصطناعي", {
    jobId: job.id,
    type,
    entityId,
    analysisType,
  });

  // تحديث تقدم المهمة
  await job.updateProgress(10);

  try {
    let analysisResult: SceneAnalysisResult | CharacterAnalysisResult | ShotAnalysisResult | ProjectAnalysisResult;

    // توجيه للمعالج المناسب حسب نوع الكيان
    switch (type) {
      case 'scene':
        analysisResult = await analyzeScene(entityId, analysisType, options);
        break;
      case 'character':
        analysisResult = await analyzeCharacter(entityId, analysisType, options);
        break;
      case 'shot':
        analysisResult = await analyzeShot(entityId, analysisType, options);
        break;
      case 'project':
        analysisResult = await analyzeProject(entityId, analysisType, options);
        break;
      default:
        throw new Error('نوع تحليل غير معروف');
    }

    await job.updateProgress(100);

    const processingTime = Date.now() - startTime;

    logger.info("اكتملت مهمة التحليل بنجاح", {
      jobId: job.id,
      processingTime,
    });

    return {
      entityId,
      entityType: type,
      analysis: analysisResult.analysis,
      generatedAt: new Date(),
      processingTime,
    };
  } catch (error) {
    logger.error("فشل في معالجة مهمة التحليل", {
      jobId: job.id,
      error: error instanceof Error ? error.message : "خطأ غير معروف",
    });
    throw error;
  }
}

/**
 * الحصول على خدمة Gemini (تحميل كسول لتجنب التبعيات الدائرية)
 * 
 * @description
 * يقوم بتحميل خدمة Gemini بشكل ديناميكي عند الحاجة
 * 
 * @returns وعد بنسخة من خدمة Gemini
 */
async function getGeminiService(): Promise<InstanceType<typeof import('@/services/gemini.service').GeminiService>> {
  const { GeminiService } = await import('@/services/gemini.service');
  return new GeminiService();
}

/**
 * تحليل مشهد
 * 
 * @description
 * يقوم بتحليل مشهد محدد باستخدام خدمة Gemini
 * 
 * @param sceneId - معرّف المشهد
 * @param analysisType - نوع التحليل المطلوب
 * @param options - خيارات إضافية تشمل نص المشهد
 * @returns وعد بنتيجة تحليل المشهد
 */
async function analyzeScene(
  sceneId: string,
  analysisType: string,
  options?: Record<string, unknown>
): Promise<SceneAnalysisResult> {
  const gemini = await getGeminiService();
  const sceneText =
    typeof options?.["text"] === 'string'
      ? options["text"]
      : `Scene ${sceneId} content`;

  // جلب بيانات المشهد (مكان مخصص - استبدل باستعلام قاعدة البيانات الفعلي)
  // استخدام Gemini لتحليل المشهد
  const analysis = await gemini.analyzeText(sceneText, 'structure');

  return {
    sceneId,
    analysis: {
      raw: analysis,
      analyzedAt: new Date().toISOString(),
      analysisType,
    },
  };
}

/**
 * تحليل شخصية
 * 
 * @description
 * يقوم بتحليل شخصية محددة باستخدام خدمة Gemini
 * 
 * @param characterId - معرّف الشخصية
 * @param analysisType - نوع التحليل المطلوب
 * @param options - خيارات إضافية تشمل نص الشخصية
 * @returns وعد بنتيجة تحليل الشخصية
 */
async function analyzeCharacter(
  characterId: string,
  analysisType: string,
  options?: Record<string, unknown>
): Promise<CharacterAnalysisResult> {
  const gemini = await getGeminiService();
  const characterText =
    typeof options?.["text"] === 'string'
      ? options["text"]
      : `Character ${characterId} information`;

  // جلب بيانات الشخصية (مكان مخصص - استبدل باستعلام قاعدة البيانات الفعلي)
  // استخدام Gemini لتحليل الشخصية
  const analysis = await gemini.analyzeText(characterText, 'characters');

  return {
    characterId,
    analysis: {
      raw: analysis,
      analyzedAt: new Date().toISOString(),
      analysisType,
    },
  };
}

/**
 * تحليل لقطة
 * 
 * @description
 * يقوم بتحليل لقطة محددة باستخدام خدمة Gemini
 * 
 * @param shotId - معرّف اللقطة
 * @param analysisType - نوع التحليل المطلوب
 * @param options - خيارات إضافية تشمل نص اللقطة
 * @returns وعد بنتيجة تحليل اللقطة
 */
async function analyzeShot(
  shotId: string,
  analysisType: string,
  options?: Record<string, unknown>
): Promise<ShotAnalysisResult> {
  const gemini = await getGeminiService();
  const shotText =
    typeof options?.["text"] === 'string'
      ? options["text"]
      : `Shot ${shotId} details`;

  // جلب بيانات اللقطة (مكان مخصص - استبدل باستعلام قاعدة البيانات الفعلي)
  // استخدام Gemini لتحليل اللقطة
  const analysis = await gemini.analyzeText(shotText, analysisType);

  return {
    shotId,
    analysis: {
      raw: analysis,
      analyzedAt: new Date().toISOString(),
      analysisType,
    },
  };
}

/**
 * تحليل مشروع
 * 
 * @description
 * يقوم بتحليل مشروع كامل باستخدام خدمة Gemini
 * 
 * @param projectId - معرّف المشروع
 * @param analysisType - نوع التحليل المطلوب
 * @param options - خيارات إضافية تشمل نص المشروع
 * @returns وعد بنتيجة تحليل المشروع
 */
async function analyzeProject(
  projectId: string,
  analysisType: string,
  options?: Record<string, unknown>
): Promise<ProjectAnalysisResult> {
  const gemini = await getGeminiService();
  const projectText =
    typeof options?.["text"] === 'string'
      ? options["text"]
      : `Project ${projectId} overview`;

  // جلب بيانات المشروع (مكان مخصص - استبدل باستعلام قاعدة البيانات الفعلي)
  // استخدام Gemini لتحليل المشروع بالكامل
  const analysis = await gemini.analyzeText(projectText, 'structure');

  return {
    projectId,
    analysis: {
      raw: analysis,
      analyzedAt: new Date().toISOString(),
      analysisType,
    },
  };
}

/**
 * إضافة مهمة تحليل ذكاء اصطناعي إلى قائمة الانتظار
 * 
 * @description
 * يقوم بإنشاء مهمة جديدة وإضافتها إلى قائمة انتظار التحليل
 * 
 * @param data - بيانات المهمة المطلوبة
 * @returns وعد بمعرّف المهمة المُنشأة
 */
export async function queueAIAnalysis(data: AIAnalysisJobData): Promise<string> {
  const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

  const job = await queue.add('ai-analysis', data, {
    priority: data.analysisType === 'quick' ? 1 : 2,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info("تم إضافة مهمة التحليل إلى قائمة الانتظار", {
    jobId: job.id,
    type: data.type,
    entityId: data.entityId,
  });

  return job.id!;
}

/**
 * تسجيل عامل تحليل الذكاء الاصطناعي
 * 
 * @description
 * يقوم بتسجيل العامل المسؤول عن معالجة مهام التحليل
 * يدعم معالجة 3 مهام بشكل متزامن مع حد أقصى 5 مهام في الثانية
 */
export function registerAIAnalysisWorker(): void {
  queueManager.registerWorker(QueueName.AI_ANALYSIS, processAIAnalysis, {
    concurrency: 3, // معالجة 3 تحليلات بشكل متزامن
    limiter: {
      max: 5,
      duration: 1000, // حد أقصى 5 مهام في الثانية
    },
  });

  logger.info("تم تسجيل عامل تحليل الذكاء الاصطناعي");
}

export const aiAnalysisJob = {
  queueAIAnalysis,
  registerAIAnalysisWorker,
};

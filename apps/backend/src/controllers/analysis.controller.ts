import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { queueAIAnalysis } from '@/queues/jobs/ai-analysis.job';
import { AnalysisService } from '@/services/analysis.service';
import { z } from 'zod';

// تم إيقاف استيراد كود من الواجهة الأمامية لتجنب أخطاء rootDir في TypeScript

const runSevenStationsBodySchema = z.object({
  text: z.string().trim().min(1),
  async: z.boolean().optional(),
}).passthrough();

function getUserId(req: Request): string {
  return (req as unknown as { user?: { id: string } }).user?.id || 'anonymous';
}

async function handleAsyncPipeline(req: Request, res: Response, text: string): Promise<void> {
  const jobId = await queueAIAnalysis({
    type: 'project',
    entityId: `text_${Date.now()}`,
    userId: getUserId(req),
    analysisType: 'full',
    options: { text }
  });

  logger.info('تم إضافة مهمة التحليل إلى قائمة الانتظار', { jobId });

  res.json({
    success: true,
    jobId,
    message: 'تم إضافة التحليل إلى قائمة الانتظار',
    checkStatus: `/api/queue/jobs/${jobId}`,
    timestamp: new Date().toISOString()
  });
}

function buildPipelineResponse(
  pipelineResult: { pipelineMetadata?: { averageConfidence?: number }; stationOutputs: { station7: { details?: Record<string, unknown> } } },
  startTime: number
) {
  const endTime = Date.now();
  const computedConfidence = pipelineResult.pipelineMetadata?.averageConfidence ?? 0.85;
  const finalReport = pipelineResult.stationOutputs.station7.details?.["finalReport"];

  return {
    response: {
      success: true,
      report: typeof finalReport === 'string' ? finalReport : 'تحليل غير متاح',
      confidence: computedConfidence,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
      stationsCount: 7,
      detailedResults: pipelineResult.stationOutputs,
      metadata: pipelineResult.pipelineMetadata
    },
    computedConfidence,
    executionTime: endTime - startTime
  };
}

export class AnalysisController {
  private analysisService: AnalysisService;

  constructor() {
    this.analysisService = new AnalysisService();
  }

  /**
   * Run Seven Stations Pipeline (asynchronous via queue)
   * Returns a job ID that can be used to check the status
   */
  async runSevenStationsPipeline(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const validation = runSevenStationsBodySchema.safeParse(req.body);
      if (!validation.success) {
        res["status"](400).json({
          error: 'النص مطلوب ولا يمكن أن يكون فارغاً',
          code: 'INVALID_TEXT'
        });
        return;
      }
      const { text, async: isAsync } = validation.data;

      logger.info('بدء تشغيل نظام المحطات السبع', {
        textLength: text.length,
        async: isAsync === true,
        timestamp: new Date().toISOString()
      });

      if (isAsync === true) {
        await handleAsyncPipeline(req, res, text);
        return;
      }

      const pipelineResult = await this.analysisService.runFullPipeline({
        fullText: text,
        projectName: 'تحليل سيناريو',
        language: 'ar',
        context: {},
        flags: { runStations: true, fastMode: false, skipValidation: false, verboseLogging: false },
        agents: { temperature: 0.2 },
      });

      const { response, computedConfidence, executionTime } = buildPipelineResponse(pipelineResult, startTime);
      res.json(response);

      logger.info('تم إكمال معالجة مبسّطة بنجاح', { executionTime, confidence: computedConfidence });
    } catch (error) {
      logger.error('فشل في تنفيذ نظام المحطات السبع:', error);

      res["status"](500).json({
        error: 'حدث خطأ أثناء تحليل النص',
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
        code: 'ANALYSIS_FAILED'
      });
    }
  }

  async getStationDetails(_req: Request, res: Response): Promise<void> {
    try {
      const stationInfo = {
        stations: [
          { id: 'S1', name: 'التحليل التأسيسي', description: 'تحليل البنية الأساسية للنص' },
          { id: 'S2', name: 'التحليل المفاهيمي', description: 'استخراج الثيمات والمفاهيم' },
          { id: 'S3', name: 'شبكة الصراعات', description: 'تحليل العلاقات والصراعات' },
          { id: 'S4', name: 'مقاييس الفعالية', description: 'قياس فعالية النص الدرامي' },
          { id: 'S5', name: 'الديناميكية والرمزية', description: 'تحليل الرموز والديناميكية' },
          { id: 'S6', name: 'الفريق الأحمر', description: 'التحليل النقدي متعدد الوكلاء' },
          { id: 'S7', name: 'التقرير النهائي', description: 'إنشاء التقرير الشامل' }
        ],
        totalStations: 7,
        executionOrder: 'تسلسلي (1→7)',
        outputFormat: 'نص عربي منسق'
      };
      
      res.json(stationInfo);
    } catch (error) {
      logger.error('فشل في جلب معلومات المحطات:', error);
      res["status"](500).json({ error: 'فشل في جلب معلومات المحطات' });
    }
  }
}

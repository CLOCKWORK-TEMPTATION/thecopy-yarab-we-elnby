import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { queueAIAnalysis } from '@/queues/jobs/ai-analysis.job';
import { AnalysisService } from '@/services/analysis.service';
import {
  analysisStreamRegistry,
  type StationId,
} from '@/services/analysisStream.registry';
import { z } from 'zod';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import { jsPDF } from 'jspdf';

// تم إيقاف استيراد كود من الواجهة الأمامية لتجنب أخطاء rootDir في TypeScript

const runSevenStationsBodySchema = z.object({
  text: z.string().trim().min(1),
  async: z.boolean().optional(),
}).passthrough();

const startStreamBodySchema = z.object({
  text: z.string().trim().min(1),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
});

const retryBodySchema = z.object({
  text: z.string().trim().min(1),
});

const exportBodySchema = z.object({
  format: z.enum(['json', 'docx', 'pdf']),
});

function getUserId(req: Request): string {
  return (req as unknown as { user?: { id: string } }).user?.id || 'anonymous';
}

function sessionBelongsTo(metadata: Record<string, unknown>, ownerId: string): boolean {
  const owner = metadata['ownerId'];
  if (typeof owner !== 'string') return true; // legacy/anonymous sessions: open
  return owner === ownerId;
}

function parseLastEventId(header: string | string[] | undefined): number | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * DOCX export — Arabic / RTL is fully supported by Word readers when paragraphs
 * are flagged `bidirectional: true`. This is a real RTL export.
 */
function buildDocx(snap: { projectName: string; finalReport: string | null; stations: Array<{ id: number; name: string; status: string; output: unknown; error: string | null }> }) {
  const rtlPara = (text: string, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph =>
    new Paragraph({
      text,
      heading,
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
    });

  const children: Paragraph[] = [rtlPara(snap.projectName, HeadingLevel.TITLE)];
  for (const s of snap.stations) {
    children.push(rtlPara(`المحطة ${s.id} — ${s.name}`, HeadingLevel.HEADING_1));
    children.push(rtlPara(`الحالة: ${s.status}`));
    if (s.error) children.push(rtlPara(`خطأ: ${s.error}`));
    if (s.output) {
      const text = stationOutputToText(s.output);
      for (const line of text.split('\n')) children.push(rtlPara(line));
    }
  }
  if (snap.finalReport) {
    children.push(rtlPara('التقرير النهائي', HeadingLevel.HEADING_1));
    for (const line of snap.finalReport.split('\n')) children.push(rtlPara(line));
  }
  return new Document({ sections: [{ properties: {}, children }] });
}

/**
 * PDF export — KNOWN LIMITATION: jsPDF's bundled core fonts (Helvetica/Times/
 * Courier) do not contain Arabic glyphs and jsPDF performs no bidi reshaping.
 * Embedding an Arabic font + reshaper is intentionally out of scope for this
 * fixup. The PDF therefore renders Arabic strings as missing glyphs / boxes.
 *
 * Until an Arabic font is bundled, the PDF is best-effort and is generated as
 * an English-only structural summary with a clear notice on the first page
 * pointing the user to the DOCX export for a faithful Arabic / RTL rendering.
 */
function buildPdf(snap: { projectName: string; finalReport: string | null; stations: Array<{ id: number; name: string; status: string; output: unknown; error: string | null }> }): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;
  const lineHeight = 14;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

  const writeLines = (text: string, size = 10) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  // Honest notice — keeps the PDF usable for non-Arabic workflows and tells
  // the user where to go for a real RTL export.
  writeLines('Notice: PDF export uses jsPDF core fonts which do not include Arabic glyphs.', 9);
  writeLines('For a faithful Arabic / RTL rendering, please use the DOCX export instead.', 9);
  y += lineHeight;

  writeLines(asciiSafe(snap.projectName), 16);
  y += lineHeight;
  for (const s of snap.stations) {
    writeLines(`Station ${s.id} - ${asciiSafe(s.name)}`, 13);
    writeLines(`Status: ${s.status}`);
    if (s.error) writeLines(`Error: ${asciiSafe(s.error)}`);
    if (s.output) writeLines(asciiSafe(stationOutputToText(s.output)));
    y += lineHeight;
  }
  if (snap.finalReport) {
    writeLines('Final Report', 13);
    writeLines(asciiSafe(snap.finalReport));
  }
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Strip characters that the bundled jsPDF core fonts cannot render so the
 * PDF doesn't fill with empty boxes. This is a deliberate downgrade — see
 * the buildPdf docstring above.
 */
function asciiSafe(text: string): string {
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?');
}

function stationOutputToText(output: unknown): string {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object') {
    const details = (output as { details?: { fullAnalysis?: unknown } }).details;
    if (details && typeof details.fullAnalysis === 'string') return details.fullAnalysis;
    try { return JSON.stringify(output, null, 2); } catch { return ''; }
  }
  return '';
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

  // ==========================================================================
  // Streaming endpoints (SSE-only)
  // ==========================================================================

  /**
   * Create a streaming session and start running the pipeline.
   * Returns the analysisId the client uses to subscribe to /stream/:id.
   */
  async startStreamSession(req: Request, res: Response): Promise<void> {
    try {
      const validation = startStreamBodySchema.safeParse(req.body);
      if (!validation.success) {
        res["status"](400).json({ error: 'البيانات غير صحيحة', code: 'INVALID_INPUT', details: validation.error.flatten() });
        return;
      }
      const { text, projectId, projectName } = validation.data;
      const ownerId = getUserId(req);

      const session = analysisStreamRegistry.create({
        projectId: projectId ?? null,
        projectName: projectName || 'تحليل درامي شامل',
        textLength: text.length,
        ownerId,
      });
      const analysisId = session.snapshot.analysisId;

      // Fire-and-forget; events flow through the SSE channel.
      void this.analysisService
        .runFullPipelineStreaming({ analysisId, fullText: text, projectName: session.snapshot.projectName })
        .catch((err) => {
          logger.error('Streaming pipeline crashed', { analysisId, err });
        });

      res.json({ success: true, analysisId });
    } catch (error) {
      logger.error('فشل بدء جلسة بث التحليل:', error);
      res["status"](500).json({ error: 'تعذر بدء التحليل', code: 'START_FAILED' });
    }
  }

  /**
   * SSE endpoint. Honors `Last-Event-ID` for replay-on-reconnect.
   */
  async streamEvents(req: Request, res: Response): Promise<void> {
    const analysisId = String(req.params['analysisId'] || '');
    const session = analysisStreamRegistry.get(analysisId);
    if (!session) {
      res["status"](404).json({ error: 'الجلسة غير موجودة أو انتهت' });
      return;
    }
    if (!sessionBelongsTo(session.snapshot.metadata, getUserId(req))) {
      res["status"](403).json({ error: 'غير مصرح' });
      return;
    }

    const lastIdHeader = req.headers['last-event-id'];
    const lastEventId = parseLastEventId(lastIdHeader);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`retry: 5000\n\n`);

    const writer = (chunk: string) => res.write(chunk);
    const attached = analysisStreamRegistry.attach(analysisId, writer, lastEventId);
    if (!attached.ok) {
      res.end();
      return;
    }
    for (const e of attached.replay) {
      res.write(`id: ${e.id}\nevent: ${e.event}\ndata: ${e.data}\n\n`);
    }

    const heartbeat = setInterval(() => {
      try { res.write(`: ping\n\n`); } catch { /* ignore */ }
    }, 15_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      analysisStreamRegistry.detach(analysisId, writer);
    });
  }

  /**
   * Snapshot of the current session state — used on resume.
   */
  async getAnalysisSnapshot(req: Request, res: Response): Promise<void> {
    const analysisId = String(req.params['analysisId'] || '');
    const snap = analysisStreamRegistry.getSnapshot(analysisId);
    if (!snap) {
      res["status"](404).json({ error: 'الجلسة غير موجودة' });
      return;
    }
    if (!sessionBelongsTo(snap.metadata, getUserId(req))) {
      res["status"](403).json({ error: 'غير مصرح' });
      return;
    }
    res.json({ success: true, snapshot: snap });
  }

  /**
   * Re-run a single station for an existing session.
   */
  async retryStation(req: Request, res: Response): Promise<void> {
    try {
      const analysisId = String(req.params['analysisId'] || '');
      const stationIdRaw = Number(req.params['stationId']);
      if (!Number.isInteger(stationIdRaw) || stationIdRaw < 1 || stationIdRaw > 7) {
        res["status"](400).json({ error: 'stationId غير صالح' });
        return;
      }
      const validation = retryBodySchema.safeParse(req.body);
      if (!validation.success) {
        res["status"](400).json({ error: 'النص مطلوب' });
        return;
      }
      const session = analysisStreamRegistry.get(analysisId);
      if (!session) {
        res["status"](404).json({ error: 'الجلسة غير موجودة' });
        return;
      }
      if (!sessionBelongsTo(session.snapshot.metadata, getUserId(req))) {
        res["status"](403).json({ error: 'غير مصرح' });
        return;
      }

      const output = await this.analysisService.retryStation({
        analysisId,
        stationId: stationIdRaw as StationId,
        fullText: validation.data.text,
        projectName: session.snapshot.projectName,
      });
      res.json({ success: true, stationId: stationIdRaw, output });
    } catch (error) {
      logger.error('فشل إعادة تشغيل المحطة:', error);
      res["status"](500).json({ error: 'تعذر إعادة التشغيل' });
    }
  }

  /**
   * Export a completed snapshot as JSON / DOCX / PDF.
   */
  async exportAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const analysisId = String(req.params['analysisId'] || '');
      const validation = exportBodySchema.safeParse(req.body);
      if (!validation.success) {
        res["status"](400).json({ error: 'صيغة التصدير غير صحيحة' });
        return;
      }
      const snap = analysisStreamRegistry.getSnapshot(analysisId);
      if (!snap) {
        res["status"](404).json({ error: 'الجلسة غير موجودة' });
        return;
      }
      if (!sessionBelongsTo(snap.metadata, getUserId(req))) {
        res["status"](403).json({ error: 'غير مصرح' });
        return;
      }

      const filenameBase = `analysis-${analysisId}`;
      switch (validation.data.format) {
        case 'json': {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
          res.end(JSON.stringify(snap, null, 2));
          return;
        }
        case 'docx': {
          const doc = buildDocx(snap);
          const buffer = await Packer.toBuffer(doc);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.docx"`);
          res.end(buffer);
          return;
        }
        case 'pdf': {
          const buffer = buildPdf(snap);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
          res.end(buffer);
          return;
        }
      }
    } catch (error) {
      logger.error('فشل تصدير التحليل:', error);
      res["status"](500).json({ error: 'تعذر تصدير التحليل' });
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

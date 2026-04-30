import { createHash, randomUUID } from "crypto";

import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from "docx";
import { Request, Response } from "express";
import { jsPDF } from "jspdf";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { queueAIAnalysis } from "@/queues/jobs/ai-analysis.job";
import { AnalysisService } from "@/services/analysis.service";
import {
  analysisStreamRegistry,
  type StationId,
} from "@/services/analysisStream.registry";

// تم إيقاف استيراد كود من الواجهة الأمامية لتجنب أخطاء rootDir في TypeScript

const runSevenStationsBodySchema = z
  .object({
    text: z.string().trim().min(1),
    async: z.boolean().optional(),
  })
  .passthrough();

const startStreamBodySchema = z.object({
  text: z.string().trim().min(1),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
});

const retryBodySchema = z.object({
  text: z.string().trim().min(1),
});

const exportBodySchema = z.object({
  format: z.enum(["json", "docx", "pdf"]),
});

function getUserId(req: Request): string {
  return (req as unknown as { user?: { id: string } }).user?.id ?? "anonymous";
}

function getForwardedIp(req: Request): string | null {
  const headers = req.headers ?? {};
  const forwardedFor = headers["x-forwarded-for"];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (!raw) return null;
  const ip = raw.split(",")[0]?.trim();
  if (ip === undefined || ip.length === 0) return null;
  return ip;
}

function getPublicOwnerId(req: Request): string {
  const ip =
    getForwardedIp(req) ?? req.ip ?? req.socket.remoteAddress ?? "unknown-ip";
  const userAgent = req.get("user-agent") ?? "unknown-agent";
  const digest = createHash("sha256")
    .update(`${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
  return `public:${digest}`;
}

function sessionBelongsTo(
  metadata: Record<string, unknown>,
  ownerId: string,
): boolean {
  const owner = metadata["ownerId"];
  if (typeof owner !== "string") return true; // legacy/anonymous sessions: open
  return owner === ownerId;
}

function parseLastEventId(
  header: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function sendAnalysisError(
  res: Response,
  status: number,
  error: string,
  errorCode: string,
): void {
  res.status(status).json({
    success: false,
    error,
    errorCode,
    code: errorCode,
    traceId: `analysis-${randomUUID()}`,
  });
}

/**
 * DOCX export — Arabic / RTL is fully supported by Word readers when paragraphs
 * are flagged `bidirectional: true`. This is a real RTL export.
 */
function buildDocx(snap: {
  projectName: string;
  finalReport: string | null;
  stations: {
    id: number;
    name: string;
    status: string;
    output: unknown;
    error: string | null;
  }[];
}) {
  const rtlPara = (
    text: string,
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel],
  ): Paragraph =>
    new Paragraph({
      text,
      ...(heading !== undefined ? { heading } : {}),
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
    });

  const children: Paragraph[] = [rtlPara(snap.projectName, HeadingLevel.TITLE)];
  for (const s of snap.stations) {
    children.push(
      rtlPara(`المحطة ${s.id} — ${s.name}`, HeadingLevel.HEADING_1),
    );
    children.push(rtlPara(`الحالة: ${s.status}`));
    if (s.error) children.push(rtlPara(`خطأ: ${s.error}`));
    if (s.output) {
      const text = stationOutputToText(s.output);
      for (const line of text.split("\n")) children.push(rtlPara(line));
    }
  }
  if (snap.finalReport) {
    children.push(rtlPara("التقرير النهائي", HeadingLevel.HEADING_1));
    for (const line of snap.finalReport.split("\n"))
      children.push(rtlPara(line));
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
function buildPdf(snap: {
  projectName: string;
  finalReport: string | null;
  stations: {
    id: number;
    name: string;
    status: string;
    output: unknown;
    error: string | null;
  }[];
}): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
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
  writeLines(
    "Notice: PDF export uses jsPDF core fonts which do not include Arabic glyphs.",
    9,
  );
  writeLines(
    "For a faithful Arabic / RTL rendering, please use the DOCX export instead.",
    9,
  );
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
    writeLines("Final Report", 13);
    writeLines(asciiSafe(snap.finalReport));
  }
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Strip characters that the bundled jsPDF core fonts cannot render so the
 * PDF doesn't fill with empty boxes. This is a deliberate downgrade — see
 * the buildPdf docstring above.
 */
function asciiSafe(text: string): string {
  return Array.from(text)
    .map((character) => {
      const code = character.charCodeAt(0);
      const isSupported =
        code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
      return isSupported ? character : "?";
    })
    .join("");
}

function stationOutputToText(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const details = (output as { details?: { fullAnalysis?: unknown } })
      .details;
    if (details && typeof details.fullAnalysis === "string")
      return details.fullAnalysis;
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return "";
    }
  }
  return "";
}

async function handleAsyncPipeline(
  req: Request,
  res: Response,
  text: string,
): Promise<void> {
  const jobId = await queueAIAnalysis({
    type: "project",
    entityId: `text_${Date.now()}`,
    userId: getUserId(req),
    analysisType: "full",
    options: { text },
  });

  logger.info("تم إضافة مهمة التحليل إلى قائمة الانتظار", { jobId });

  res.json({
    success: true,
    jobId,
    message: "تم إضافة التحليل إلى قائمة الانتظار",
    checkStatus: `/api/queue/jobs/${jobId}`,
    timestamp: new Date().toISOString(),
  });
}

function buildPipelineResponse(
  pipelineResult: {
    pipelineMetadata?: { averageConfidence?: number };
    stationOutputs: { station7: { details?: Record<string, unknown> } };
  },
  startTime: number,
) {
  const endTime = Date.now();
  const computedConfidence =
    pipelineResult.pipelineMetadata?.averageConfidence ?? 0.85;
  const finalReport =
    pipelineResult.stationOutputs.station7.details?.["finalReport"];

  return {
    response: {
      success: true,
      report: typeof finalReport === "string" ? finalReport : "تحليل غير متاح",
      confidence: computedConfidence,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
      stationsCount: 7,
      detailedResults: pipelineResult.stationOutputs,
      metadata: pipelineResult.pipelineMetadata,
    },
    computedConfidence,
    executionTime: endTime - startTime,
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
        sendAnalysisError(
          res,
          400,
          "النص مطلوب ولا يمكن أن يكون فارغاً",
          "INVALID_TEXT",
        );
        return;
      }
      const { text, async: isAsync } = validation.data;

      logger.info("بدء تشغيل نظام المحطات السبع", {
        textLength: text.length,
        async: isAsync === true,
        timestamp: new Date().toISOString(),
      });

      if (isAsync === true) {
        await handleAsyncPipeline(req, res, text);
        return;
      }

      const pipelineResult = await this.analysisService.runFullPipeline({
        fullText: text,
        projectName: "تحليل سيناريو",
        language: "ar",
        context: {},
        flags: {
          runStations: true,
          fastMode: false,
          skipValidation: false,
          verboseLogging: false,
        },
        agents: { temperature: 0.2 },
      });

      const { response, computedConfidence, executionTime } =
        buildPipelineResponse(pipelineResult, startTime);
      res.json(response);

      logger.info("تم إكمال معالجة مبسّطة بنجاح", {
        executionTime,
        confidence: computedConfidence,
      });
    } catch (error) {
      logger.error("فشل في تنفيذ نظام المحطات السبع:", error);

      sendAnalysisError(
        res,
        500,
        "حدث خطأ أثناء تحليل النص",
        "ANALYSIS_FAILED",
      );
    }
  }

  // ==========================================================================
  // Streaming endpoints (SSE-only)
  // ==========================================================================

  /**
   * Create a streaming session and start running the pipeline.
   * Returns the analysisId the client uses to subscribe to /stream/:id.
   */
  startStreamSession(req: Request, res: Response): void {
    this.startStreamSessionForOwner(req, res, getUserId(req));
  }

  startPublicStreamSession(req: Request, res: Response): void {
    this.startStreamSessionForOwner(req, res, getPublicOwnerId(req));
  }

  private startStreamSessionForOwner(
    req: Request,
    res: Response,
    ownerId: string,
  ): void {
    try {
      const validation = startStreamBodySchema.safeParse(req.body);
      if (!validation.success) {
        sendAnalysisError(res, 400, "البيانات غير صحيحة", "INVALID_INPUT");
        return;
      }
      const { text, projectId, projectName } = validation.data;

      const session = analysisStreamRegistry.create({
        projectId: projectId ?? null,
        projectName: projectName ?? "تحليل درامي شامل",
        textLength: text.length,
        ownerId,
      });
      const analysisId = session.snapshot.analysisId;

      // Fire-and-forget; events flow through the SSE channel.
      void this.analysisService
        .runFullPipelineStreaming({
          analysisId,
          fullText: text,
          projectName: session.snapshot.projectName,
        })
        .catch((error: unknown) => {
          logger.error("Streaming pipeline crashed", { analysisId, error });
        });

      res.json({ success: true, analysisId });
    } catch (error) {
      logger.error("فشل بدء جلسة بث التحليل:", error);
      sendAnalysisError(res, 500, "تعذر بدء التحليل", "START_FAILED");
    }
  }

  /**
   * SSE endpoint. Honors `Last-Event-ID` for replay-on-reconnect.
   */
  streamEvents(req: Request, res: Response): void {
    this.streamEventsForOwner(req, res, getUserId(req));
  }

  streamPublicEvents(req: Request, res: Response): void {
    this.streamEventsForOwner(req, res, getPublicOwnerId(req));
  }

  private streamEventsForOwner(
    req: Request,
    res: Response,
    ownerId: string,
  ): void {
    const analysisId = String(req.params["analysisId"] ?? "");
    const session = analysisStreamRegistry.get(analysisId);
    if (!session) {
      sendAnalysisError(
        res,
        404,
        "الجلسة غير موجودة أو انتهت",
        "ANALYSIS_SESSION_NOT_FOUND",
      );
      return;
    }
    if (!sessionBelongsTo(session.snapshot.metadata, ownerId)) {
      sendAnalysisError(res, 403, "غير مصرح", "ANALYSIS_FORBIDDEN");
      return;
    }

    const lastIdHeader = req.headers["last-event-id"];
    const lastEventId = parseLastEventId(lastIdHeader);

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`retry: 5000\n\n`);

    const writer = (chunk: string) => res.write(chunk);
    const attached = analysisStreamRegistry.attach(
      analysisId,
      writer,
      lastEventId,
    );
    if (!attached.ok) {
      res.end();
      return;
    }
    for (const e of attached.replay) {
      res.write(`id: ${e.id}\nevent: ${e.event}\ndata: ${e.data}\n\n`);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        /* ignore */
      }
    }, 15_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      analysisStreamRegistry.detach(analysisId, writer);
    });
  }

  /**
   * Snapshot of the current session state — used on resume.
   */
  getAnalysisSnapshot(req: Request, res: Response): void {
    this.getAnalysisSnapshotForOwner(req, res, getUserId(req));
  }

  getPublicAnalysisSnapshot(req: Request, res: Response): void {
    this.getAnalysisSnapshotForOwner(req, res, getPublicOwnerId(req));
  }

  private getAnalysisSnapshotForOwner(
    req: Request,
    res: Response,
    ownerId: string,
  ): void {
    const analysisId = String(req.params["analysisId"] ?? "");
    const snap = analysisStreamRegistry.getSnapshot(analysisId);
    if (!snap) {
      sendAnalysisError(
        res,
        404,
        "الجلسة غير موجودة",
        "ANALYSIS_SESSION_NOT_FOUND",
      );
      return;
    }
    if (!sessionBelongsTo(snap.metadata, ownerId)) {
      sendAnalysisError(res, 403, "غير مصرح", "ANALYSIS_FORBIDDEN");
      return;
    }
    res.json({ success: true, snapshot: snap });
  }

  /**
   * Re-run a single station for an existing session.
   */
  async retryStation(req: Request, res: Response): Promise<void> {
    await this.retryStationForOwner(req, res, getUserId(req));
  }

  async retryPublicStation(req: Request, res: Response): Promise<void> {
    await this.retryStationForOwner(req, res, getPublicOwnerId(req));
  }

  private async retryStationForOwner(
    req: Request,
    res: Response,
    ownerId: string,
  ): Promise<void> {
    try {
      const analysisId = String(req.params["analysisId"] ?? "");
      const stationIdRaw = Number(req.params["stationId"]);
      if (
        !Number.isInteger(stationIdRaw) ||
        stationIdRaw < 1 ||
        stationIdRaw > 7
      ) {
        sendAnalysisError(res, 400, "stationId غير صالح", "INVALID_STATION_ID");
        return;
      }
      const validation = retryBodySchema.safeParse(req.body);
      if (!validation.success) {
        sendAnalysisError(res, 400, "النص مطلوب", "INVALID_TEXT");
        return;
      }
      const session = analysisStreamRegistry.get(analysisId);
      if (!session) {
        sendAnalysisError(
          res,
          404,
          "الجلسة غير موجودة",
          "ANALYSIS_SESSION_NOT_FOUND",
        );
        return;
      }
      if (!sessionBelongsTo(session.snapshot.metadata, ownerId)) {
        sendAnalysisError(res, 403, "غير مصرح", "ANALYSIS_FORBIDDEN");
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
      logger.error("فشل إعادة تشغيل المحطة:", error);
      sendAnalysisError(
        res,
        500,
        "تعذر إعادة التشغيل",
        "ANALYSIS_RETRY_FAILED",
      );
    }
  }

  /**
   * Export a completed snapshot as JSON / DOCX / PDF.
   */
  async exportAnalysis(req: Request, res: Response): Promise<void> {
    await this.exportAnalysisForOwner(req, res, getUserId(req));
  }

  async exportPublicAnalysis(req: Request, res: Response): Promise<void> {
    await this.exportAnalysisForOwner(req, res, getPublicOwnerId(req));
  }

  private async exportAnalysisForOwner(
    req: Request,
    res: Response,
    ownerId: string,
  ): Promise<void> {
    try {
      const analysisId = String(req.params["analysisId"] ?? "");
      const validation = exportBodySchema.safeParse(req.body);
      if (!validation.success) {
        sendAnalysisError(
          res,
          400,
          "صيغة التصدير غير صحيحة",
          "INVALID_EXPORT_FORMAT",
        );
        return;
      }
      const snap = analysisStreamRegistry.getSnapshot(analysisId);
      if (!snap) {
        sendAnalysisError(
          res,
          404,
          "الجلسة غير موجودة",
          "ANALYSIS_SESSION_NOT_FOUND",
        );
        return;
      }
      if (!sessionBelongsTo(snap.metadata, ownerId)) {
        sendAnalysisError(res, 403, "غير مصرح", "ANALYSIS_FORBIDDEN");
        return;
      }

      const filenameBase = `analysis-${analysisId}`;
      switch (validation.data.format) {
        case "json": {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filenameBase}.json"`,
          );
          res.end(JSON.stringify(snap, null, 2));
          return;
        }
        case "docx": {
          const doc = buildDocx(snap);
          const buffer = await Packer.toBuffer(doc);
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filenameBase}.docx"`,
          );
          res.end(buffer);
          return;
        }
        case "pdf": {
          const buffer = buildPdf(snap);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filenameBase}.pdf"`,
          );
          res.end(buffer);
          return;
        }
      }
    } catch (error) {
      logger.error("فشل تصدير التحليل:", error);
      sendAnalysisError(
        res,
        500,
        "تعذر تصدير التحليل",
        "ANALYSIS_EXPORT_FAILED",
      );
    }
  }

  getStationDetails(_req: Request, res: Response): void {
    try {
      const stationInfo = {
        stations: [
          {
            id: "S1",
            name: "التحليل التأسيسي",
            description: "تحليل البنية الأساسية للنص",
          },
          {
            id: "S2",
            name: "التحليل المفاهيمي",
            description: "استخراج الثيمات والمفاهيم",
          },
          {
            id: "S3",
            name: "شبكة الصراعات",
            description: "تحليل العلاقات والصراعات",
          },
          {
            id: "S4",
            name: "مقاييس الفعالية",
            description: "قياس فعالية النص الدرامي",
          },
          {
            id: "S5",
            name: "الديناميكية والرمزية",
            description: "تحليل الرموز والديناميكية",
          },
          {
            id: "S6",
            name: "الفريق الأحمر",
            description: "التحليل النقدي متعدد الوكلاء",
          },
          {
            id: "S7",
            name: "التقرير النهائي",
            description: "إنشاء التقرير الشامل",
          },
        ],
        totalStations: 7,
        executionOrder: "تسلسلي (1→7)",
        outputFormat: "نص عربي منسق",
      };

      res.json(stationInfo);
    } catch (error) {
      logger.error("فشل في جلب معلومات المحطات:", error);
      sendAnalysisError(
        res,
        500,
        "فشل في جلب معلومات المحطات",
        "ANALYSIS_STATIONS_INFO_FAILED",
      );
    }
  }
}

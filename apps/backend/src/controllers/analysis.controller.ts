import { Packer } from "docx";
import { type Request, type Response } from "express";

import { logger } from "@/lib/logger";
import { AnalysisService } from "@/services/analysis.service";
import {
  analysisStreamRegistry,
  type StationId,
} from "@/services/analysisStream.registry";

import {
  buildDocx,
  buildPdf,
  buildPipelineResponse,
  exportBodySchema,
  generatePublicSessionToken,
  getPublicOwnerId,
  getUserId,
  handleAsyncPipeline,
  parseLastEventId,
  retryBodySchema,
  runSevenStationsBodySchema,
  sendAnalysisError,
  sessionBelongsTo,
  startStreamBodySchema,
} from "./analysis.controller.helpers";

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
    const sessionToken = generatePublicSessionToken();
    req.headers["x-analysis-token"] = sessionToken;
    this.startStreamSessionForOwner(
      req,
      res,
      getPublicOwnerId(req),
      sessionToken,
    );
  }

  private startStreamSessionForOwner(
    req: Request,
    res: Response,
    ownerId: string,
    sessionToken?: string,
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

      void this.analysisService
        .runFullPipelineStreaming({
          analysisId,
          fullText: text,
          projectName: session.snapshot.projectName,
        })
        .catch((error: unknown) => {
          logger.error("Streaming pipeline crashed", { analysisId, error });
        });

      const response: {
        success: true;
        analysisId: string;
        sessionToken?: string;
      } = {
        success: true,
        analysisId,
      };
      if (sessionToken) {
        response.sessionToken = sessionToken;
      }
      res.json(response);
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

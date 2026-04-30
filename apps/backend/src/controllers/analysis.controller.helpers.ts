import { createHash, randomUUID } from "crypto";

import { AlignmentType, Document, HeadingLevel, Paragraph } from "docx";
import { type Request, type Response } from "express";
import { jsPDF } from "jspdf";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { queueAIAnalysis } from "@/queues/jobs/ai-analysis.job";

import type { StationId } from "@/services/analysisStream.registry";

export const runSevenStationsBodySchema = z
  .object({
    text: z.string().trim().min(1),
    async: z.boolean().optional(),
  })
  .passthrough();

export const startStreamBodySchema = z.object({
  text: z.string().trim().min(1),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
});

export const retryBodySchema = z.object({
  text: z.string().trim().min(1),
});

export const exportBodySchema = z.object({
  format: z.enum(["json", "docx", "pdf"]),
});

export function getUserId(req: Request): string {
  return (req as unknown as { user?: { id: string } }).user?.id ?? "anonymous";
}

function getForwardedIp(req: Request): string | null {
  const forwardedFor = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (!raw) return null;

  const ip = raw.split(",")[0]?.trim();
  if (!ip) return null;
  return ip;
}

function getPublicSessionToken(req: Request): string | null {
  const token = req.get("x-analysis-token");
  return token && token.length > 0 ? token : null;
}

export function generatePublicSessionToken(): string {
  return randomUUID();
}

export function getPublicOwnerId(req: Request): string {
  const ip =
    getForwardedIp(req) ?? req.ip ?? req.socket.remoteAddress ?? "unknown-ip";
  const userAgent = req.get("user-agent") ?? "unknown-agent";
  const sessionToken = getPublicSessionToken(req);
  const input = sessionToken
    ? `${ip}|${userAgent}|${sessionToken}`
    : `${ip}|${userAgent}`;
  const digest = createHash("sha256").update(input).digest("hex").slice(0, 32);
  return `public:${digest}`;
}

export function sessionBelongsTo(
  metadata: Record<string, unknown>,
  ownerId: string,
): boolean {
  const owner = metadata["ownerId"];
  if (typeof owner !== "string") return true;
  return owner === ownerId;
}

export function parseLastEventId(
  header: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function sendAnalysisError(
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

interface AnalysisExportSnapshot {
  projectName: string;
  finalReport: string | null;
  stations: {
    id: number;
    name: string;
    status: string;
    output: unknown;
    error: string | null;
  }[];
}

export function buildDocx(snap: AnalysisExportSnapshot): Document {
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
      for (const line of stationOutputToText(s.output).split("\n")) {
        children.push(rtlPara(line));
      }
    }
  }
  if (snap.finalReport) {
    children.push(rtlPara("التقرير النهائي", HeadingLevel.HEADING_1));
    for (const line of snap.finalReport.split("\n")) {
      children.push(rtlPara(line));
    }
  }
  return new Document({ sections: [{ properties: {}, children }] });
}

export function buildPdf(snap: AnalysisExportSnapshot): Buffer {
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
    if (details && typeof details.fullAnalysis === "string") {
      return details.fullAnalysis;
    }
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return "";
    }
  }
  return "";
}

export async function handleAsyncPipeline(
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

export function buildPipelineResponse(
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

export function toStationId(stationIdRaw: number): StationId {
  return stationIdRaw as StationId;
}

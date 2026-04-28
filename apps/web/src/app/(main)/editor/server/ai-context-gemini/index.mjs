/**
 * @module ai-context-gemini
 * @description Backend route لطبقة السياق المُعزَّزة بـ Gemini Flash.
 *
 * يستقبل النص الكامل + التصنيفات المحلية من الفرونت إند،
 * يرسلها لـ Gemini Flash عبر streaming،
 * ويرجع تصحيحات كـ Server-Sent Events (SSE).
 *
 * Route: POST /api/ai/context-enhance → SSE stream
 */

import "../env-bootstrap.mjs";
import { GoogleGenAI } from "@google/genai";
import pino from "pino";
import { SYSTEM_PROMPT } from "./constants.mjs";
import { resolveGeminiConfig } from "./config.mjs";
import { buildUserPrompt } from "./prompt-builder.mjs";
import { parseCorrectionsFromChunk } from "./response-parser.mjs";
import { validateRequestBody } from "./validation.mjs";
import { getGeminiContextHealth } from "./health.mjs";

const logger = pino({ name: "ai-context-gemini" });

export { getGeminiContextHealth };

/**
 * POST /api/ai/context-enhance
 *
 * Body:
 * {
 *   sessionId: string,
 *   classifiedLines: Array<{ text: string, assignedType: string, confidence: number }>
 * }
 *
 * Response: SSE stream
 * - event: correction → { lineIndex, correctedType, confidence, reason, source }
 * - event: done → { totalCorrections }
 * - event: error → { message }
 */
export const handleContextEnhance = async (req, res) => {
  const geminiConfig = resolveGeminiConfig();

  if (!geminiConfig.enabled) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(
      `event: done\ndata: ${JSON.stringify({ totalCorrections: 0, reason: "disabled" })}\n\n`
    );
    res.end();
    return;
  }

  if (!geminiConfig.apiKey) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: "GEMINI_API_KEY not configured." })}\n\n`
    );
    res.end();
    return;
  }

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    res.writeHead(400, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: "Invalid JSON body." }));
    return;
  }

  const validation = validateRequestBody(body);
  if (!validation.valid) {
    res.writeHead(400, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: validation.error }));
    return;
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
  });

  const { classifiedLines, sessionId } = body;
  const startedAt = Date.now();
  let totalCorrections = 0;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
    const userPrompt = buildUserPrompt(classifiedLines);

    logger.info(
      {
        sessionId,
        model: geminiConfig.model,
        lineCount: classifiedLines.length,
      },
      "gemini-context-enhance-start"
    );

    // Streaming call
    const response = await ai.models.generateContentStream({
      model: geminiConfig.model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingLevel: "low" },
      },
    });

    let accumulatedText = "";
    const sentCorrections = new Set();

    for await (const chunk of response) {
      if (res.destroyed) break;

      const chunkText = chunk.text ?? "";
      accumulatedText += chunkText;

      // استخراج تصحيحات من النص المتراكم
      const corrections = parseCorrectionsFromChunk(accumulatedText);

      for (const correction of corrections) {
        // تجنب إرسال نفس التصحيح مرتين
        const key = `${correction.lineIndex}:${correction.correctedType}`;
        if (sentCorrections.has(key)) continue;
        sentCorrections.add(key);

        totalCorrections += 1;
        res.write(`event: correction\ndata: ${JSON.stringify(correction)}\n\n`);
      }
    }

    const latencyMs = Date.now() - startedAt;
    logger.info(
      {
        sessionId,
        totalCorrections,
        latencyMs,
      },
      "gemini-context-enhance-complete"
    );

    res.write(
      `event: done\ndata: ${JSON.stringify({ totalCorrections, latencyMs })}\n\n`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ sessionId, error: message }, "gemini-context-enhance-error");

    if (!res.destroyed) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    }
  } finally {
    if (!res.destroyed) {
      res.end();
    }
  }
};

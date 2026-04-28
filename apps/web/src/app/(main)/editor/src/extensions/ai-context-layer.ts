/**
 * @module extensions/ai-context-layer
 * @description
 * طبقة السياق المُعزَّزة بـ Gemini Flash — Frontend integration.
 *
 * تستدعي Backend route عبر SSE وتستقبل تصحيحات streaming
 * ثم تطبّقها على المحرر تدريجياً عبر ProgressiveUpdateSession.
 *
 * يُصدّر:
 * - {@link requestContextEnhancement} — الدالة الرئيسية لاستدعاء طبقة السياق
 * - {@link ContextEnhancementResult} — نتيجة عملية التعزيز
 */

import { definedProps } from "@/lib/defined-props";

import { resolveContextEnhanceEndpoint } from "../utils/backend-endpoints";
import { logger } from "../utils/logger";

import { isElementType } from "./classification-types";

import type {
  AICorrectionCommand,
  ProgressiveUpdateSession,
} from "./ai-progressive-updater";
import type { ClassifiedLine } from "./classification-types";
import type { EditorView } from "@tiptap/pm/view";

// ─── الأنواع ──────────────────────────────────────────────────────

/** نتيجة عملية تعزيز السياق */
export interface ContextEnhancementResult {
  readonly success: boolean;
  readonly totalCorrections: number;
  readonly appliedCorrections: number;
  readonly latencyMs: number;
  readonly error?: string;
}

/** خيارات استدعاء طبقة السياق */
export interface ContextEnhancementOptions {
  /** معرف الجلسة */
  readonly sessionId: string;
  /** السطور المُصنّفة محلياً */
  readonly classifiedLines: readonly ClassifiedLine[];
  /** جلسة التحديث التدريجي */
  readonly updateSession: ProgressiveUpdateSession;
  /** EditorView للتطبيق */
  readonly view: EditorView;
  /** AbortSignal للإلغاء */
  readonly signal?: AbortSignal;
}

// ─── الثوابت ──────────────────────────────────────────────────────

const contextLogger = logger.createScope("ai-context-layer");

/** عنوان الـ endpoint — يُقرأ من متغيرات البيئة */
const resolveContextEndpoint = (): string => {
  const envValue = process.env.NEXT_PUBLIC_AI_CONTEXT_ENDPOINT?.trim();
  if (envValue) return envValue;
  return resolveContextEnhanceEndpoint();
};

/** هل الطبقة مفعّلة */
const isContextLayerEnabled = (): boolean => {
  const rawValue =
    process.env.NEXT_PUBLIC_AI_CONTEXT_ENABLED?.trim().toLowerCase();
  if (!rawValue) return true; // مفعّلة بالـ default
  return !["0", "false", "off", "no"].includes(rawValue);
};

// ─── SSE Parser ───────────────────────────────────────────────────

interface SSEEvent {
  event: string;
  data: string;
}

interface CorrectionPayload {
  lineIndex: number;
  correctedType: string;
  confidence?: number;
  reason?: string;
}

function parseRawSSEEvent(rawEvent: string): SSEEvent | null {
  if (!rawEvent.trim()) return null;

  let eventType = "message";
  let data = "";

  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      data = line.slice(6);
    }
  }

  return data ? { event: eventType, data } : null;
}

/**
 * يقرأ SSE stream ويستخرج الأحداث.
 *
 * @yields كل حدث SSE كـ { event, data }
 */
async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events مفصولة بـ \n\n
      const events = buffer.split("\n\n");
      // آخر عنصر ممكن يكون غير مكتمل
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const parsed = parseRawSSEEvent(rawEvent);
        if (parsed) yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function applyCorrectionEvent(
  data: string,
  view: EditorView,
  updateSession: ProgressiveUpdateSession
) {
  try {
    const correction = JSON.parse(data) as CorrectionPayload;
    if (!isElementType(correction.correctedType)) {
      return { total: 1, applied: 0 };
    }

    const command: AICorrectionCommand = {
      lineIndex: correction.lineIndex,
      correctedType: correction.correctedType,
      confidence: correction.confidence ?? 0.8,
      reason: correction.reason ?? "",
      source: "gemini-context",
    };

    return {
      total: 1,
      applied: updateSession.applyCorrection(view, command) ? 1 : 0,
    };
  } catch {
    return { total: 0, applied: 0 };
  }
}

function logStreamError(data: string, sessionId: string) {
  try {
    const errorData = JSON.parse(data) as { message?: string };
    contextLogger.error("context-enhance-stream-error", {
      sessionId,
      message: errorData.message,
    });
  } catch {
    // تجاهل
  }
}

function logStreamDone(
  sessionId: string,
  totalCorrections: number,
  appliedCorrections: number
) {
  contextLogger.info("context-enhance-stream-done", {
    sessionId,
    totalCorrections,
    appliedCorrections,
  });
}

// ─── الدالة الرئيسية ─────────────────────────────────────────────

/**
 * يستدعي طبقة السياق المُعزَّزة بـ Gemini Flash.
 *
 * يرسل السطور المُصنّفة للـ backend،
 * يستقبل تصحيحات streaming،
 * ويطبّقها على المحرر تدريجياً.
 */
export const requestContextEnhancement = async (
  options: ContextEnhancementOptions
): Promise<ContextEnhancementResult> => {
  const { sessionId, classifiedLines, updateSession, view, signal } = options;

  if (!isContextLayerEnabled()) {
    return {
      success: true,
      totalCorrections: 0,
      appliedCorrections: 0,
      latencyMs: 0,
    };
  }

  if (classifiedLines.length === 0) {
    return {
      success: true,
      totalCorrections: 0,
      appliedCorrections: 0,
      latencyMs: 0,
    };
  }

  const endpoint = resolveContextEndpoint();
  const startedAt = Date.now();
  let totalCorrections = 0;
  let appliedCorrections = 0;

  try {
    contextLogger.info("context-enhance-request", {
      sessionId,
      lineCount: classifiedLines.length,
      endpoint,
    });

    // تحضير البيانات — بنبعت بس المعلومات المطلوبة (مش النص الكامل)
    const payload = {
      sessionId,
      classifiedLines: classifiedLines.map((line) => ({
        text: line.text,
        assignedType: line.assignedType,
        confidence: line.originalConfidence,
      })),
    };

    const response = await fetch(
      endpoint,
      definedProps({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Context enhance failed (${response.status}): ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is null — SSE not supported.");
    }

    const reader = response.body.getReader();

    for await (const sseEvent of parseSSEStream(reader, signal)) {
      if (view.isDestroyed || updateSession.status === "aborted") break;

      if (sseEvent.event === "correction") {
        const result = applyCorrectionEvent(sseEvent.data, view, updateSession);
        totalCorrections += result.total;
        appliedCorrections += result.applied;
      } else if (sseEvent.event === "error") {
        logStreamError(sseEvent.data, sessionId);
      } else if (sseEvent.event === "done") {
        logStreamDone(sessionId, totalCorrections, appliedCorrections);
      }
    }

    const latencyMs = Date.now() - startedAt;
    return {
      success: true,
      totalCorrections,
      appliedCorrections,
      latencyMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isAbort =
      error instanceof DOMException && error.name === "AbortError";

    if (!isAbort) {
      contextLogger.error("context-enhance-failed", {
        sessionId,
        error: message,
      });
    }

    return {
      success: false,
      totalCorrections,
      appliedCorrections,
      latencyMs: Date.now() - startedAt,
      error: message,
    };
  }
};

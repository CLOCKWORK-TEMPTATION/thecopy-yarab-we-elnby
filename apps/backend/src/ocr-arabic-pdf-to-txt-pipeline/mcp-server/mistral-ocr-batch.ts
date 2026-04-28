/**
 * @description تنفيذ Batch OCR ومتابعة الحالة وقراءة المخرجات.
 */

import { setTimeout as sleep } from "node:timers/promises";

import { downloadMistralFileText } from "./mistral-ocr-files.js";
import { mistralRequestJson } from "./mistral-ocr-http.js";
import {
  extractBatchBody,
  extractMarkdownFromOcrResponse,
  readDocumentAnnotation,
} from "./mistral-ocr-response.js";
import { log } from "./ocr-logger.js";
import { field, str } from "./text-helpers.js";

import type { JsonRecord, MistralOCRConfig } from "./types.js";

export interface BatchOcrResult {
  markdown: string;
  annotation: unknown;
}

export async function processDocumentViaBatch(
  config: MistralOCRConfig,
  documentUrl: string,
  documentName: string | undefined,
  commonKwargs: JsonRecord,
): Promise<BatchOcrResult> {
  const payload: JsonRecord = {
    document: {
      type: "document_url",
      document_url: documentUrl,
      ...(documentName ? { document_name: documentName } : {}),
    },
    ...commonKwargs,
  };

  const timeoutHours = Math.max(1, Math.ceil(config.batchTimeoutSec / 3600));
  const batch = await mistralRequestJson("POST", "/batch/jobs", {
    endpoint: "/v1/ocr",
    model: config.model,
    requests: [{ custom_id: "ocr-document-0", body: payload }],
    timeout_hours: timeoutHours,
  });

  const jobId = str(field(batch, "id", "")).trim();
  if (!jobId) {
    throw new Error("تعذر إنشاء Batch Job صالح لعملية OCR.");
  }

  log("INFO", "تم إنشاء Batch OCR job: %s", jobId);

  const deadline = Date.now() + config.batchTimeoutSec * 1000;
  const pollInterval = Math.max(
    500,
    Math.round(config.batchPollIntervalSec * 1000),
  );

  while (true) {
    const job = await mistralRequestJson(
      "GET",
      `/batch/jobs/${encodeURIComponent(jobId)}?inline=true`,
    );
    const status = str(field(job, "status", "")).toUpperCase();
    const completed = Number(field(job, "completed_requests", 0));
    const total = Number(field(job, "total_requests", 0));

    log("INFO", "Batch OCR status=%s (%s/%s)", status, completed, total);

    if (status === "SUCCESS") {
      const result = await extractMarkdownFromBatchJob(job);
      if (result.markdown.trim()) {
        return result;
      }
      throw new Error("Batch OCR نجح لكن الناتج كان فارغاً.");
    }

    if (["FAILED", "TIMEOUT_EXCEEDED", "CANCELLED"].includes(status)) {
      const errors = field(job, "errors", []);
      throw new Error(
        `Batch OCR انتهى بالحالة ${status}. errors=${JSON.stringify(errors)}`,
      );
    }

    if (Date.now() >= deadline) {
      try {
        await mistralRequestJson(
          "POST",
          `/batch/jobs/${encodeURIComponent(jobId)}/cancel`,
        );
        log(
          "WARN",
          "تم إرسال طلب إلغاء لـ Batch OCR job بعد تجاوز المهلة: %s",
          jobId,
        );
      } catch (cancelError) {
        log(
          "WARN",
          "تعذر إلغاء Batch OCR job %s بعد انتهاء المهلة: %s",
          jobId,
          String(cancelError),
        );
      }
      throw new Error(
        `انتهت مهلة Batch OCR (${config.batchTimeoutSec}s) قبل الاكتمال.`,
      );
    }

    await sleep(pollInterval);
  }
}

async function extractMarkdownFromBatchJob(
  job: unknown,
): Promise<BatchOcrResult> {
  const outputs = field<unknown[]>(job, "outputs", []);
  if (Array.isArray(outputs) && outputs.length > 0) {
    for (const item of outputs) {
      const body = extractBatchBody(item);
      if (!body) {
        continue;
      }
      const md = extractMarkdownFromOcrResponse(body).trim();
      if (md) {
        return { markdown: md, annotation: readDocumentAnnotation(body) };
      }
    }
  }

  const outputFileId = str(
    field(job, "output_file", "") || field(job, "output_file_id", ""),
  ).trim();
  if (outputFileId) {
    const text = await downloadMistralFileText(outputFileId);
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }

      const body = extractBatchBody(row);
      if (!body) {
        continue;
      }

      const md = extractMarkdownFromOcrResponse(body).trim();
      if (md) {
        return { markdown: md, annotation: readDocumentAnnotation(body) };
      }
    }
  }

  return { markdown: "", annotation: undefined };
}

/**
 * @description محللات استجابات Mistral OCR (markdown + annotations + batch body).
 */

import { field, str } from "./text-helpers.js";
import type { JsonRecord } from "./types.js";

export function extractBatchBody(row: unknown): JsonRecord | undefined {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  const responseObj = field(row, "response", null);
  if (responseObj && typeof responseObj === "object") {
    const body = field(responseObj, "body", null);
    if (body && typeof body === "object") {
      return body;
    }
  }

  const body = field(row, "body", null);
  if (body && typeof body === "object") {
    return body;
  }

  if (Array.isArray(field(row, "pages", null))) {
    return row as JsonRecord;
  }

  return undefined;
}

export function extractMarkdownFromOcrResponse(response: unknown): string {
  const pages = field<unknown[]>(response, "pages", []);
  if (!Array.isArray(pages) || pages.length === 0) {
    return "";
  }

  const pageMarkdowns: string[] = [];
  for (const page of pages) {
    const markdown = str(field(page, "markdown", "")).trim();
    if (markdown) {
      pageMarkdowns.push(markdown);
    }
  }

  return pageMarkdowns.join("\n\n").trim();
}

export function readDocumentAnnotation(response: unknown): unknown {
  const raw = field<string | object | null>(response, "document_annotation", null);
  if (raw === null || raw === undefined) {
    return undefined;
  }

  if (typeof raw === "string") {
    const stripped = raw.trim();
    if (!stripped) {
      return undefined;
    }
    try {
      return JSON.parse(stripped);
    } catch {
      return stripped;
    }
  }

  return raw;
}

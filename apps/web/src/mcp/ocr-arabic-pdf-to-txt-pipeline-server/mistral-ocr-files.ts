/**
 * @description عمليات ملفات Mistral OCR (الرفع، signed URL، تنزيل المحتوى، الحذف).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { mistralRequestJson, mistralRequestRaw } from "./mistral-ocr-http.js";
import { log } from "./ocr-logger.js";
import { fileExists, field, str } from "./text-helpers.js";

export async function uploadPdfForOcr(pdfPath: string): Promise<string> {
  if (!(await fileExists(pdfPath))) {
    throw new Error(`ملف PDF غير موجود: ${pdfPath}`);
  }

  const pdfBytes = await readFile(pdfPath);
  const form = new FormData();
  form.append("purpose", "ocr");
  form.append(
    "file",
    new Blob([pdfBytes], { type: "application/pdf" }),
    path.basename(pdfPath)
  );

  const upload = await mistralRequestJson("POST", "/files", form);
  const fileId = str(field(upload, "id", "")).trim();
  if (!fileId) {
    throw new Error("لم يتم الحصول على معرف الملف بعد الرفع إلى Mistral.");
  }
  return fileId;
}

export async function getMistralSignedUrl(fileId: string): Promise<string> {
  const attempts: {
    method: "GET" | "POST";
    endpoint: string;
    body?: unknown;
  }[] = [
    {
      method: "GET",
      endpoint: `/files/${encodeURIComponent(fileId)}/url?expiry=24`,
    },
    {
      method: "GET",
      endpoint: `/files/${encodeURIComponent(fileId)}/signed-url`,
    },
    {
      method: "POST",
      endpoint: `/files/${encodeURIComponent(fileId)}/url`,
      body: { expiry: 24 },
    },
    {
      method: "POST",
      endpoint: `/files/${encodeURIComponent(fileId)}/signed-url`,
      body: { expiry: 24 },
    },
  ];

  for (const a of attempts) {
    try {
      const resp = await mistralRequestJson(a.method, a.endpoint, a.body);
      const top = str(field(resp, "url", "")).trim();
      if (top) {
        return top;
      }

      const dataObj = field(resp, "data", null);
      if (dataObj && typeof dataObj === "object") {
        const nested = str(field(dataObj, "url", "")).trim();
        if (nested) {
          return nested;
        }
      }
    } catch {
      // continue
    }
  }

  throw new Error("تعذر الحصول على signed URL من Mistral بعد عدة محاولات.");
}

export async function downloadMistralFileText(fileId: string): Promise<string> {
  const endpoints = [
    `/files/${encodeURIComponent(fileId)}/content`,
    `/files/${encodeURIComponent(fileId)}/download`,
    `/files/${encodeURIComponent(fileId)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await mistralRequestRaw("GET", endpoint);
      if (!response.ok) {
        continue;
      }
      return await response.text();
    } catch {
      // continue
    }
  }

  return "";
}

export async function deleteMistralFile(fileId: string): Promise<void> {
  if (!fileId) {
    return;
  }
  try {
    await mistralRequestJson("DELETE", `/files/${encodeURIComponent(fileId)}`);
  } catch (cleanupError) {
    log(
      "WARN",
      "تعذر حذف ملف OCR المؤقت من Mistral (%s): %s",
      fileId,
      String(cleanupError)
    );
  }
}

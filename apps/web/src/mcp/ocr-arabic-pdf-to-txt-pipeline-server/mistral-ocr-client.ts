/**
 * @description خدمة Mistral OCR لاستخراج النصوص من ملفات PDF
 */

import path from "node:path";

import { AnnotationFormatBuilder } from "./mistral-ocr-annotation.js";
import { processDocumentViaBatch } from "./mistral-ocr-batch.js";
import { DEFAULT_MISTRAL_OCR_MODEL } from "./mistral-ocr-config.js";
import {
  deleteMistralFile,
  getMistralSignedUrl,
  uploadPdfForOcr,
} from "./mistral-ocr-files.js";
import { mistralRequestJson } from "./mistral-ocr-http.js";
import {
  extractMarkdownFromOcrResponse,
  readDocumentAnnotation,
} from "./mistral-ocr-response.js";
import { log } from "./ocr-logger.js";

import type { JsonRecord, MistralOCRConfig } from "./types.js";

export class MistralOCRService {
  private readonly config: MistralOCRConfig;
  private readonly annotationBuilder: AnnotationFormatBuilder;
  private lastDocumentAnnotation?: unknown;

  constructor(config: MistralOCRConfig) {
    if (config.model !== DEFAULT_MISTRAL_OCR_MODEL) {
      throw new Error(
        `Mistral OCR model must be ${DEFAULT_MISTRAL_OCR_MODEL}. Received: ${config.model}`
      );
    }
    this.config = config;
    this.annotationBuilder = new AnnotationFormatBuilder(config);
  }

  getLastDocumentAnnotation(): unknown {
    return this.lastDocumentAnnotation;
  }

  async processDocumentUrl(
    documentUrl: string,
    documentName?: string
  ): Promise<string> {
    this.lastDocumentAnnotation = undefined;

    const documentPayload: JsonRecord = {
      type: "document_url",
      document_url: documentUrl,
    };
    if (documentName) {
      documentPayload.document_name = documentName;
    }

    const body: JsonRecord = {
      model: this.config.model,
      document: documentPayload,
      ...(await this.annotationBuilder.buildCommonRequestKwargs()),
    };

    const response = await mistralRequestJson("POST", "/ocr", body);
    this.lastDocumentAnnotation = readDocumentAnnotation(response);
    return extractMarkdownFromOcrResponse(response);
  }

  async processPdfFile(pdfPath: string): Promise<string> {
    let fileId = "";

    try {
      fileId = await uploadPdfForOcr(pdfPath);

      const signedUrl = await getMistralSignedUrl(fileId);
      if (!signedUrl) {
        throw new Error("تعذر الحصول على signed URL من Mistral.");
      }

      const documentName = path.basename(pdfPath);

      if (this.config.useBatchOCR) {
        try {
          return await this.runBatchOcr(signedUrl, documentName);
        } catch (error) {
          log(
            "WARN",
            "تعذر/فشل Batch OCR (%s). fallback إلى OCR المباشر.",
            String(error)
          );
        }
      }

      return this.processDocumentUrl(signedUrl, documentName);
    } finally {
      if (fileId) {
        await deleteMistralFile(fileId);
      }
    }
  }

  private async runBatchOcr(
    documentUrl: string,
    documentName: string
  ): Promise<string> {
    this.lastDocumentAnnotation = undefined;

    const commonKwargs = await this.annotationBuilder.buildCommonRequestKwargs();
    const result = await processDocumentViaBatch(
      this.config,
      documentUrl,
      documentName,
      commonKwargs
    );
    this.lastDocumentAnnotation = result.annotation;
    return result.markdown;
  }
}

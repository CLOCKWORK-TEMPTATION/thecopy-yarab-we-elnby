/**
 * @description بناء body الـ annotation وتحميل/تخزين schema الـ annotation.
 */

import { readFile } from "node:fs/promises";

import { fileExists, field, str } from "./text-helpers.js";

import type { JsonRecord, MistralOCRConfig } from "./types.js";

export class AnnotationFormatBuilder {
  private cachedSchema?: JsonRecord;

  constructor(private readonly config: MistralOCRConfig) {}

  async buildCommonRequestKwargs(): Promise<JsonRecord> {
    const kwargs: JsonRecord = {};

    if (this.config.tableFormat) {
      kwargs["table_format"] = this.config.tableFormat;
    }
    if (this.config.extractHeader) {
      kwargs["extract_header"] = true;
    }
    if (this.config.extractFooter) {
      kwargs["extract_footer"] = true;
    }
    if (this.config.includeImageBase64) {
      kwargs["include_image_base64"] = true;
    }

    const annotationFormat = await this.buildAnnotationFormat();
    if (annotationFormat) {
      kwargs["document_annotation_format"] = annotationFormat;
      if (this.config.annotationPrompt) {
        kwargs["document_annotation_prompt"] = this.config.annotationPrompt;
      }
    }

    return kwargs;
  }

  private async buildAnnotationFormat(): Promise<JsonRecord | undefined> {
    const schema = await this.loadAnnotationSchema();
    if (!schema) {
      return undefined;
    }

    const schemaType = str(field(schema, "type", "")).trim();
    if (["json_schema", "json_object", "text"].includes(schemaType)) {
      return schema;
    }

    return {
      type: "json_schema",
      json_schema: {
        name: "document_annotation",
        schema,
        strict: Boolean(this.config.annotationStrict),
      },
    };
  }

  private async loadAnnotationSchema(): Promise<JsonRecord | undefined> {
    if (!this.config.annotationSchemaPath) {
      return undefined;
    }
    if (this.cachedSchema) {
      return this.cachedSchema;
    }

    if (!(await fileExists(this.config.annotationSchemaPath))) {
      throw new Error(
        `ملف annotation schema غير موجود: ${this.config.annotationSchemaPath}`,
      );
    }

    const content = await readFile(this.config.annotationSchemaPath, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("ملف annotation schema يجب أن يكون كائن JSON.");
    }

    this.cachedSchema = parsed as JsonRecord;
    return this.cachedSchema;
  }
}

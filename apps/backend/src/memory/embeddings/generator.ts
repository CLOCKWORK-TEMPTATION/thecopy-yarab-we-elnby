/* eslint-disable no-console, complexity, max-lines-per-function, @typescript-eslint/no-explicit-any -- experimental embeddings module */
/**
 * Gemini Embedding Generator
 * مولد التضمينات باستخدام Gemini Embedding 2
 */

import { GoogleGenAI } from "@google/genai";
import type { EmbeddingResult, MultimodalInput, TaskType } from "../types";

export class GeminiEmbeddingGenerator {
  private client: GoogleGenAI;
  private defaultModel = "gemini-embedding-2-preview";
  private fallbackModel = "gemini-embedding-001";

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENAI_API_KEY'] || "",
    });
  }

  /**
   * توليد تضمين للكود البرمجي
   */
  async generateForCode(
    code: string,
    filePath: string,
    options: {
      dimensionality?: 768 | 1536 | 3072;
      taskType?: TaskType;
    } = {}
  ): Promise<EmbeddingResult> {
    const content = this.buildCodePrompt(code, filePath);

    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts: [{ text: content }] }],
        config: {
          taskType: options.taskType || "CODE_RETRIEVAL",
          outputDimensionality: options.dimensionality || 1536,
        },
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }

      return {
        embedding,
        dimensionality: options.dimensionality || 1536,
        contentHash: this.hashContent(content),
      };
    } catch (error) {
      // Fallback to text-only model if multimodal fails
      console.warn("Gemini Embedding 2 failed, trying fallback model:", error);
      return this.generateWithFallback(content, options);
    }
  }

  /**
   * توليد تضمين للوثائق
   */
  async generateForDocumentation(
    text: string,
    metadata: { title?: string; section?: string },
    options: { dimensionality?: 768 | 1536 | 3072 } = {}
  ): Promise<EmbeddingResult> {
    const content = this.buildDocPrompt(text, metadata);

    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts: [{ text: content }] }],
        config: {
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: options.dimensionality || 1536,
        },
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }

      return {
        embedding,
        dimensionality: options.dimensionality || 1536,
        contentHash: this.hashContent(content),
      };
    } catch (error) {
      console.warn("Gemini Embedding 2 failed, trying fallback model:", error);
      return this.generateWithFallback(content, options);
    }
  }

  /**
   * توليد تضمين متعدد الوسائط
   */
  async generateMultimodal(
    input: MultimodalInput,
    options: { dimensionality?: 768 | 1536 | 3072 } = {}
  ): Promise<EmbeddingResult> {
    const parts: any[] = [];

    if (input.text) {
      parts.push({ text: input.text });
    }

    if (input.imageUri) {
      parts.push({
        fileData: {
          mimeType: this.getMimeType(input.imageUri),
          fileUri: input.imageUri,
        },
      });
    }

    if (input.videoUri) {
      parts.push({
        fileData: {
          mimeType: "video/mp4",
          fileUri: input.videoUri,
        },
      });
    }

    if (input.audioUri) {
      parts.push({
        fileData: {
          mimeType: "audio/mp3",
          fileUri: input.audioUri,
        },
      });
    }

    if (input.documentUri) {
      parts.push({
        fileData: {
          mimeType: "application/pdf",
          fileUri: input.documentUri,
        },
      });
    }

    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts }],
        config: {
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: options.dimensionality || 3072,
        },
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate multimodal embedding");
      }

      return {
        embedding,
        dimensionality: options.dimensionality || 3072,
        contentHash: this.hashContent(JSON.stringify(input)),
      };
    } catch (error) {
      // If multimodal fails and we have text, fallback to text-only
      if (input.text) {
        console.warn("Multimodal failed, falling back to text-only:", error);
        return this.generateForDocumentation(input.text, {}, options);
      }
      throw error;
    }
  }

  /**
   * توليد تضمينات لدفعة من المحتوى
   */
  async generateBatch(
    contents: string[],
    options: { dimensionality?: 768 | 1536 | 3072 } = {}
  ): Promise<EmbeddingResult[]> {
    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: contents.map((c) => ({ role: "user", parts: [{ text: c }] })),
        config: {
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: options.dimensionality || 1536,
        },
      });

      return (
        response.embeddings?.flatMap((e, i) => {
          const embedding = e.values;
          const content = contents[i];
          if (!embedding || content === undefined) {
            return [];
          }

          return [{
            embedding,
            dimensionality: options.dimensionality || 1536,
            contentHash: this.hashContent(content),
          }];
        }) || []
      );
    } catch (error) {
      // Process one by one if batch fails
      console.warn("Batch embedding failed, processing individually:", error);
      const results: EmbeddingResult[] = [];
      for (const content of contents) {
        try {
          const result = await this.generateForDocumentation(content, {}, options);
          results.push(result);
        } catch (e) {
          console.error("Failed to embed content:", e);
        }
      }
      return results;
    }
  }

  /**
   * Fallback generation using text-only model
   */
  private async generateWithFallback(
    content: string,
    options: { dimensionality?: 768 | 1536 | 3072 }
  ): Promise<EmbeddingResult> {
    const response = await this.client.models.embedContent({
      model: this.fallbackModel,
      contents: [{ role: "user", parts: [{ text: content }] }],
      config: {
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: options.dimensionality || 768,
      },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error("Failed to generate embedding with fallback model");
    }

    return {
      embedding,
      dimensionality: options.dimensionality || 768,
      contentHash: this.hashContent(content),
    };
  }

  private buildCodePrompt(code: string, filePath: string): string {
    const extension = filePath.split(".").pop() || "";
    return `File: ${filePath}
Language: ${extension}

Code:
\`\`\`${extension}
${code}
\`\`\``;
  }

  private buildDocPrompt(
    text: string,
    metadata: { title?: string; section?: string }
  ): string {
    let prompt = "";
    if (metadata["title"]) prompt += `Title: ${metadata["title"]}\n`;
    if (metadata.section) prompt += `Section: ${metadata.section}\n`;
    prompt += `\n${text}`;
    return prompt;
  }

  private hashContent(content: string): string {
    return require("crypto").createHash("sha256").update(content).digest("hex");
  }

  private getMimeType(uri: string): string {
    const ext = uri.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    };
    return mimeTypes[ext || ""] || "image/jpeg";
  }
}

export const embeddingGenerator = new GeminiEmbeddingGenerator();

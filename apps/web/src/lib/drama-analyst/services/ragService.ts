/**
 * خدمة الاسترجاع المعزز
 * Retrieval-Augmented Generation (RAG) Service
 *
 * يسترجع معلومات من النص الأصلي وتقرير التحليل لضمان الاتساق
 */

import { RAGContext, RetrievedChunk } from "../core/types";

import { log } from "./loggerService";

export class RAGService {
  private chunkSize: number;
  private overlap: number;

  constructor(chunkSize = 500, overlap = 50) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  /**
   * استرجاع السياق ذي الصلة
   * Retrieve relevant context for a query
   */
  async retrieveContext(
    query: string,
    originalText: string,
    analysisReport: any,
    topK = 5
  ): Promise<RAGContext> {
    log.debug("Retrieving context for query", null, "RAGService");

    // Chunk the texts
    const textChunks = this.chunkText(originalText, "original_text");
    const analysisChunks = this.chunkAnalysisReport(analysisReport);
    const allChunks = [...textChunks, ...analysisChunks];

    // Sanitized logging for security
    log.debug(
      "Processing chunks for context retrieval",
      { chunks: allChunks.length },
      "RAGService"
    );

    // Calculate relevance scores
    const scoredChunks = await this.scoreChunks(query, allChunks);

    // Sort and select top K
    scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const retrievedChunks = scoredChunks.slice(0, topK);

    // Sanitized logging for security
    log.debug(
      "Retrieved relevant context chunks",
      { retrievedChunks: retrievedChunks.length },
      "RAGService"
    );

    return {
      retrievedChunks,
      sourceText: originalText,
      analysisReport,
      relevanceScores: retrievedChunks.map((c) => c.relevanceScore),
    };
  }

  /**
   * تقسيم النص لأجزاء صغيرة
   * Chunk text into smaller pieces with overlap
   */
  private chunkText(
    text: string,
    source: "original_text" | "analysis_report"
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += this.chunkSize - this.overlap) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      const content = chunkWords.join(" ");

      if (content.trim().length > 0) {
        chunks.push({
          content,
          source,
          relevanceScore: 0, // Will be calculated later
          location: `words_${i}-${i + chunkWords.length}`,
        });
      }
    }

    return chunks;
  }

  /**
   * تقسيم تقرير التحليل لأجزاء
   * Chunk analysis report by sections
   */
  private chunkAnalysisReport(report: any): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = [];

    if (!report || typeof report !== "object") {
      return chunks;
    }

    Object.entries(report).forEach(([station, content]) => {
      if (typeof content === "string" && content.length > 0) {
        chunks.push({
          content: `${station}: ${content}`,
          source: "analysis_report",
          relevanceScore: 0,
          location: station,
        });
      }
    });

    return chunks;
  }

  /**
   * حساب نقاط الصلة للأجزاء
   * Score chunks for relevance to query
   */
  private async scoreChunks(
    query: string,
    chunks: RetrievedChunk[]
  ): Promise<RetrievedChunk[]> {
    // Simple keyword-based scoring (can be enhanced with embeddings)
    const scoringPromises = chunks.map(async (chunk) => {
      const score = this.scoreChunkSimple(query, chunk.content);
      return { ...chunk, relevanceScore: score };
    });

    return await Promise.all(scoringPromises);
  }

  /**
   * حساب نقطة الصلة لجزء واحد (مبسط)
   * Score single chunk for relevance (simplified version)
   */
  private scoreChunkSimple(query: string, chunkContent: string): number {
    // Simplified scoring using keyword matching
    const queryWords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const chunkWords = new Set(chunkContent.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...queryWords].filter((x) => chunkWords.has(x))
    );
    const score = queryWords.size > 0 ? intersection.size / queryWords.size : 0;

    return score;
  }

  /**
   * بناء Prompt مع السياق المسترجع
   * Build prompt with retrieved context
   */
  buildPromptWithContext(task: string, ragContext: RAGContext): string {
    let prompt = `المهمة:\n${task}\n\n`;

    prompt += `السياق المسترجع من المصادر:\n`;
    prompt += `${"=".repeat(60)}\n\n`;

    ragContext.retrievedChunks.forEach((chunk, i) => {
      prompt += `[مصدر ${i + 1} - ${chunk.source === "original_text" ? "النص الأصلي" : "تقرير التحليل"}]\n`;
      prompt += `الصلة: ${(chunk.relevanceScore * 100).toFixed(1)}%\n`;
      prompt += `${chunk.content}\n\n`;
      prompt += `${"-".repeat(60)}\n\n`;
    });

    prompt += `${"=".repeat(60)}\n`;
    prompt += `استخدم السياق أعلاه لإنجاز المهمة بدقة واتساق مع المصادر.\n`;

    return prompt;
  }
}

// Export singleton instance
export const ragService = new RAGService();

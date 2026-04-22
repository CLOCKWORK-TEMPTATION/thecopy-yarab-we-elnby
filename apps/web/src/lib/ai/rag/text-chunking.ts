// frontend/src/lib/ai/rag/text-chunking.ts

export interface TextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata?: {
    chapter?: string;
    scene?: string;
    characters?: string[];
    summary?: string;
  };
}

export interface ChunkingOptions {
  strategy: "sliding_window" | "semantic" | "fixed_size";
  chunkSize: number; // بالتوكنز
  overlap: number; // بالتوكنز
  minChunkSize?: number; // بالتوكنز
}

export interface ChunkingResult {
  chunks: TextChunk[];
  summary: string;
  contextMap: ContextMap;
  metadata: {
    totalChunks: number;
    averageChunkSize: number;
    strategy: string;
    originalLength: number;
  };
}

export interface ContextMap {
  chunks: Map<string, string>; // chunkId -> summary
  entities: Map<string, number>; // entity -> frequency
  themes: Map<string, number>; // theme -> frequency
  relationships: Map<string, string[]>; // entity -> related entities
}

export class TextChunker {
  /**
   * تقسيم النص إلى أجزاء
   */
  async chunkText(
    text: string,
    options: ChunkingOptions
  ): Promise<ChunkingResult> {
    switch (options.strategy) {
      case "sliding_window":
        return this.slidingWindowChunking(text, options);
      case "semantic":
        return this.semanticChunking(text, options);
      case "fixed_size":
        return this.fixedSizeChunking(text, options);
      default:
        return this.fixedSizeChunking(text, options);
    }
  }

  /**
   * تقسيم النص باستخدام نافذة منزلقة
   */
  private async slidingWindowChunking(
    text: string,
    options: ChunkingOptions
  ): Promise<ChunkingResult> {
    const chunks: TextChunk[] = [];
    const chunkSize = options.chunkSize * 4; // تحويل من توكن إلى أحرف (تقديري)
    const overlap = options.overlap * 4;

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunkContent = text.substring(startIndex, endIndex);

      // تجنب تقسيم الكلمات
      let adjustedEndIndex = endIndex;
      if (endIndex < text.length) {
        const lastSpaceIndex = chunkContent.lastIndexOf(" ");
        if (lastSpaceIndex > chunkSize * 0.8) {
          adjustedEndIndex = startIndex + lastSpaceIndex;
        }
      }

      const finalChunkContent = text.substring(startIndex, adjustedEndIndex);

      chunks.push({
        id: `chunk_${chunkIndex}`,
        content: finalChunkContent,
        startIndex,
        endIndex: adjustedEndIndex,
      });

      startIndex = adjustedEndIndex - overlap;
      chunkIndex++;
    }

    // إنشاء ملخص وسياق
    const summary = await this.generateSummary(chunks);
    const contextMap = await this.buildContextMap(chunks);

    return {
      chunks,
      summary,
      contextMap,
      metadata: {
        totalChunks: chunks.length,
        averageChunkSize:
          chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) /
          chunks.length,
        strategy: "sliding_window",
        originalLength: text.length,
      },
    };
  }

  /**
   * تقسيم النص باستخدام تحليل دلالي
   */
  private async semanticChunking(
    text: string,
    options: ChunkingOptions
  ): Promise<ChunkingResult> {
    // للتبسيط، نستخدم تقسيماً يعتمد على الفقرات والمشاهد
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: TextChunk[] = [];
    let currentChunk = "";
    let currentChunkStart = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // إذا كانت إضافة الفقرة الحالية تتجاوز حجم الجزء المحدد
      if (
        currentChunk.length + paragraph.length > options.chunkSize * 4 &&
        currentChunk.length > 0
      ) {
        // حفظ الجزء الحالي
        chunks.push({
          id: `chunk_${chunkIndex}`,
          content: currentChunk.trim(),
          startIndex: currentChunkStart,
          endIndex: currentChunkStart + currentChunk.length,
        });

        // بدء جزء جديد
        currentChunk = paragraph;
        currentChunkStart = currentChunkStart + currentChunk.length;
        chunkIndex++;
      } else {
        // إضافة الفقرة إلى الجزء الحالي
        if (currentChunk.length > 0) {
          currentChunk += "\n\n" + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    // إضافة الجزء الأخير إذا لم يكن فارغاً
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        startIndex: currentChunkStart,
        endIndex: currentChunkStart + currentChunk.length,
      });
    }

    // إنشاء ملخص وسياق
    const summary = await this.generateSummary(chunks);
    const contextMap = await this.buildContextMap(chunks);

    return {
      chunks,
      summary,
      contextMap,
      metadata: {
        totalChunks: chunks.length,
        averageChunkSize:
          chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) /
          chunks.length,
        strategy: "semantic",
        originalLength: text.length,
      },
    };
  }

  /**
   * تقسيم النص بأحجام ثابتة
   */
  private async fixedSizeChunking(
    text: string,
    options: ChunkingOptions
  ): Promise<ChunkingResult> {
    const chunks: TextChunk[] = [];
    const chunkSize = options.chunkSize * 4; // تحويل من توكن إلى أحرف (تقديري)

    for (let i = 0; i < text.length; i += chunkSize) {
      const endIndex = Math.min(i + chunkSize, text.length);
      const chunkContent = text.substring(i, endIndex);

      chunks.push({
        id: `chunk_${chunks.length}`,
        content: chunkContent,
        startIndex: i,
        endIndex,
      });
    }

    // إنشاء ملخص وسياق
    const summary = await this.generateSummary(chunks);
    const contextMap = await this.buildContextMap(chunks);

    return {
      chunks,
      summary,
      contextMap,
      metadata: {
        totalChunks: chunks.length,
        averageChunkSize: chunkSize,
        strategy: "fixed_size",
        originalLength: text.length,
      },
    };
  }

  /**
   * إنشاء ملخص للأجزاء
   */
  private async generateSummary(chunks: TextChunk[]): Promise<string> {
    // للتبسيط، نستخدم أول 500 حرف من كل جزء لإنشاء ملخص
    const excerpts = chunks
      .map((chunk) =>
        chunk.content.substring(0, Math.min(500, chunk.content.length))
      )
      .join("\n\n");

    // في تطبيق حقيقي، سيتم استخدام نموذج لغوي لإنشاء ملخص
    return excerpts.substring(0, 2000);
  }

  /**
   * بناء خريطة السياق
   */
  private async buildContextMap(chunks: TextChunk[]): Promise<ContextMap> {
    const contextMap: ContextMap = {
      chunks: new Map(),
      entities: new Map(),
      themes: new Map(),
      relationships: new Map(),
    };

    // إنشاء ملخصات بسيطة للأجزاء
    for (const chunk of chunks) {
      // للتبسيط، نستخدم أول 100 حرف كملخص
      const summary = chunk.content.substring(0, 100);
      contextMap.chunks.set(chunk.id, summary);

      // استخراج كيانات بسيطة (أسماء شخصيات تبدأ بحرف كبير)
      const words = chunk.content.split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && word[0] && word[0] === word[0].toUpperCase()) {
          const count = contextMap.entities.get(word) || 0;
          contextMap.entities.set(word, count + 1);
        }
      }
    }

    return contextMap;
  }

  /**
   * تقدير عدد التوكنز في النص
   */
  estimateTokens(text: string): number {
    // تقدير بسيط: 1 توكن ≈ 4 أحرف للغة العربية
    return Math.ceil(text.length / 4);
  }

  /**
   * تحديد ما إذا كان النص يحتاج إلى تقسيم
   */
  needsChunking(text: string, maxTokens: number = 30000): boolean {
    return this.estimateTokens(text) > maxTokens;
  }
}

// Export singleton instance
let textChunkerInstance: TextChunker | null = null;

export function getTextChunker(): TextChunker {
  if (!textChunkerInstance) {
    textChunkerInstance = new TextChunker();
  }
  return textChunkerInstance;
}

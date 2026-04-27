// frontend/src/lib/ai/rag/context-retriever.ts

import { GeminiService } from "../stations/gemini-service";
import { logger } from "../utils/logger";

import { TextChunk, ContextMap } from "./text-chunking";

export interface RetrievalOptions {
  maxChunks?: number;
  minRelevanceScore?: number;
  includeMetadata?: boolean;
}

export interface RetrievalResult {
  chunks: TextChunk[];
  context: string;
  relevanceScores: Map<string, number>;
  metadata: {
    totalChunks: number;
    query: string;
    retrievalTime: number;
  };
}

export class ContextRetriever {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  private async generateText(
    prompt: string,
    options: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const request = {
      prompt,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.maxTokens !== undefined
        ? { maxTokens: options.maxTokens }
        : {}),
    };
    const response = await this.geminiService.generate<{ raw: string }>(
      request
    );

    if (
      typeof response.content === "object" &&
      response.content !== null &&
      "raw" in response.content
    ) {
      return response.content.raw;
    }

    return String(response.content);
  }

  /**
   * بناء خريطة سياق محسنة
   */
  async buildContextMap(chunks: TextChunk[]): Promise<ContextMap> {
    const contextMap: ContextMap = {
      chunks: new Map(),
      entities: new Map(),
      themes: new Map(),
      relationships: new Map(),
    };

    // إنشاء ملخصات محسنة للأجزاء باستخدام Gemini
    for (const chunk of chunks) {
      const summary = await this.generateChunkSummary(chunk.content);
      contextMap.chunks.set(chunk.id, summary);

      // استخراج الكيانات والمواضيع باستخدام Gemini
      const entities = await this.extractEntities(chunk.content);
      for (const entity of entities) {
        const count = contextMap.entities.get(entity) ?? 0;
        contextMap.entities.set(entity, count + 1);
      }

      const themes = await this.extractThemes(chunk.content);
      for (const theme of themes) {
        const count = contextMap.themes.get(theme) ?? 0;
        contextMap.themes.set(theme, count + 1);
      }
    }

    // استخراج العلاقات بين الكيانات
    contextMap.relationships = this.extractRelationships(chunks);

    return contextMap;
  }

  /**
   * استرجاع الأجزاء ذات الصلة بناءً على استعلام
   */
  retrieveRelevantChunks(
    query: string,
    chunks: TextChunk[],
    contextMap: ContextMap,
    options: RetrievalOptions = {}
  ): RetrievalResult {
    const startTime = Date.now();
    const maxChunks = options.maxChunks ?? 5;
    const minRelevanceScore = options.minRelevanceScore ?? 0.3;

    // حساب درجات الصلة لكل جزء
    const relevanceScores = new Map<string, number>();

    for (const chunk of chunks) {
      const score = this.calculateRelevanceScore(
        query,
        chunk,
        contextMap
      );
      relevanceScores.set(chunk.id, score);
    }

    // ترتيب الأجزاء حسب درجة الصلة
    const sortedChunks = chunks
      .filter(
        (chunk) => (relevanceScores.get(chunk.id) ?? 0) >= minRelevanceScore
      )
      .sort(
        (a, b) =>
          (relevanceScores.get(b.id) ?? 0) - (relevanceScores.get(a.id) ?? 0)
      )
      .slice(0, maxChunks);

    // بناء السياق من الأجزاء ذات الصلة
    const context = sortedChunks.map((chunk) => chunk.content).join("\n\n");

    return {
      chunks: sortedChunks,
      context,
      relevanceScores,
      metadata: {
        totalChunks: sortedChunks.length,
        query,
        retrievalTime: Date.now() - startTime,
      },
    };
  }

  /**
   * إنشاء ملخص للجزء باستخدام Gemini
   */
  private async generateChunkSummary(content: string): Promise<string> {
    const prompt = `
لخص النص التالي في جملة واحدة أو جملتين قصيرتين:
 ${content.substring(0, 1000)}
`;

    try {
      const summary = await this.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 150,
      });

      return summary.trim();
    } catch (error) {
      logger.error("Error generating chunk summary:", error);
      // fallback: أول 100 حرف
      return content.substring(0, 100);
    }
  }

  /**
   * استخراج الكيانات باستخدام Gemini
   */
  private async extractEntities(content: string): Promise<string[]> {
    const prompt = `
استخرج أسماء الشخصيات والأماكن والمؤسسات المذكورة في النص التالي:
 ${content.substring(0, 1000)}

قدم الأسماء كقائمة مفصولة بفواصل:
`;

    try {
      const result = await this.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 300,
      });

      return result
        .split(",")
        .map((entity: string) => entity.trim())
        .filter((entity: string) => entity.length > 0);
    } catch (error) {
      logger.error("Error extracting entities:", error);
      // fallback: استخراج بسيط يعتمد على الأحرف الكبيرة
      const words = content.split(/\s+/);
      return words
        .filter((word) => word.length > 2 && word[0] === word[0]?.toUpperCase())
        .slice(0, 10); // تحديد العدد لتجنب القوائم الطويلة
    }
  }

  /**
   * استخراج المواضيع باستخدام Gemini
   */
  private async extractThemes(content: string): Promise<string[]> {
    const prompt = `
استخرج المواضيع والأفكار الرئيسية في النص التالي:
 ${content.substring(0, 1000)}

قدم المواضيع كقائمة مفصولة بفواصل:
`;

    try {
      const result = await this.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 300,
      });

      return result
        .split(",")
        .map((theme: string) => theme.trim())
        .filter((theme: string) => theme.length > 0);
    } catch (error) {
      logger.error("Error extracting themes:", error);
      return [];
    }
  }

  /**
   * استخراج العلاقات بين الكيانات
   */
  private extractRelationships(
    chunks: TextChunk[]
  ): Map<string, string[]> {
    const relationships = new Map<string, string[]>();

    // للتبسيط، نستخرج العلاقات بناءً على ظهور الكيانات معاً في نفس الجزء
    for (const chunk of chunks) {
      const words = chunk.content.split(/\s+/);
      const entities = words
        .filter((word) => word.length > 2 && word[0] === word[0]?.toUpperCase())
        .slice(0, 10); // تحديد العدد

      // إضافة علاقات بين كل زوج من الكيانات في نفس الجزء
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entity1 = entities[i];
          const entity2 = entities[j];

          if (!entity1 || !entity2) continue;

          // إضافة entity2 إلى قائمة علاقات entity1
          if (!relationships.has(entity1)) {
            relationships.set(entity1, []);
          }
          const entity1Relations = relationships.get(entity1)!;
          if (!entity1Relations.includes(entity2)) {
            entity1Relations.push(entity2);
          }

          // إضافة entity1 إلى قائمة علاقات entity2
          if (!relationships.has(entity2)) {
            relationships.set(entity2, []);
          }
          const entity2Relations = relationships.get(entity2)!;
          if (!entity2Relations.includes(entity1)) {
            entity2Relations.push(entity1);
          }
        }
      }
    }

    return relationships;
  }

  /**
   * حساب درجة الصلة بين الاستعلام والجزء
   */
  private calculateRelevanceScore(
    query: string,
    chunk: TextChunk,
    contextMap: ContextMap
  ): number {
    // للتبسيط، نستخدم تشابه الكلمات المفتاحية
    const queryWords = query.toLowerCase().split(/\s+/);
    const chunkContent = chunk.content.toLowerCase();

    // حساب عدد الكلمات المتطابقة
    let matchCount = 0;
    for (const word of queryWords) {
      if (chunkContent.includes(word)) {
        matchCount++;
      }
    }

    // حساب درجة التشابه البسيطة
    const wordSimilarity = matchCount / queryWords.length;

    // حساب درجة الصلة بناءً على الكيانات
    let entityScore = 0;
    for (const [entity, count] of contextMap.entities.entries()) {
      if (query.toLowerCase().includes(entity.toLowerCase())) {
        entityScore += Math.min(count / 5, 1); // تحديد أقصى قيمة
      }
    }
    entityScore = Math.min(entityScore / queryWords.length, 1);

    // حساب درجة الصلة بناءً على المواضيع
    let themeScore = 0;
    for (const [theme, count] of contextMap.themes.entries()) {
      if (query.toLowerCase().includes(theme.toLowerCase())) {
        themeScore += Math.min(count / 3, 1); // تحديد أقصى قيمة
      }
    }
    themeScore = Math.min(themeScore / queryWords.length, 1);

    // دمج الدرجات بأوزان مختلفة
    const combinedScore =
      wordSimilarity * 0.5 + entityScore * 0.3 + themeScore * 0.2;

    return Math.min(combinedScore, 1);
  }
}

// Export singleton instance
let contextRetrieverInstance: ContextRetriever | null = null;

export function getContextRetriever(
  geminiService: GeminiService
): ContextRetriever {
  if (!contextRetrieverInstance) {
    contextRetrieverInstance = new ContextRetriever(geminiService);
  }
  return contextRetrieverInstance;
}

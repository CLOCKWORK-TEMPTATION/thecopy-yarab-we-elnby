/**
 * Semantic Chunker Tests
 */

import { SemanticChunker } from "@the-copy/core-memory";
import { describe, it, expect, beforeEach } from "vitest";

interface SemanticChunkerInternals {
  cosineSimilarity(vec1: number[], vec2: number[]): number;
}

describe("SemanticChunker", () => {
  let chunker: SemanticChunker;

  beforeEach(() => {
    chunker = new SemanticChunker();
  });

  const chunkerInternals = (): SemanticChunkerInternals =>
    chunker as unknown as SemanticChunkerInternals;

  describe("detectSentenceBoundaries", () => {
    it("should detect Arabic sentence boundaries", () => {
      const text = "هذه جملة أولى؟ وهذه جملة ثانية. جملة ثالثة!";
      const sentences = chunker.detectSentenceBoundaries(text);

      expect(sentences.length).toBeGreaterThan(0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    });

    it("should handle English sentences", () => {
      const text =
        "This is a first sentence. Here is a second one! And a third?";
      const sentences = chunker.detectSentenceBoundaries(text);

      expect(sentences.length).toBeGreaterThan(0);
    });

    it("should filter out very short fragments", () => {
      const text = "Hello. World. This is a proper sentence.";
      const sentences = chunker.detectSentenceBoundaries(text);

      // Very short fragments should be filtered
      sentences.forEach((s) => {
        expect(s.length).toBeGreaterThan(5);
      });
    });

    it("should handle text without punctuation", () => {
      const text = "This is a text without punctuation marks";
      const sentences = chunker.detectSentenceBoundaries(text);

      expect(sentences.length).toBeGreaterThan(0);
    });
  });

  describe("chunkText", () => {
    // Mock embedding function
    const mockGetEmbedding = (_text: string): Promise<number[]> => {
      // Simple mock: return random embedding
      return Promise.resolve(Array.from({ length: 768 }, () => Math.random()));
    };

    it("should chunk long text", async () => {
      const text = `
        الفصل الأول: البداية. كان يا ما كان في قديم الزمان.
        قصة جميلة عن شخصيات مثيرة. هذا هو النص الأول.
        الفصل الثاني: التطور. تبدأ الأحداث في التصاعد.
        الشخصيات تواجه تحديات جديدة. التشويق يزداد.
        الفصل الثالث: الذروة. الأحداث تصل إلى قمتها.
        المفاجآت تتوالى بسرعة. النهاية تقترب.
      `.trim();

      const chunks = await chunker.chunkText(text, mockGetEmbedding);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeGreaterThan(0);
        expect(chunk.coherenceScore).toBeGreaterThanOrEqual(0);
        expect(chunk.coherenceScore).toBeLessThanOrEqual(1);
        expect(chunk.sentences.length).toBeGreaterThan(0);
      });
    });

    it("should return single chunk for short text", async () => {
      const text = "This is a short text.";
      const chunks = await chunker.chunkText(text, mockGetEmbedding);

      expect(chunks.length).toBe(1);
      expect(chunks[0]?.text).toBe(text);
    });

    it("should respect max chunk size", async () => {
      const chunkerWithSmallSize = new SemanticChunker({ maxChunkSize: 100 });

      const longText = "Lorem ipsum dolor sit amet. ".repeat(50);
      const chunks = await chunkerWithSmallSize.chunkText(
        longText,
        mockGetEmbedding,
      );

      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(150); // Some tolerance
      });
    });

    it("should handle empty text", async () => {
      const chunks = await chunker.chunkText("", mockGetEmbedding);
      expect(chunks.length).toBe(1);
    });
  });

  describe("cosineSimilarity", () => {
    it("should calculate cosine similarity correctly", () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];

      const similarity = chunkerInternals().cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(1);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];

      const similarity = chunkerInternals().cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    it("should return 0 for mismatched vector lengths", () => {
      const vec1 = [1, 0];
      const vec2 = [1, 0, 0];

      const similarity = chunkerInternals().cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    it("should handle zero vectors", () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];

      const similarity = chunkerInternals().cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });
});

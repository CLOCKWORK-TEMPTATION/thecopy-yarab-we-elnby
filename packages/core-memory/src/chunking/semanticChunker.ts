import type {
  ChunkingOptions,
  EmbeddingProvider,
  SemanticChunk,
} from "../types";

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 800,
  minChunkSize: 200,
  coherenceThreshold: 0.6,
  overlapSentences: 1,
};

export class SemanticChunker {
  private options: ChunkingOptions;

  constructor(options: ChunkingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async chunkText(
    text: string,
    getEmbedding: EmbeddingProvider
  ): Promise<SemanticChunk[]> {
    if (!text || text.length < (this.options.minChunkSize || 200)) {
      return [
        {
          text,
          startIndex: 0,
          endIndex: text.length,
          coherenceScore: 1,
          sentences: [text],
        },
      ];
    }

    const sentences = this.detectSentenceBoundaries(text);
    if (sentences.length === 0) {
      return [];
    }

    const coherenceScores = await this.calculateSemanticCoherence(
      sentences,
      getEmbedding
    );

    return this.mergeSemanticallyRelated(sentences, coherenceScores);
  }

  detectSentenceBoundaries(text: string): string[] {
    const matches = text.replace(/([.!?؟]+)/g, "$1\n").split(/\n+/);

    if (matches && matches.length > 0) {
      return matches.map((sentence) => sentence.trim()).filter(Boolean);
    }

    return text
      .split(/[.\n]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 20);
  }

  async calculateSemanticCoherence(
    sentences: string[],
    getEmbedding: EmbeddingProvider
  ): Promise<number[]> {
    if (sentences.length <= 1) {
      return [];
    }

    const embeddings = await Promise.all(
      sentences.map((sentence) => getEmbedding(sentence))
    );

    const coherenceScores: number[] = [];
    for (let index = 0; index < sentences.length - 1; index += 1) {
      const embeddingA = embeddings[index];
      const embeddingB = embeddings[index + 1];
      if (!embeddingA || !embeddingB) {
        coherenceScores.push(0);
        continue;
      }
      coherenceScores.push(this.cosineSimilarity(embeddingA, embeddingB));
    }

    return coherenceScores;
  }

  mergeSemanticallyRelated(
    sentences: string[],
    coherenceScores: number[]
  ): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    let currentChunk: string[] = [];
    let chunkStartIndex = 0;
    let currentLength = 0;
    let cursor = 0;
    const maxChunkSize = this.options.maxChunkSize || 800;

    const flushCurrentChunk = (endIndex: number, sentenceIndex: number) => {
      if (currentChunk.length === 0) {
        return;
      }

      const chunkText = currentChunk.join(" ");
      chunks.push({
        text: chunkText,
        startIndex: chunkStartIndex,
        endIndex,
        coherenceScore: this.calculateAverageCoherence(
          currentChunk.length - 1,
          coherenceScores,
          sentenceIndex - currentChunk.length
        ),
        sentences: [...currentChunk],
      });
    };

    for (let index = 0; index < sentences.length; index += 1) {
      const sentence = sentences[index];
      if (!sentence) {
        continue;
      }

      const sentenceStart = cursor;
      cursor += sentence.length + 1;
      if (sentence.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          flushCurrentChunk(sentenceStart - 1, index);
          currentChunk = [];
          currentLength = 0;
        }

        const fragments = this.splitLongSentence(sentence, maxChunkSize);
        let fragmentStart = sentenceStart;
        fragments.forEach((fragment) => {
          chunks.push({
            text: fragment,
            startIndex: fragmentStart,
            endIndex: fragmentStart + fragment.length,
            coherenceScore: 1,
            sentences: [fragment],
          });
          fragmentStart += fragment.length + 1;
        });
        chunkStartIndex = cursor;
        continue;
      }

      const wouldExceedMax =
        currentLength + sentence.length > maxChunkSize;
      const isSemanticBoundary =
        index < coherenceScores.length &&
        (coherenceScores[index] ?? 1) <
          (this.options.coherenceThreshold || 0.6);

      if (
        currentChunk.length > 0 &&
        (wouldExceedMax ||
          (currentLength >= (this.options.minChunkSize || 200) &&
            isSemanticBoundary))
      ) {
        const chunkText = currentChunk.join(" ");
        const chunkEndIndex = chunkStartIndex + chunkText.length;
        flushCurrentChunk(chunkEndIndex, index);

        const overlapCount = this.options.overlapSentences || 1;
        if (overlapCount > 0 && currentChunk.length > overlapCount) {
          currentChunk = currentChunk.slice(-overlapCount);
          const overlapText = currentChunk.join(" ");
          chunkStartIndex = chunkEndIndex - overlapText.length;
          currentLength = overlapText.length;
        } else {
          currentChunk = [];
          chunkStartIndex = sentenceStart;
          currentLength = 0;
        }
      }

      if (currentChunk.length === 0) {
        chunkStartIndex = sentenceStart;
      }

      currentChunk.push(sentence);
      currentLength += sentence.length + 1;
    }

    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(" ");
      chunks.push({
        text: chunkText,
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + chunkText.length,
        coherenceScore: this.calculateAverageCoherence(
          currentChunk.length - 1,
          coherenceScores,
          sentences.length - currentChunk.length
        ),
        sentences: [...currentChunk],
      });
    }

    return chunks;
  }

  private splitLongSentence(sentence: string, maxChunkSize: number): string[] {
    const fragments: string[] = [];
    let start = 0;

    while (start < sentence.length) {
      const end = Math.min(start + maxChunkSize, sentence.length);
      fragments.push(sentence.slice(start, end).trim());
      start = end;
    }

    return fragments.filter(Boolean);
  }

  private calculateAverageCoherence(
    numPairs: number,
    coherenceScores: number[],
    startIndex: number
  ): number {
    if (numPairs <= 0 || coherenceScores.length === 0) {
      return 1;
    }

    let sum = 0;
    let count = 0;

    for (
      let index = 0;
      index < numPairs && startIndex + index < coherenceScores.length;
      index += 1
    ) {
      sum += coherenceScores[startIndex + index] ?? 0;
      count += 1;
    }

    return count > 0 ? sum / count : 1;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let index = 0; index < vecA.length; index += 1) {
      const a = vecA[index] ?? 0;
      const b = vecB[index] ?? 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

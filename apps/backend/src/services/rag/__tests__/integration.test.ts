/**
 * RAG Integration Tests
 */

import { SemanticChunker } from "@the-copy/core-memory";
import { expect, it, vi } from "vitest";

const { mockIndexAdHocDocument, mockRetrieve } = vi.hoisted(() => ({
  mockIndexAdHocDocument: vi.fn(),
  mockRetrieve: vi.fn(),
}));

vi.mock("../../../memory/indexer/weaviate-indexing.service", () => ({
  weaviateIndexingService: {
    indexAdHocDocument: mockIndexAdHocDocument,
  },
}));

vi.mock("../../../memory/retrieval/weaviate-retrieval.service", () => ({
  weaviateRetrievalService: {
    retrieve: mockRetrieve,
  },
}));

import { EnhancedRAGService } from "../enhancedRAG.service";

it("should execute the unified ad hoc pipeline end to end", async () => {
  mockIndexAdHocDocument.mockResolvedValue({
    documentHash: "hash-1",
    totalChunks: 3,
    inserted: 3,
  });
  mockRetrieve.mockResolvedValue([
    {
      text: "التطور النفسي للشخصية يظهر من خلال تصرفاتها.",
      source: "request-document",
      type: "ad-hoc",
      collection: "AdHocChunks",
      chunkIndex: 0,
      startIndex: 0,
      endIndex: 45,
      coherenceScore: 0.82,
      sentences: ["التطور النفسي للشخصية يظهر من خلال تصرفاتها."],
      documentHash: "hash-1",
      metadata: {},
      relevanceScore: 0.93,
      rank: 1,
    },
    {
      text: "النمو الشخصي واضح من خلال القرارات الجديدة.",
      source: "request-document",
      type: "ad-hoc",
      collection: "AdHocChunks",
      chunkIndex: 1,
      startIndex: 46,
      endIndex: 88,
      coherenceScore: 0.78,
      sentences: ["النمو الشخصي واضح من خلال القرارات الجديدة."],
      documentHash: "hash-1",
      metadata: {},
      relevanceScore: 0.87,
      rank: 2,
    },
  ]);

  const service = new EnhancedRAGService({
    maxChunks: 2,
    minRelevanceScore: 0.5,
  });

  const result = await service.performRAG(
    "character development and growth",
    "نص طويل ".repeat(50),
  );

  expect(result.chunks).toHaveLength(2);
  expect(result.metrics.totalChunks).toBe(3);
  expect(result.metrics.retrievedChunks).toBe(2);
  expect(mockRetrieve).toHaveBeenCalledWith(
    expect.objectContaining({
      collections: [
        {
          name: "AdHocChunks",
          limit: 6,
          filters: [{ property: "documentHash", value: "hash-1" }],
        },
      ],
    }),
  );
});

it("should group semantically related sentences", async () => {
  const chunker = new SemanticChunker({
    maxChunkSize: 200,
    coherenceThreshold: 0.5,
  });

  const mockGetEmbedding = (text: string): Promise<number[]> => {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = Array.from({ length: 100 }, () => 0);

    words.forEach((word) => {
      const hash = word
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = hash % 100;
      embedding[index] = (embedding[index] ?? 0) + 1;
    });

    return Promise.resolve(embedding);
  };

  const text = `
      الموضوع الأول عن السياسة. السياسة مهمة جداً.
      الموضوع الثاني عن الرياضة. كرة القدم رياضة شعبية.
      العودة للسياسة مرة أخرى. الانتخابات قادمة.
    `.trim();

  const chunks = await chunker.chunkText(text, mockGetEmbedding);

  expect(chunks.length).toBeGreaterThan(0);
  chunks.forEach((chunk) => {
    expect(chunk.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(chunk.coherenceScore).toBeLessThanOrEqual(1);
  });
});

it("should build complete augmented prompt from unified chunks", async () => {
  mockIndexAdHocDocument.mockResolvedValue({
    documentHash: "hash-2",
    totalChunks: 2,
    inserted: 2,
  });
  mockRetrieve.mockResolvedValue([
    {
      text: "حوار الشخصيات طبيعي وواقعي.",
      source: "request-document",
      type: "ad-hoc",
      collection: "AdHocChunks",
      chunkIndex: 0,
      startIndex: 0,
      endIndex: 30,
      coherenceScore: 0.8,
      sentences: ["حوار الشخصيات طبيعي وواقعي."],
      documentHash: "hash-2",
      metadata: {},
      relevanceScore: 0.91,
      rank: 1,
    },
  ]);

  const service = new EnhancedRAGService({
    maxChunks: 2,
    minRelevanceScore: 0.3,
  });

  const result = await service.performRAG(
    "Analyze the dialogue",
    "حوار الشخصيات طبيعي وواقعي. ".repeat(10),
  );
  const augmentedPrompt = service.buildAugmentedPrompt(
    "Analyze the dialogue",
    result.chunks,
  );

  expect(augmentedPrompt).toContain("Analyze the dialogue");
  expect(augmentedPrompt).toContain("حوار الشخصيات طبيعي وواقعي");
  expect(augmentedPrompt).toContain("سياق");
});

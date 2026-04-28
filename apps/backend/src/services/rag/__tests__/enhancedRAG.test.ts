/**
 * Enhanced RAG Service Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EnhancedRAGService } from "../enhancedRAG.service";

import type { RetrievedChunk } from "../enhancedRAG.service";

const {
  mockIndexAdHocDocument,
  mockRetrieve,
  mockSelectHits,
  mockBuildAugmentedPrompt,
} = vi.hoisted(() => ({
  mockIndexAdHocDocument: vi.fn(),
  mockRetrieve: vi.fn(),
  mockSelectHits: vi.fn<(hits: RetrievedChunk[]) => RetrievedChunk[]>(),
  mockBuildAugmentedPrompt: vi.fn(),
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

vi.mock("../../../memory/context/context-assembly.service", () => ({
  contextAssemblyService: {
    selectHits: mockSelectHits,
    buildAugmentedPrompt: mockBuildAugmentedPrompt,
  },
}));

let service: EnhancedRAGService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new EnhancedRAGService();

  mockIndexAdHocDocument.mockResolvedValue({
    documentHash: "doc-hash",
    totalChunks: 4,
    inserted: 4,
  });
  mockRetrieve.mockResolvedValue([
    {
      text: "Relevant chunk 1",
      source: "request-document",
      type: "ad-hoc",
      collection: "AdHocChunks",
      chunkIndex: 0,
      startIndex: 0,
      endIndex: 16,
      coherenceScore: 0.8,
      sentences: ["Relevant chunk 1"],
      documentHash: "doc-hash",
      metadata: {},
      relevanceScore: 0.91,
      rank: 1,
    },
    {
      text: "Relevant chunk 2",
      source: "request-document",
      type: "ad-hoc",
      collection: "AdHocChunks",
      chunkIndex: 1,
      startIndex: 17,
      endIndex: 33,
      coherenceScore: 0.7,
      sentences: ["Relevant chunk 2"],
      documentHash: "doc-hash",
      metadata: {},
      relevanceScore: 0.86,
      rank: 2,
    },
  ]);
  mockSelectHits.mockImplementation((hits) =>
    hits.map((hit, index) => ({
      ...hit,
      rank: index + 1,
    })),
  );
  mockBuildAugmentedPrompt.mockReturnValue("augmented prompt");
});

describe("performRAG", () => {
  it("should retrieve relevant chunks through unified services", async () => {
    const query = "What is the character development?";
    const document = "نص طويل ".repeat(40);

    const result = await service.performRAG(query, document);

    expect(mockIndexAdHocDocument).toHaveBeenCalledWith(
      document.trim(),
      "request-document",
      expect.objectContaining({
        maxChunkSize: 800,
        coherenceThreshold: 0.6,
      }),
    );
    expect(mockRetrieve).toHaveBeenCalledWith(
      expect.objectContaining({
        query,
        collections: [
          {
            name: "AdHocChunks",
            limit: 15,
            filters: [{ property: "documentHash", value: "doc-hash" }],
          },
        ],
      }),
    );
    expect(mockSelectHits).toHaveBeenCalled();
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.metrics.totalChunks).toBe(4);
    expect(result.metrics.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return empty for short documents", async () => {
    const result = await service.performRAG("test", "Short");

    expect(mockIndexAdHocDocument).not.toHaveBeenCalled();
    expect(result.chunks.length).toBe(0);
    expect(result.metrics.totalChunks).toBe(0);
  });

  it("should filter chunks by relevance threshold", async () => {
    const serviceWithHighThreshold = new EnhancedRAGService({
      minRelevanceScore: 0.9,
    });

    const result = await serviceWithHighThreshold.performRAG(
      "query",
      "نص طويل ".repeat(40),
    );

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.relevanceScore).toBeGreaterThanOrEqual(0.9);
  });

  it("should limit number of returned chunks", async () => {
    const serviceWithLimit = new EnhancedRAGService({
      maxChunks: 1,
    });

    mockSelectHits.mockImplementation((hits) => hits.slice(0, 1));

    const result = await serviceWithLimit.performRAG(
      "query",
      "نص طويل ".repeat(40),
    );

    expect(result.chunks.length).toBeLessThanOrEqual(1);
  });

  it("should fail explicitly when indexing fails", async () => {
    mockIndexAdHocDocument.mockRejectedValueOnce(
      new Error("Weaviate unavailable"),
    );

    await expect(
      service.performRAG("query", "نص طويل ".repeat(40)),
    ).rejects.toThrow("Weaviate unavailable");
  });
});

describe("buildAugmentedPrompt", () => {
  it("should delegate prompt assembly to the unified context assembler", () => {
    const basePrompt = "Analyze this text";
    const chunks = [
      {
        text: "Relevant chunk 1",
        startIndex: 0,
        endIndex: 16,
        coherenceScore: 0.8,
        sentences: ["Relevant chunk 1"],
        relevanceScore: 0.9,
        rank: 1,
      },
    ];

    const prompt = service.buildAugmentedPrompt(basePrompt, chunks);

    expect(mockBuildAugmentedPrompt).toHaveBeenCalledWith(
      basePrompt,
      chunks,
      "analysis",
    );
    expect(prompt).toBe("augmented prompt");
  });
});

describe("setOptions and getOptions", () => {
  it("should update options", () => {
    service.setOptions({
      maxChunks: 10,
      minRelevanceScore: 0.8,
    });

    const options = service.getOptions();

    expect(options.maxChunks).toBe(10);
    expect(options.minRelevanceScore).toBe(0.8);
  });

  it("should preserve other options when updating", () => {
    const initialChunkSize = service.getOptions().chunkSize;

    service.setOptions({ maxChunks: 10 });

    expect(service.getOptions().chunkSize).toBe(initialChunkSize);
  });
});

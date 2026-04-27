import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEnsureCollection,
  mockInsertMany,
  mockDeleteMany,
  mockInsert,
  mockGetCollection,
  mockCrawl,
} = vi.hoisted(() => ({
  mockEnsureCollection: vi.fn(),
  mockInsertMany: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockInsert: vi.fn(),
  mockGetCollection: vi.fn(),
  mockCrawl: vi.fn(),
}));

vi.mock("@/services/rag/embeddings.service", () => ({
  embeddingsService: {
    getEmbedding: vi.fn((text: string) =>
      Array.from({ length: 4 }, (_, index) => text.length + index)
    ),
    getEmbeddingsBatch: vi.fn((texts: string[]) =>
      texts.map((text) => Array.from({ length: 4 }, (_, index) => text.length + index))
    ),
  },
}));

vi.mock("../embeddings/generator", () => ({
  embeddingGenerator: {
    generateForDocumentation: vi.fn((text: string) => ({
      embedding: Array.from({ length: 4 }, (_, index) => text.length + index),
      dimensionality: 1536,
      contentHash: `hash-${text.length}`,
    })),
  },
}));

vi.mock("./repository-crawler", () => ({
  repositoryCrawler: {
    crawl: mockCrawl,
    crawlSpecific: vi.fn(),
    extractImports: vi.fn(() => ["fs"]),
    extractExports: vi.fn(() => ["handler"]),
    extractFunctions: vi.fn(() => ["runTask"]),
    extractClasses: vi.fn(() => ["Worker"]),
  },
}));

vi.mock("../vector-store/client", () => ({
  weaviateStore: {
    ensureCollection: mockEnsureCollection,
    insertMany: mockInsertMany,
    getCollection: mockGetCollection,
  },
}));

import { weaviateIndexingService } from "./weaviate-indexing.service";

function objectContainingMatcher(value: Record<string, unknown>): unknown {
  return expect.objectContaining(value);
}

describe("WeaviateIndexingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetCollection.mockReturnValue({
      filter: {
        byProperty: vi.fn((property: string) => ({
          equal: vi.fn((value: unknown) => ({ property, value })),
        })),
      },
      data: {
        deleteMany: mockDeleteMany,
        insert: mockInsert,
      },
    });
    mockInsertMany.mockResolvedValue({ hasErrors: false, errors: {} });
    mockDeleteMany.mockResolvedValue({ matches: 0 });
    mockInsert.mockResolvedValue("uuid-1");
  });

  it("should index an ad hoc document through batch insert", async () => {
    const result = await weaviateIndexingService.indexAdHocDocument(
      "هذه فقرة أولى. وهذه فقرة ثانية مرتبطة بها. وهذه فقرة ثالثة طويلة بما يكفي."
    );

    expect(result.documentHash).toBeTruthy();
    expect(result.totalChunks).toBeGreaterThan(0);
    expect(mockDeleteMany).toHaveBeenCalled();
    expect(mockInsertMany).toHaveBeenCalledWith(
      "AdHocChunks",
      expect.arrayContaining([
        expect.objectContaining({
          properties: objectContainingMatcher({
            documentHash: result.documentHash,
          }),
        }),
      ])
    );
  });

  it("should index repository files into specialized collections", async () => {
    mockCrawl.mockResolvedValue([
      {
        path: "E:\\repo\\src\\file.ts",
        relativePath: "src/file.ts",
        content: "function runTask() { return true; }",
        size: 32,
        lastModified: new Date("2026-04-05T00:00:00.000Z"),
        language: "typescript",
        extension: "ts",
      },
      {
        path: "E:\\repo\\docs\\README.md",
        relativePath: "docs/README.md",
        content: "# Readme\n\nتفاصيل معمارية مهمة في النظام.",
        size: 64,
        lastModified: new Date("2026-04-05T00:00:00.000Z"),
        language: "markdown",
        extension: "md",
      },
    ]);

    const stats = await weaviateIndexingService.indexRepository({
      repoPath: "E:\\repo",
      maxFiles: 10,
    });

    expect(stats.filesProcessed).toBe(2);
    expect(stats.chunksIndexed).toBeGreaterThan(0);
    expect(stats.collections.CodeChunks).toBeGreaterThan(0);
    expect(mockInsertMany).toHaveBeenCalled();
  });
});

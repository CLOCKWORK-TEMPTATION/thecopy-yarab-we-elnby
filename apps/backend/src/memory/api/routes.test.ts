import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHealthCheck, mockGetStatus } = vi.hoisted(() => ({
  mockHealthCheck: vi.fn(),
  mockGetStatus: vi.fn(),
}));

vi.mock('../retrieval/context-builder', () => ({
  contextBuilder: {
    buildContext: vi.fn(),
    quickSearch: vi.fn(),
  },
}));

vi.mock('../vector-store/client', () => ({
  weaviateStore: {
    healthCheck: mockHealthCheck,
    getStatus: mockGetStatus,
    connect: vi.fn(),
    deleteCollection: vi.fn(),
    ensureCollection: vi.fn(),
    getCollectionCount: vi.fn(),
  },
}));

vi.mock('../embeddings/generator', () => ({
  embeddingGenerator: {
    generateForDocumentation: vi.fn(),
  },
}));

vi.mock('../indexer/repository-crawler', () => ({
  repositoryCrawler: {
    crawl: vi.fn(),
    crawlSpecific: vi.fn(),
  },
}));

vi.mock('../indexer/weaviate-indexing.service', () => ({
  weaviateIndexingService: {
    indexRepository: vi.fn(),
    storeMemoryEntry: vi.fn(),
  },
}));

vi.mock('../embeddings/mrl-optimizer', () => ({
  mrlOptimizer: {
    suggestDimension: vi.fn(),
    calculateStorageSavings: vi.fn(),
  },
}));

vi.mock('../vector-store/schema', () => ({
  CodeChunksSchema: {},
  DocumentationSchema: {},
  DecisionsSchema: {},
  ArchitectureSchema: {},
  AdHocChunksSchema: {},
}));

import { memoryHealthHandler } from './routes';

function createResponseMock() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('memoryHealthHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['GOOGLE_GENAI_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
  });

  it('يعتبر اعتماد مزود الذكاء الاصطناعي مضبوطًا عند وجود المفتاح البديل فقط', async () => {
    process.env['GEMINI_API_KEY'] = 'fallback-key';

    mockGetStatus
      .mockReturnValueOnce({
        enabled: true,
        required: false,
        state: 'connected',
        host: 'http://localhost:8080',
      })
      .mockReturnValueOnce({
        enabled: true,
        required: false,
        state: 'connected',
        host: 'http://localhost:8080',
      });
    mockHealthCheck.mockResolvedValue(true);

    const response = createResponseMock();

    await memoryHealthHandler({} as never, response as never);

    expect(response["status"]).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        gemini: 'configured',
      })
    );
  });

  it('يرجع حالة معطلة عندما يكون نظام الذاكرة متوقفًا', async () => {
    mockGetStatus
      .mockReturnValueOnce({
        enabled: false,
        required: false,
        state: 'disabled',
      })
      .mockReturnValueOnce({
        enabled: false,
        required: false,
        state: 'disabled',
      });

    const response = createResponseMock();

    await memoryHealthHandler({} as never, response as never);

    expect(mockHealthCheck).not.toHaveBeenCalled();
    expect(response["status"]).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'disabled',
        weaviate: 'disabled',
        required: false,
      })
    );
  });

  it('يرجع حالة غير صحية عند سقوط المخزن الإلزامي', async () => {
    mockGetStatus
      .mockReturnValueOnce({
        enabled: true,
        required: true,
        state: 'connecting',
        host: 'http://localhost:8080',
      })
      .mockReturnValueOnce({
        enabled: true,
        required: true,
        state: 'failed',
        host: 'http://localhost:8080',
        lastError: 'connection refused',
      });
    mockHealthCheck.mockResolvedValue(false);

    const response = createResponseMock();

    await memoryHealthHandler({} as never, response as never);

    expect(response["status"]).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unhealthy',
        weaviate: 'disconnected',
        required: true,
      })
    );
  });
});

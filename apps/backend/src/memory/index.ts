/**
 * Memory System - Barrel Exports
 * نظام الذاكرة - الملف الرئيسي
 */

// Configuration
export { defaultConfig, type MemoryConfig } from "./config";

// Types
export type {
  EmbeddingResult,
  MultimodalInput,
  DimensionSize,
  TaskType,
  FileInfo,
  CrawlOptions,
  GitChangeEvent,
  ContextQuery,
  ContextProfile,
  ContextResult,
  BuiltContext,
  CodeChunkData,
  DocumentationData,
  DecisionData,
  AdHocChunkData,
  SearchRequest,
  SearchResponse,
  IndexRequest,
  MemoryStats,
  RetrievalFilter,
  RetrievalCollectionRequest,
  UnifiedRetrievalRequest,
  IndexingStats,
} from "./types";

// Embeddings
export {
  GeminiEmbeddingGenerator,
  embeddingGenerator,
} from "./embeddings/generator";

export { MRLOptimizer, mrlOptimizer } from "./embeddings/mrl-optimizer";

// Vector Store
export { WeaviateMemoryStore, weaviateStore } from "./vector-store/client";

export {
  CodeChunksSchema,
  DocumentationSchema,
  DecisionsSchema,
  ArchitectureSchema,
  AdHocChunksSchema,
  ALL_SCHEMAS,
} from "./vector-store/schema";

// Indexer
export {
  RepositoryCrawler,
  repositoryCrawler,
} from "./indexer/repository-crawler";
export {
  WeaviateIndexingService,
  weaviateIndexingService,
} from "./indexer/weaviate-indexing.service";

export { GitWatcher, createGitWatcher } from "./indexer/git-watcher";

// Retrieval
export { ContextBuilder, contextBuilder } from "./retrieval/context-builder";
export {
  WeaviateRetrievalService,
  weaviateRetrievalService,
} from "./retrieval/weaviate-retrieval.service";
export {
  ContextAssemblyService,
  contextAssemblyService,
} from "./context/context-assembly.service";

// API
export { default as memoryRoutes, memoryHealthHandler } from "./api/routes";

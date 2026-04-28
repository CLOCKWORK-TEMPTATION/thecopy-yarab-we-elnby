/**
 * Memory System Types
 * أنواع نظام الذاكرة
 */

// Embedding Types
export interface EmbeddingResult {
  embedding: number[];
  dimensionality: number;
  contentHash: string;
}

export interface MultimodalInput {
  text?: string;
  imageUri?: string;
  videoUri?: string;
  audioUri?: string;
  documentUri?: string;
}

export type DimensionSize = 768 | 1536 | 3072;
export type TaskType =
  | "CODE_RETRIEVAL"
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING";

// Indexer Types
export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  lastModified: Date;
  language: string;
  extension: string;
}

export interface CrawlOptions {
  rootPath: string;
  include?: string[];
  exclude?: string[];
  maxFileSize?: number;
  maxFiles?: number;
}

export interface GitChangeEvent {
  type: "modified" | "added" | "deleted" | "renamed";
  filePath: string;
  oldPath?: string;
  commitHash: string;
  commitMessage: string;
  author: string;
  timestamp: Date;
}

// Retrieval Types
export type ContextProfile =
  | "analysis"
  | "completion"
  | "summarization"
  | "code";

export type ContextContentType =
  | "code"
  | "documentation"
  | "decision"
  | "architecture"
  | "ad-hoc";

export interface ContextQuery {
  query: string;
  agentId: string;
  conversationId?: string;
  filePath?: string;
  contentType?: ContextContentType[];
  profile?: ContextProfile;
  topK?: number;
  recencyBias?: number;
}

export interface ContextResult {
  id?: string;
  content: string;
  source: string;
  type: string;
  collection?: string;
  relevance: number;
  rank?: number;
  documentHash?: string;
  lastModified: Date;
  metadata: Record<string, unknown>;
}

export interface BuiltContext {
  query: string;
  profile?: ContextProfile;
  results: ContextResult[];
  summary: string;
  relevantFiles: string[];
  relevantDecisions: string[];
  tokenEstimate: number;
}

export interface RetrievalFilter {
  property: string;
  value: string | number | boolean;
}

export interface RetrievalCollectionRequest {
  name: string;
  limit?: number;
  filters?: RetrievalFilter[];
}

export interface UnifiedRetrievalRequest {
  query: string;
  profile?: ContextProfile;
  filePath?: string;
  topK?: number;
  recencyBias?: number;
  collections?: RetrievalCollectionRequest[];
}

// Vector Store Types
export interface CodeChunkData {
  content: string;
  filePath: string;
  language: string;
  chunkIndex: number;
  totalChunks: number;
  startLine: number;
  endLine: number;
  contentHash: string;
  lastModified: string;
  gitCommit: string;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  tags: string[];
}

export interface DocumentationData {
  content: string;
  filePath: string;
  title: string;
  section: string;
  docType: string;
  chunkIndex: number;
  contentHash: string;
  lastModified: string;
  tags: string[];
  relatedFiles: string[];
}

export interface DecisionData {
  content: string;
  title: string;
  decisionId: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  date: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives: string[];
  relatedDecisions: string[];
  affectedFiles: string[];
  tags: string[];
  contentHash: string;
}

export interface AdHocChunkData {
  content: string;
  source: string;
  documentHash: string;
  chunkIndex: number;
  totalChunks: number;
  startIndex: number;
  endIndex: number;
  coherenceScore: number;
  sentences: string[];
  contentHash: string;
  lastModified: string;
  tags: string[];
}

// API Types
export interface SearchRequest {
  query: string;
  collection?: string;
  topK?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  results: {
    content: string;
    source: string;
    certainty?: number;
    collection?: string;
  }[];
}

export interface IndexRequest {
  repoPath?: string;
  specificFiles?: string[];
  reset?: boolean;
  dimensionality?: 768 | 1536 | 3072;
}

export interface MemoryStats {
  collections: Record<string, number>;
  totalDocuments: number;
}

export interface IndexingStats {
  filesProcessed: number;
  chunksIndexed: number;
  collections: Record<string, number>;
}

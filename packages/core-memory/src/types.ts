export type EmbeddingProvider = (text: string) => Promise<number[]>;

export interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  coherenceThreshold?: number;
  overlapSentences?: number;
}

export interface SemanticChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  coherenceScore: number;
  sentences: string[];
}

export interface ChunkRecord {
  id?: string;
  text: string;
  source: string;
  type: string;
  collection: string;
  chunkIndex: number;
  documentHash?: string;
  startIndex?: number;
  endIndex?: number;
  startLine?: number;
  endLine?: number;
  coherenceScore?: number;
  sentences?: string[];
  lastModified?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalHit extends ChunkRecord {
  relevanceScore: number;
  rank: number;
  certainty?: number;
}

export interface CodeMemorySourceRoot {
  base: string;
  type: string;
  extensions: string[];
  maxDepth: number;
}

export interface CodeMemoryChunk {
  id: string;
  path: string;
  type: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  summary: string;
  fileHash: string;
  chunkHash: string;
  size: number;
  extension: string;
  discoveredAt: string;
  embedding?: number[];
}

export interface CodeMemoryDiff {
  newFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  unchangedFiles: string[];
  newChunks: string[];
  changedChunks: string[];
  deletedChunks: string[];
}

export interface CodeMemoryManifest {
  version: number;
  generatedAt: string;
  storage: {
    local: "lancedb";
    qdrant: "not-configured" | "synced" | "failed";
  };
  model: string;
  embeddingDimension: number;
  totalFiles: number;
  totalChunks: number;
  embeddedChunks: number;
  chunkIds: string[];
  fileHashes: Record<string, string>;
  diff: CodeMemoryDiff;
  qdrant?: {
    collection: string;
    syncedAt?: string;
    error?: string;
  };
}

export interface CodeMemoryHealth {
  exists: boolean;
  stale: boolean;
  generatedAt: string | null;
  totalFiles: number;
  totalChunks: number;
  embeddedChunks: number;
  coverageRate: number;
  missingChunks: number;
  deletedChunks: number;
  changedFiles: number;
  storage: CodeMemoryManifest["storage"] | null;
  qdrantCollection: string | null;
  message: string;
}

export interface CodeMemorySearchResult {
  id: string;
  path: string;
  type: string;
  chunkIndex: number;
  totalChunks: number;
  summary: string;
  content: string;
  lexicalScore: number;
  vectorScore: number;
  score: number;
  reason: string;
}

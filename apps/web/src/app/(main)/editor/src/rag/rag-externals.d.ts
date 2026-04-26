/**
 * Type declarations for optional RAG dependencies that may not be installed.
 * These stubs satisfy the TypeScript compiler when the actual packages are absent.
 */

declare module "@qdrant/js-client-rest" {
  export class QdrantClient {
    constructor(config: { url: string; apiKey: string });
    getCollections(): Promise<{
      collections: { name: string }[];
    }>;
    deleteCollection(name: string): Promise<unknown>;
    createCollection(
      name: string,
      params: { vectors: { size: number; distance: string } },
    ): Promise<unknown>;
    createPayloadIndex(
      name: string,
      params: { field_name: string; field_schema: string },
    ): Promise<unknown>;
    upsert(
      name: string,
      params: {
        wait: boolean;
        points: {
          id: number;
          vector: number[];
          payload: Record<string, unknown>;
        }[];
      },
    ): Promise<unknown>;
    search(
      name: string,
      params: {
        vector: number[];
        limit: number;
        with_payload: boolean;
      },
    ): Promise<
      {
        id: string | number;
        score: number;
        payload?: Record<string, unknown> | null;
      }[]
    >;
    getCollection(name: string): Promise<{
      points_count: number;
      indexed_vectors_count: number;
    }>;
  }
}

declare module "openai" {
  interface EmbeddingCreateParams {
    model: string;
    input: string | string[];
    encoding_format?: string;
  }

  interface EmbeddingData {
    embedding: number[];
  }

  interface EmbeddingResponse {
    data: EmbeddingData[];
  }

  interface Embeddings {
    create(params: EmbeddingCreateParams): Promise<EmbeddingResponse>;
  }

  interface OpenAIConfig {
    baseURL?: string;
    apiKey?: string;
    defaultHeaders?: Record<string, string>;
  }

  export default class OpenAI {
    constructor(config?: OpenAIConfig);
    embeddings: Embeddings;
  }
}

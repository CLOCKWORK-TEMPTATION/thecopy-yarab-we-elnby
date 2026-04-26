/* eslint-disable max-lines, max-lines-per-function, complexity, @typescript-eslint/no-explicit-any -- experimental memory retrieval module */
import { Filters } from "weaviate-client";

import type { RetrievalHit } from "@the-copy/core-memory";

import { embeddingsService } from "@/services/rag/embeddings.service";
import { definedProps } from "@/utils/defined-props";
import { logger } from "@/utils/logger";

import type {
  ContextContentType,
  ContextQuery,
  RetrievalCollectionRequest,
  RetrievalFilter,
  UnifiedRetrievalRequest,
} from "../types";
import { weaviateStore } from "../vector-store/client";

const COLLECTION_TYPE_MAP: Record<string, ContextContentType> = {
  CodeChunks: "code",
  Documentation: "documentation",
  Decisions: "decision",
  Architecture: "architecture",
  AdHocChunks: "ad-hoc",
};

const DEFAULT_COLLECTION_PROPERTIES: Record<string, string[]> = {
  CodeChunks: [
    "content",
    "filePath",
    "language",
    "chunkIndex",
    "startLine",
    "endLine",
    "contentHash",
    "lastModified",
    "imports",
    "exports",
    "functions",
    "classes",
    "tags",
  ],
  Documentation: [
    "content",
    "filePath",
    "title",
    "section",
    "docType",
    "chunkIndex",
    "contentHash",
    "lastModified",
    "tags",
    "relatedFiles",
  ],
  Decisions: [
    "content",
    "title",
    "decisionId",
    "status",
    "date",
    "context",
    "decision",
    "consequences",
    "alternatives",
    "relatedDecisions",
    "affectedFiles",
    "tags",
    "contentHash",
  ],
  Architecture: [
    "description",
    "filePath",
    "diagramType",
    "imageUri",
    "components",
    "relationships",
    "tags",
    "contentHash",
  ],
  AdHocChunks: [
    "content",
    "source",
    "documentHash",
    "chunkIndex",
    "totalChunks",
    "startIndex",
    "endIndex",
    "coherenceScore",
    "sentences",
    "contentHash",
    "lastModified",
    "tags",
  ],
};

export class WeaviateRetrievalService {
  private defaultTopK = 15;

  async retrieve(request: UnifiedRetrievalRequest): Promise<RetrievalHit[]> {
    const topK = request.topK ?? this.defaultTopK;
    const queryEmbedding = await embeddingsService.getEmbedding(request.query);
    await weaviateStore.connect();

    const collectionRequests = this.resolveCollections(request, topK);
    const searchResults = await Promise.all(
      collectionRequests.map((collectionRequest) =>
        this.searchCollection(queryEmbedding, collectionRequest)
      )
    );

    return this.rankResults(searchResults.flat(), request);
  }

  async retrieveForContext(query: ContextQuery): Promise<RetrievalHit[]> {
    return this.retrieve({
      query: query.query,
      collections: this.resolveContextCollections(query),
      ...definedProps({
        profile: query.profile,
        filePath: query.filePath,
        topK: query.topK,
        recencyBias: query.recencyBias,
      }),
    });
  }

  async quickSearch(
    query: string,
    collection?: string,
    topK: number = 5
  ): Promise<RetrievalHit[]> {
    return this.retrieve({
      query,
      topK,
      collections: collection
        ? [{ name: collection, limit: topK }]
        : [
            { name: "CodeChunks", limit: topK },
            { name: "Documentation", limit: topK },
          ],
    });
  }

  private async searchCollection(
    queryEmbedding: number[],
    request: RetrievalCollectionRequest
  ): Promise<RetrievalHit[]> {
    try {
      const collection = weaviateStore.getCollection<any>(request.name);
      const response = await collection.query.nearVector(queryEmbedding, {
        limit: request.limit ?? this.defaultTopK,
        filters: this.buildFilters(collection, request.filters),
        returnMetadata: ["certainty"],
        returnProperties:
          DEFAULT_COLLECTION_PROPERTIES[request.name] ?? ["content"],
      });

      return response.objects.map((object: any, index: number) =>
        this.toRetrievalHit(request.name, object, index)
      );
    } catch (error) {
      logger.error(`Error searching ${request.name}`, { error });
      return [];
    }
  }

  private buildFilters(collection: any, filters?: RetrievalFilter[]) {
    if (!filters || filters.length === 0) {
      return undefined;
    }

    const values = filters.map((filter) =>
      collection.filter
        .byProperty(filter.property as never)
        .equal(filter.value as never)
    );

    return values.length === 1 ? values[0] : Filters.and(...values);
  }

  private rankResults(
    results: RetrievalHit[],
    request: UnifiedRetrievalRequest
  ): RetrievalHit[] {
    const recencyBias = request.recencyBias ?? 0.3;
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    const queryDirectory = request.filePath
      ? this.getDirectory(request.filePath)
      : undefined;

    return results
      .map((result) => {
        const lastModifiedTime = result.lastModified
          ? new Date(result.lastModified).getTime()
          : 0;
        const age = lastModifiedTime > 0 ? now - lastModifiedTime : maxAge;
        const recencyScore = Math.max(0, 1 - age / maxAge);

        let finalScore =
          result.relevanceScore * (1 - recencyBias) + recencyScore * recencyBias;

        if (queryDirectory && result.source.includes(queryDirectory)) {
          finalScore *= 1.15;
        }

        return {
          ...result,
          relevanceScore: finalScore,
        };
      })
      .sort((left, right) => right.relevanceScore - left.relevanceScore)
      .map((result, index) => ({
        ...result,
        rank: index + 1,
      }));
  }

  private resolveCollections(
    request: UnifiedRetrievalRequest,
    topK: number
  ): RetrievalCollectionRequest[] {
    if (request.collections && request.collections.length > 0) {
      return request.collections.map((collection) => ({
        ...collection,
        limit: collection.limit ?? topK,
      }));
    }

    return [
      { name: "CodeChunks", limit: Math.ceil(topK / 2) },
      { name: "Documentation", limit: Math.ceil(topK / 3) },
      { name: "Decisions", limit: Math.max(3, Math.floor(topK / 4)) },
    ];
  }

  private resolveContextCollections(
    query: ContextQuery
  ): RetrievalCollectionRequest[] {
    const contentTypes = query.contentType;
    const topK = query.topK ?? this.defaultTopK;

    if (!contentTypes || contentTypes.length === 0) {
      return this.resolveCollections({ query: query.query, topK }, topK);
    }

    return contentTypes.map((contentType) => ({
      name: this.collectionNameForType(contentType),
      limit: Math.max(1, Math.ceil(topK / contentTypes.length)),
    }));
  }

  private collectionNameForType(contentType: ContextContentType): string {
    switch (contentType) {
      case "code":
        return "CodeChunks";
      case "documentation":
        return "Documentation";
      case "decision":
        return "Decisions";
      case "architecture":
        return "Architecture";
      case "ad-hoc":
        return "AdHocChunks";
      default:
        return "Documentation";
    }
  }

  private toRetrievalHit(
    collectionName: string,
    object: any,
    index: number
  ): RetrievalHit {
    const properties = (object.properties ?? {}) as Record<string, unknown>;
    const content =
      typeof properties["content"] === "string"
        ? properties["content"]
        : typeof properties["description"] === "string"
          ? properties["description"]
          : "";
    const source =
      typeof properties["filePath"] === "string"
        ? properties["filePath"]
        : typeof properties["source"] === "string"
          ? properties["source"]
          : typeof properties["title"] === "string"
            ? properties["title"]
            : collectionName;

    return {
      text: content,
      source,
      type: COLLECTION_TYPE_MAP[collectionName] ?? "documentation",
      collection: collectionName,
      chunkIndex:
        typeof properties["chunkIndex"] === "number" ? properties["chunkIndex"] : index,
      metadata: properties,
      relevanceScore: object.metadata?.certainty || 0,
      rank: index + 1,
      ...definedProps({
        id: object.uuid,
        documentHash:
          typeof properties["documentHash"] === "string"
            ? properties["documentHash"]
            : undefined,
        startIndex:
          typeof properties["startIndex"] === "number"
            ? properties["startIndex"]
            : undefined,
        endIndex:
          typeof properties["endIndex"] === "number"
            ? properties["endIndex"]
            : undefined,
        startLine:
          typeof properties["startLine"] === "number"
            ? properties["startLine"]
            : undefined,
        endLine:
          typeof properties["endLine"] === "number"
            ? properties["endLine"]
            : undefined,
        coherenceScore:
          typeof properties["coherenceScore"] === "number"
            ? properties["coherenceScore"]
            : undefined,
        sentences: Array.isArray(properties["sentences"])
          ? (properties["sentences"] as string[])
          : undefined,
        lastModified:
          typeof properties["lastModified"] === "string"
            ? properties["lastModified"]
            : typeof properties["date"] === "string"
              ? properties["date"]
              : undefined,
        certainty: object.metadata?.certainty,
      }),
    };
  }

  private getDirectory(filePath: string): string {
    const normalized = filePath.replace(/\//g, "\\");
    const separatorIndex = normalized.lastIndexOf("\\");
    return separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : normalized;
  }
}

export const weaviateRetrievalService = new WeaviateRetrievalService();

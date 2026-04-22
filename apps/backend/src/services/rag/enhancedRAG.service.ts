/**
 * Enhanced RAG Service - Unified Retrieval-Augmented Generation
 */

import type { SemanticChunk } from "@the-copy/core-memory";

import { definedProps } from "@/utils/defined-props";

import { contextAssemblyService } from "../../memory/context/context-assembly.service";
import { weaviateIndexingService } from "../../memory/indexer/weaviate-indexing.service";
import { weaviateRetrievalService } from "../../memory/retrieval/weaviate-retrieval.service";
import type { ContextProfile } from "../../memory/types";

export interface EnhancedRAGOptions {
  maxChunks?: number;
  minRelevanceScore?: number;
  chunkSize?: number;
  coherenceThreshold?: number;
  enableReranking?: boolean;
}

export interface EnhancedRAGRequestOptions {
  profile?: ContextProfile;
  source?: string;
}

export interface RetrievedChunk extends SemanticChunk {
  relevanceScore: number;
  rank: number;
  collection?: string;
  source?: string;
  documentHash?: string;
  metadata?: Record<string, unknown>;
}

export interface RAGMetrics {
  totalChunks: number;
  retrievedChunks: number;
  avgRelevanceScore: number;
  precision: number;
  recall: number;
  processingTimeMs: number;
}

const DEFAULT_OPTIONS: EnhancedRAGOptions = {
  maxChunks: 5,
  minRelevanceScore: 0.65,
  chunkSize: 800,
  coherenceThreshold: 0.6,
  enableReranking: true,
};

export class EnhancedRAGService {
  private options: EnhancedRAGOptions;

  constructor(options: EnhancedRAGOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private async indexDocument(
    normalizedDocument: string,
    requestOptions: EnhancedRAGRequestOptions
  ) {
    return weaviateIndexingService.indexAdHocDocument(
      normalizedDocument,
      requestOptions.source ?? "request-document",
      definedProps({
        maxChunkSize: this.options.chunkSize,
        coherenceThreshold: this.options.coherenceThreshold,
      })
    );
  }

  private async retrieveHits(
    query: string,
    profile: ContextProfile,
    topK: number,
    documentHash: string,
    totalChunks: number
  ) {
    const limit = Math.max(topK * 3, totalChunks);
    return weaviateRetrievalService.retrieve({
      query,
      profile,
      topK: limit,
      collections: [
        {
          name: "AdHocChunks",
          limit,
          filters: [{ property: "documentHash", value: documentHash }],
        },
      ],
    });
  }

  private selectAndMapChunks(
    retrievedHits: Array<{ relevanceScore: number; text: string; startIndex?: number; endIndex?: number; coherenceScore?: number; sentences?: string[]; rank: number; collection?: string; source?: string; documentHash?: string; metadata?: Record<string, unknown> }>,
    profile: ContextProfile,
    topK: number
  ): RetrievedChunk[] {
    const minScore = this.options.minRelevanceScore ?? DEFAULT_OPTIONS.minRelevanceScore ?? 0;
    const filteredHits = retrievedHits.filter((hit) => hit.relevanceScore >= minScore);

    const selectedHits = this.options.enableReranking === false
      ? filteredHits
          .sort((left, right) => right.relevanceScore - left.relevanceScore)
          .slice(0, topK)
          .map((hit, index) => ({ ...hit, rank: index + 1 }))
      : contextAssemblyService.selectHits(filteredHits as unknown as Parameters<typeof contextAssemblyService.selectHits>[0], profile, topK);

    return selectedHits.map<RetrievedChunk>((hit) => ({
      text: hit.text,
      startIndex: hit.startIndex ?? 0,
      endIndex: hit.endIndex ?? hit.text.length,
      coherenceScore: hit.coherenceScore ?? 1,
      sentences: hit.sentences ?? [hit.text],
      relevanceScore: hit.relevanceScore,
      rank: hit.rank,
      ...definedProps({
        collection: hit.collection,
        source: hit.source,
        documentHash: hit.documentHash,
        metadata: hit.metadata,
      }),
    }));
  }

  async performRAG(
    query: string,
    document: string,
    requestOptions: EnhancedRAGRequestOptions = {}
  ): Promise<{
    chunks: RetrievedChunk[];
    metrics: RAGMetrics;
  }> {
    const startTime = Date.now();
    const normalizedDocument = document.trim();
    const emptyResult = (total: number) => ({
      chunks: [],
      metrics: this.calculateMetrics(total, [], Date.now() - startTime),
    });

    if (!normalizedDocument || normalizedDocument.length < 20) {
      return emptyResult(0);
    }

    const profile = requestOptions.profile ?? "analysis";
    const indexedDocument = await this.indexDocument(normalizedDocument, requestOptions);

    if (indexedDocument.totalChunks === 0) {
      return emptyResult(0);
    }

    const topK = this.options.maxChunks ?? DEFAULT_OPTIONS.maxChunks ?? 5;
    const retrievedHits = await this.retrieveHits(
      query, profile, topK, indexedDocument.documentHash, indexedDocument.totalChunks
    );
    const chunks = this.selectAndMapChunks(retrievedHits, profile, topK);

    return {
      chunks,
      metrics: this.calculateMetrics(indexedDocument.totalChunks, chunks, Date.now() - startTime),
    };
  }

  buildAugmentedPrompt(
    basePrompt: string,
    chunks: RetrievedChunk[],
    profile: ContextProfile = "analysis"
  ): string {
    return contextAssemblyService.buildAugmentedPrompt(basePrompt, chunks, profile);
  }

  setOptions(options: Partial<EnhancedRAGOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): EnhancedRAGOptions {
    return { ...this.options };
  }

  private calculateMetrics(
    totalChunks: number,
    retrievedChunks: Array<{ relevanceScore: number }>,
    processingTimeMs: number
  ): RAGMetrics {
    const numRetrieved = retrievedChunks.length;

    const avgRelevanceScore =
      numRetrieved > 0
        ? retrievedChunks.reduce((sum, chunk) => sum + chunk.relevanceScore, 0) /
          numRetrieved
        : 0;

    const highlyRelevant = retrievedChunks.filter(
      (chunk) => chunk.relevanceScore > 0.75
    ).length;
    const precision = numRetrieved > 0 ? highlyRelevant / numRetrieved : 0;
    const maxExpectedRelevant = Math.min(5, totalChunks);
    const recall =
      maxExpectedRelevant > 0 ? numRetrieved / maxExpectedRelevant : 0;

    return {
      totalChunks,
      retrievedChunks: numRetrieved,
      avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100,
      precision: Math.round(precision * 100) / 100,
      recall: Math.min(1, Math.round(recall * 100) / 100),
      processingTimeMs,
    };
  }
}

export const enhancedRAGService = new EnhancedRAGService();

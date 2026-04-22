/**
 * Context Builder
 * بناء السياق للوكلاء
 */

import { definedProps } from "@/utils/defined-props";

import type { BuiltContext, ContextQuery, ContextResult } from "../types";
import { contextAssemblyService } from "../context/context-assembly.service";
import { weaviateRetrievalService } from "./weaviate-retrieval.service";

export class ContextBuilder {
  async buildContext(query: ContextQuery): Promise<BuiltContext> {
    const hits = await weaviateRetrievalService.retrieveForContext(query);
    return contextAssemblyService.buildContext(query, hits);
  }

  /**
   * Quick search for a specific query
   */
  async quickSearch(
    query: string,
    collection?: string,
    topK: number = 5
  ): Promise<ContextResult[]> {
    const hits = await weaviateRetrievalService.quickSearch(query, collection, topK);
    return hits.map((hit) => ({
      content: hit.text,
      source: hit.source,
      type: hit.type,
      collection: hit.collection,
      relevance: hit.relevanceScore,
      rank: hit.rank,
      lastModified: hit.lastModified ? new Date(hit.lastModified) : new Date(0),
      metadata: hit.metadata ?? {},
      ...definedProps({
        id: hit.id,
        documentHash: hit.documentHash,
      }),
    }));
  }
}

export const contextBuilder = new ContextBuilder();

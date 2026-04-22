import type { RetrievalHit } from "@the-copy/core-memory";

import { definedProps } from "@/utils/defined-props";

import type {
  BuiltContext,
  ContextProfile,
  ContextQuery,
  ContextResult,
} from "../types";

interface ProfileConfig {
  heading: string;
  maxChunks: number;
  maxTokens: number;
  typeWeights: Record<string, number>;
}

const PROFILE_CONFIGS: Record<ContextProfile, ProfileConfig> = {
  analysis: {
    heading: "سياق تحليلي ذو صلة",
    maxChunks: 6,
    maxTokens: 8000,
    typeWeights: {
      code: 1,
      documentation: 0.95,
      decision: 1.1,
      architecture: 0.9,
      "ad-hoc": 1.15,
    },
  },
  completion: {
    heading: "سياق مساعد للإكمال",
    maxChunks: 4,
    maxTokens: 5000,
    typeWeights: {
      code: 1,
      documentation: 0.9,
      decision: 0.9,
      architecture: 0.8,
      "ad-hoc": 1.1,
    },
  },
  summarization: {
    heading: "سياق مساعد للتلخيص",
    maxChunks: 8,
    maxTokens: 7000,
    typeWeights: {
      code: 0.8,
      documentation: 1,
      decision: 1,
      architecture: 0.9,
      "ad-hoc": 1.1,
    },
  },
  code: {
    heading: "سياق برمجي ذو صلة",
    maxChunks: 8,
    maxTokens: 7000,
    typeWeights: {
      code: 1.2,
      documentation: 0.9,
      decision: 0.85,
      architecture: 0.95,
      "ad-hoc": 1,
    },
  },
};

export class ContextAssemblyService {
  buildContext(query: ContextQuery, hits: RetrievalHit[]): BuiltContext {
    const profile = query.profile ?? "analysis";
    const selectedHits = this.selectHits(hits, profile, query.topK);
    const contextResults = selectedHits.map((hit) => this.toContextResult(hit));
    const relevantFiles = [
      ...new Set(
        contextResults
          .map((result) => result.source)
          .filter((value) => value && value !== "AdHocChunks")
      ),
    ];
    const relevantDecisions = contextResults
      .filter((result) => result.type === "decision")
      .map((result) => {
        const decisionId = result.metadata["decisionId"];
        return typeof decisionId === "string" ? decisionId : undefined;
      })
      .filter((value): value is string => Boolean(value));

    return {
      query: query.query,
      profile,
      results: contextResults,
      summary: this.generateSummary(contextResults, query.query, profile),
      relevantFiles,
      relevantDecisions,
      tokenEstimate: this.estimateTokens(contextResults),
    };
  }

  selectHits(
    hits: RetrievalHit[],
    profile: ContextProfile = "analysis",
    requestedTopK?: number
  ): RetrievalHit[] {
    const profileConfig = PROFILE_CONFIGS[profile];
    const maxChunks = Math.min(
      requestedTopK ?? profileConfig.maxChunks,
      profileConfig.maxChunks
    );

    const rankedHits = hits
      .map((hit) => {
        const typeWeight = profileConfig.typeWeights[hit.type] ?? 1;
        return {
          ...hit,
          relevanceScore: hit.relevanceScore * typeWeight,
        };
      })
      .sort((left, right) => right.relevanceScore - left.relevanceScore);

    let tokenBudget = 0;
    const selected: RetrievalHit[] = [];

    for (const hit of rankedHits) {
      if (selected.length >= maxChunks) {
        break;
      }

      const hitTokens = this.estimateTokensFromText(hit.text);
      if (tokenBudget + hitTokens > profileConfig.maxTokens) {
        continue;
      }

      selected.push({
        ...hit,
        rank: selected.length + 1,
      });
      tokenBudget += hitTokens;
    }

    return selected;
  }

  buildAugmentedPrompt(
    basePrompt: string,
    hits: Array<Partial<RetrievalHit> & { text: string }>,
    profile: ContextProfile = "analysis"
  ): string {
    if (hits.length === 0) {
      return basePrompt;
    }

    const normalizedHits = hits.map<RetrievalHit>((hit, index) => ({
      text: hit.text,
      source: hit.source ?? hit.collection ?? "AdHocChunks",
      type: hit.type ?? "ad-hoc",
      collection: hit.collection ?? "AdHocChunks",
      chunkIndex: hit.chunkIndex ?? index,
      metadata: hit.metadata ?? {},
      relevanceScore: hit.relevanceScore ?? 0,
      rank: hit.rank ?? index + 1,
      ...definedProps({
        id: hit.id,
        documentHash: hit.documentHash,
        startIndex: hit.startIndex,
        endIndex: hit.endIndex,
        coherenceScore: hit.coherenceScore,
        sentences: hit.sentences,
        lastModified: hit.lastModified,
        certainty: hit.certainty,
      }),
    }));

    const selectedHits = this.selectHits(normalizedHits, profile);
    if (selectedHits.length === 0) {
      return basePrompt;
    }

    const heading = PROFILE_CONFIGS[profile].heading;
    const contextSection = selectedHits
      .map((hit, index) => {
        const relevance = (hit.relevanceScore * 100).toFixed(0);
        return `[سياق ${index + 1} - ملاءمة: ${relevance}%]\n${hit.text}`;
      })
      .join("\n\n");

    return `${basePrompt}\n\n=== ${heading} ===\n${contextSection}\n\n=== نهاية السياق ===\n`;
  }

  private toContextResult(hit: RetrievalHit): ContextResult {
    return {
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
    };
  }

  private estimateTokens(results: ContextResult[]): number {
    return results.reduce(
      (sum, result) => sum + this.estimateTokensFromText(result.content),
      0
    );
  }

  private estimateTokensFromText(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private generateSummary(
    results: ContextResult[],
    query: string,
    profile: ContextProfile
  ): string {
    const fileCount = new Set(results.map((result) => result.source)).size;
    const typeBreakdown = results.reduce<Record<string, number>>(
      (accumulator, result) => {
        accumulator[result.type] = (accumulator[result.type] || 0) + 1;
        return accumulator;
      },
      {}
    );

    const breakdown = Object.entries(typeBreakdown)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");

    return `Found ${results.length} relevant chunks from ${fileCount} sources for query "${query}" using profile "${profile}". Breakdown: ${breakdown}.`;
  }
}

export const contextAssemblyService = new ContextAssemblyService();

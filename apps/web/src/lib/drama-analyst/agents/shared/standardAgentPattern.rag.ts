/**
 * RAG (Retrieval-Augmented Generation) utilities for Standard Agent Pattern
 */

import type { RAGContext } from "./standardAgentPattern.types";

export function performRAG(input: string, context?: string): RAGContext {
  if (!context || context.length < 100) {
    return { chunks: [], relevanceScores: [] };
  }

  const chunkSize = 500;
  const overlap = 50;
  const chunks: string[] = [];

  let start = 0;
  while (start < context.length) {
    const end = Math.min(start + chunkSize, context.length);
    chunks.push(context.substring(start, end));
    if (end >= context.length) break;
    start = end - overlap;
  }

  const inputKeywords = input
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const relevanceScores = chunks.map((chunk) => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    inputKeywords.forEach((keyword) => {
      if (chunkLower.includes(keyword)) score++;
    });
    return score / Math.max(inputKeywords.length, 1);
  });

  const indexed = chunks.map((chunk, i) => ({
    chunk,
    score: relevanceScores[i],
  }));
  indexed.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    chunks: indexed.slice(0, 3).map((x) => x.chunk),
    relevanceScores: indexed.slice(0, 3).map((x) => x.score ?? 0),
  };
}

export function buildPromptWithRAG(
  basePrompt: string,
  ragContext: RAGContext
): string {
  if (ragContext.chunks.length === 0) return basePrompt;

  const contextSection = ragContext.chunks
    .map((chunk, i) => `[سياق ${i + 1}]:\n${chunk}`)
    .join("\n\n");

  return `${basePrompt}\n\n=== سياق إضافي من النص ===\n${contextSection}\n\n=== نهاية السياق ===\n`;
}

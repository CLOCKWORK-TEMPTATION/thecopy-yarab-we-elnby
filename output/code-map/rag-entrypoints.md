# RAG Entrypoints

## Commands

- `pnpm --filter @the-copy/web editor:rag:ask`
- `pnpm --filter @the-copy/web editor:rag:index`
- `pnpm --filter @the-copy/web editor:rag:smoke`
- `pnpm --filter @the-copy/web editor:rag:stats`
- `pnpm workspace:embed`

## Entrypoints

- `apps/backend/src/memory/api/routes.ts`
- `apps/backend/src/memory/index.ts`
- `apps/backend/src/services/rag/enhancedRAG.service.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-index.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-query.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-stats.ts`
- `apps/web/src/lib/ai/rag/index.ts`
- `apps/web/src/lib/drama-analyst/services/ragService.ts`
- `scripts/generate-workspace-embeddings.js`

## Critical Files

- `.embedding-hash-cache.json`
- `.repo-agent/RAG-OPERATING-CONTRACT.md`
- `apps/backend/src/memory/api/routes.ts`
- `apps/backend/src/memory/context/context-assembly.service.ts`
- `apps/backend/src/memory/embeddings/generator.ts`
- `apps/backend/src/memory/embeddings/mrl-optimizer.ts`
- `apps/backend/src/memory/index.ts`
- `apps/backend/src/memory/indexer/git-watcher.ts`
- `apps/backend/src/memory/indexer/repository-crawler.ts`
- `apps/backend/src/memory/indexer/weaviate-indexing.service.ts`
- `apps/backend/src/memory/retrieval/context-builder.ts`
- `apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts`
- `apps/backend/src/memory/types.ts`
- `apps/backend/src/memory/vector-store/client.ts`
- `apps/backend/src/memory/vector-store/schema.ts`
- `apps/backend/src/services/rag/embeddings.service.ts`
- `apps/backend/src/services/rag/enhancedRAG.service.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-index.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-query.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-stats.ts`
- `apps/web/src/app/(main)/editor/src/rag/chunker.ts`
- `apps/web/src/app/(main)/editor/src/rag/config.ts`
- `apps/web/src/app/(main)/editor/src/rag/embeddings.ts`
- `apps/web/src/app/(main)/editor/src/rag/indexer.ts`
- `apps/web/src/app/(main)/editor/src/rag/query.ts`
- `apps/web/src/app/(main)/editor/src/rag/rag-system.md`
- `apps/web/src/app/(main)/editor/src/rag/README.md`
- `apps/web/src/app/(main)/editor/src/rag/types.ts`
- `apps/web/src/lib/ai/rag/context-retriever.ts`
- `apps/web/src/lib/ai/rag/index.ts`
- `apps/web/src/lib/ai/rag/text-chunking.ts`
- `apps/web/src/lib/ai/stations/gemini-service.ts`
- `apps/web/src/lib/ai/text-chunking.ts`
- `apps/web/src/lib/drama-analyst/services/ragService.ts`
- `packages/core-memory/src/chunking/semanticChunker.ts`
- `packages/core-memory/src/types.ts`
- `scripts/generate-workspace-embeddings.js`
- `WORKSPACE-EMBEDDING-INDEX.json`
- `WORKSPACE-EMBEDDING-SUMMARY.md`

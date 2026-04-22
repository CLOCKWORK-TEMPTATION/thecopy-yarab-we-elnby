# RAG Systems

هذا الملف مولد داخل نظام الخرائط المرجعي الحالي، وليس مرجعًا أعلى مستقلًا.

## الحالة العامة

- governance status: `governed`
- total systems: `5`

## الأنظمة المكتشفة

### Workspace Code Embeddings

- id: `workspace-embeddings`
- category: `code-retrieval`
- policy: `govern-only`
- status: `governed`
- root: `scripts`
- description: Workspace-level semantic retrieval and embedding index generation.
- commands:
  - `pnpm workspace:embed`
- entrypoints:
  - `scripts/generate-workspace-embeddings.js`
- inputs:
  - `apps/*`
  - `package.json`
  - `packages/*`
  - `pnpm-workspace.yaml`
  - `scripts/generate-workspace-embeddings.js`
- artifacts:
  - `.embedding-hash-cache.json`
  - `WORKSPACE-EMBEDDING-INDEX.json`
  - `WORKSPACE-EMBEDDING-SUMMARY.md`
- dependencies:
  - `Google Gemini embeddings`
  - `pnpm workspace:embed`
- embeddings providers:
  - `gemini`
- vector stores:
  - `workspace-embedding-index`
- rerankers:
  - none
- governance notes:
  - none

### Backend Memory Retrieval

- id: `backend-memory`
- category: `vector-memory`
- policy: `unify-now`
- status: `governed`
- root: `apps/backend/src/memory`
- description: Unified repository indexing, Weaviate retrieval, and profile-based context assembly.
- commands:
  - none
- entrypoints:
  - `apps/backend/src/memory/api/routes.ts`
  - `apps/backend/src/memory/index.ts`
- inputs:
  - `apps/backend/src/memory/api/routes.ts`
  - `apps/backend/src/memory/index.ts`
  - `apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts`
  - `packages/core-memory/src/chunking/semanticChunker.ts`
- artifacts:
  - `Weaviate:AdHocChunks`
  - `Weaviate:Architecture`
  - `Weaviate:CodeChunks`
  - `Weaviate:Decisions`
  - `Weaviate:Documentation`
- dependencies:
  - `@the-copy/core-memory`
  - `Google Gemini embeddings`
  - `Weaviate`
- embeddings providers:
  - `gemini`
- vector stores:
  - `weaviate`
- rerankers:
  - `selectHits`
- governance notes:
  - none

### Backend Enhanced RAG

- id: `backend-enhanced-rag`
- category: `drama-retrieval`
- policy: `unify-now`
- status: `governed`
- root: `apps/backend/src/services/rag`
- description: Coordinator facade over shared chunking, Weaviate retrieval, and unified context assembly.
- commands:
  - none
- entrypoints:
  - `apps/backend/src/services/rag/enhancedRAG.service.ts`
- inputs:
  - `apps/backend/src/memory/context/context-assembly.service.ts`
  - `apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts`
  - `apps/backend/src/services/rag/embeddings.service.ts`
  - `apps/backend/src/services/rag/enhancedRAG.service.ts`
- artifacts:
  - `ContextAssemblyService output`
  - `Weaviate:AdHocChunks`
- dependencies:
  - `ContextAssemblyService`
  - `Google Gemini embeddings`
  - `Weaviate`
- embeddings providers:
  - `gemini`
- vector stores:
  - `weaviate`
- rerankers:
  - `selectHits`
- governance notes:
  - none

### Editor Code RAG

- id: `editor-code-rag`
- category: `code-retrieval`
- policy: `temporary-independent`
- status: `governed`
- root: `apps/web/src/app/(main)/editor`
- description: Editor-local code retrieval using Qdrant for vectors, OpenRouter embeddings, and Gemini answers.
- commands:
  - `pnpm --filter @the-copy/web editor:rag:index`
  - `pnpm --filter @the-copy/web editor:rag:ask`
  - `pnpm --filter @the-copy/web editor:rag:stats`
  - `pnpm --filter @the-copy/web editor:rag:smoke`
- entrypoints:
  - `apps/web/src/app/(main)/editor/scripts/rag-index.ts`
  - `apps/web/src/app/(main)/editor/scripts/rag-query.ts`
  - `apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts`
  - `apps/web/src/app/(main)/editor/scripts/rag-stats.ts`
- inputs:
  - `apps/web/package.json`
  - `apps/web/src/app/(main)/editor/scripts/rag-index.ts`
  - `apps/web/src/app/(main)/editor/src/rag/config.ts`
  - `apps/web/src/app/(main)/editor/src/rag/query.ts`
- artifacts:
  - `Qdrant:codebase-index`
- dependencies:
  - `GEMINI_API_KEY`
  - `OPENROUTER_API_KEY`
  - `QDRANT_API_KEY`
  - `QDRANT_URL`
- embeddings providers:
  - `gemini`
  - `openrouter`
- vector stores:
  - `qdrant`
- rerankers:
  - none
- governance notes:
  - none

### Web Legacy RAG Utilities

- id: `web-legacy-rag`
- category: `lightweight-search`
- policy: `do-not-force-merge`
- status: `governed`
- root: `apps/web/src/lib`
- description: Legacy in-web chunking and retrieval helpers retained under governance without forced architectural merge.
- commands:
  - none
- entrypoints:
  - `apps/web/src/lib/ai/rag/index.ts`
  - `apps/web/src/lib/drama-analyst/services/ragService.ts`
- inputs:
  - `apps/web/src/lib/ai/rag/context-retriever.ts`
  - `apps/web/src/lib/ai/rag/text-chunking.ts`
  - `apps/web/src/lib/drama-analyst/services/ragService.ts`
- artifacts:
  - `In-memory context maps`
  - `In-memory retrieved chunks`
- dependencies:
  - `Frontend in-memory chunking`
  - `GeminiService`
- embeddings providers:
  - `gemini`
- vector stores:
  - none
- rerankers:
  - none
- governance notes:
  - none

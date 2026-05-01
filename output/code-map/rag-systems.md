# RAG Systems

هذا الملف مولد داخل نظام الخرائط المرجعي الحالي، وليس مرجعًا أعلى مستقلًا.

## الحالة العامة

- governance status: `governed`
- total systems: `6`

## الأنظمة المكتشفة

### Workspace Code Embeddings

- id: `workspace-embeddings`
- category: `code-retrieval`
- policy: `govern-only`
- status: `governed`
- root: `scripts`
- description: Live agent code memory with LanceDB local storage and optional Qdrant sync.
- commands:
  - `pnpm workspace:embed`
  - `pnpm agent:memory:index`
  - `pnpm agent:memory:search`
  - `pnpm agent:memory:status`
  - `pnpm agent:memory:verify`
  - `pnpm agent:memory:watch`
  - `pnpm agent:guard:step`
- entrypoints:
  - `scripts/agent/code-memory-index.ts`
  - `scripts/agent/code-memory-search.ts`
  - `scripts/agent/code-memory-status.ts`
  - `scripts/agent/code-memory-verify.ts`
  - `scripts/agent/code-memory-watch.ts`
  - `scripts/agent/guard.ts`
  - `scripts/generate-workspace-embeddings.js`
- inputs:
  - `apps/*`
  - `package.json`
  - `packages/*`
  - `pnpm-workspace.yaml`
  - `scripts/agent/lib/code-memory/*`
  - `scripts/generate-workspace-embeddings.js`
- artifacts:
  - `.agent-code-memory/`
  - `.embedding-hash-cache.json`
  - `WORKSPACE-EMBEDDING-INDEX.json`
  - `WORKSPACE-EMBEDDING-SUMMARY.md`
- dependencies:
  - `Google Gemini embeddings`
  - `LanceDB`
  - `pnpm workspace:embed`
  - `Qdrant`
- embeddings providers:
  - `gemini`
- vector stores:
  - `lancedb`
  - `qdrant`
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

### Persistent Agent Memory

- id: `persistent-agent-memory`
- category: `hybrid-knowledge`
- policy: `unify-now`
- status: `governed`
- root: `scripts/agent/lib/persistent-memory`
- description: Durable governed agent-thread memory with PostgreSQL source of truth, Redis/BullMQ job handoff, vector index adapters, safe retrieval, and guarded context injection.
- commands:
  - `pnpm agent:persistent-memory:secrets:scan`
  - `pnpm agent:persistent-memory:secrets:verify`
  - `pnpm agent:persistent-memory:ingest`
  - `pnpm agent:persistent-memory:retrieve`
  - `pnpm agent:persistent-memory:workers`
  - `pnpm agent:persistent-memory:status`
  - `pnpm agent:persistent-memory:eval`
  - `pnpm agent:persistent-memory:eval:golden`
  - `pnpm agent:persistent-memory:eval:safety`
- entrypoints:
  - `scripts/agent/lib/persistent-memory/index.ts`
  - `scripts/agent/persistent-memory-eval.ts`
  - `scripts/agent/persistent-memory-ingest.ts`
  - `scripts/agent/persistent-memory-retrieve.ts`
  - `scripts/agent/persistent-memory-secrets.ts`
  - `scripts/agent/persistent-memory-status.ts`
  - `scripts/agent/persistent-memory-workers.ts`
- inputs:
  - `AGENTS.md`
  - `apps/backend/src/db/persistent-agent-memory.schema.ts`
  - `output/round-notes.md`
  - `output/session-state.md`
  - `scripts/agent/lib/persistent-memory/*`
- artifacts:
  - `PostgreSQL:persistent_agent_memory`
  - `Qdrant:persistent-agent-memory-shadow`
  - `Redis:bullmq-persistent-memory-jobs`
  - `Weaviate:persistent-agent-memory-primary`
- dependencies:
  - `BullMQ`
  - `local deterministic embeddings`
  - `PostgreSQL`
  - `Qdrant`
  - `Redis`
  - `Weaviate`
- embeddings providers:
  - none
- vector stores:
  - `qdrant`
  - `weaviate`
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
  - `apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts`
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

# السياق المولد الحالي للوكلاء

## بيانات الجلسة

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | 2026-05-01T15:55:59.593Z |
| الفرع الحالي | `codex/persistent-agent-memory-production` |
| آخر commit | `ac16f86cedb02bf10e0adc5f9eeec0148c1a0166` |
| حالة الشجرة | نظيفة |
| مستوى drift | `no-drift` |

## المرجع الحاكم

- المصدر الوحيد للحالة الحالية:

`output/session-state.md`

- العقد الأعلى:

`AGENTS.md`

- عقد RAG التشغيلي:

`.repo-agent/RAG-OPERATING-CONTRACT.md`

- سياق الذاكرة الدائمة:

`.repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md`

## أوامر التشغيل الرسمية الحالية

```text
pnpm dev
pnpm start
pnpm run doctor
pnpm verify:runtime
pnpm agent:bootstrap
pnpm agent:verify
pnpm agent:guard:start
pnpm agent:guard:step
pnpm agent:guard:verify
pnpm agent:refresh-maps
pnpm agent:start
pnpm agent:memory:index
pnpm agent:memory:search
pnpm agent:memory:status
pnpm agent:memory:verify
pnpm agent:memory:watch
pnpm agent:persistent-memory:secrets:scan
pnpm agent:persistent-memory:secrets:verify
pnpm agent:persistent-memory:secrets:purge
pnpm agent:persistent-memory:init
pnpm agent:persistent-memory:migrate
pnpm agent:persistent-memory:index
pnpm agent:persistent-memory:watch
pnpm agent:persistent-memory:search
pnpm agent:persistent-memory:ingest
pnpm agent:persistent-memory:retrieve
pnpm agent:persistent-memory:workers
pnpm agent:persistent-memory:status
pnpm agent:persistent-memory:eval
pnpm agent:persistent-memory:eval:golden
pnpm agent:persistent-memory:eval:safety
pnpm workspace:embed
pnpm infra:up
pnpm infra:down
pnpm infra:status
pnpm infra:logs
pnpm infra:reset
```

## المنافذ الرسمية الحالية

```text
frontend: 5000
backend: 3001
```

## التطبيقات والحزم الأساسية

- `@the-copy/backend` — `apps/backend`
- `@the-copy/web` — `apps/web`

- `@the-copy/breakapp` — `packages/breakapp`
- `@the-copy/copyproj-schema` — `packages/copyproj-schema`
- `@the-copy/core-memory` — `packages/core-memory`
- `@the-copy/prompt-engineering` — `packages/prompt-engineering`
- `@the-copy/tsconfig` — `packages/tsconfig`

## نقاط الدخول الأهم

- `.repo-agent/HANDOFF-PROTOCOL.md`
- `.repo-agent/RAG-OPERATING-CONTRACT.md`
- `.repo-agent/STARTUP-PROTOCOL.md`
- `.repo-agent/TOOL-GUARD-CONTRACT.json`
- `AGENTS.md`
- `apps/backend/package.json`
- `apps/backend/src/memory/api/routes.ts`
- `apps/backend/src/memory/index.ts`
- `apps/backend/src/services/rag/enhancedRAG.service.ts`
- `apps/web/package.json`
- `apps/web/src/app/(main)/editor/scripts/rag-index.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-query.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts`
- `apps/web/src/app/(main)/editor/scripts/rag-stats.ts`
- `apps/web/src/lib/ai/rag/index.ts`
- `apps/web/src/lib/drama-analyst/services/ragService.ts`
- `scripts/agent/bootstrap.ts`
- `scripts/agent/code-memory-index.ts`
- `scripts/agent/code-memory-search.ts`
- `scripts/agent/code-memory-status.ts`
- `scripts/agent/code-memory-verify.ts`
- `scripts/agent/code-memory-watch.ts`
- `scripts/agent/guard.ts`
- `scripts/agent/lib/persistent-memory/index.ts`
- `scripts/agent/persistent-memory-eval.ts`
- `scripts/agent/persistent-memory-index.ts`
- `scripts/agent/persistent-memory-ingest.ts`
- `scripts/agent/persistent-memory-init.ts`
- `scripts/agent/persistent-memory-migrate.ts`
- `scripts/agent/persistent-memory-retrieve.ts`
- `scripts/agent/persistent-memory-search.ts`
- `scripts/agent/persistent-memory-secrets.ts`
- `scripts/agent/persistent-memory-status.ts`
- `scripts/agent/persistent-memory-watch.ts`
- `scripts/agent/persistent-memory-workers.ts`
- `scripts/agent/refresh-maps.ts`
- `scripts/agent/start-agent.ps1`
- `scripts/agent/verify-state.ts`
- `scripts/doctor.ps1`
- `scripts/generate-workspace-embeddings.js`

## طبقة المعرفة والاسترجاع

- الحالة الحاكمة:

`governed`

- عدد الأنظمة المكتشفة:

`6`

- الأنواع:

- `code-retrieval`
- `drama-retrieval`
- `hybrid-knowledge`
- `lightweight-search`
- `vector-memory`

- مزودو embeddings:

- `gemini`
- `openrouter`

- vector stores:

- `lancedb`
- `qdrant`
- `weaviate`
- `workspace-embedding-index`

- rerankers:

- `selectHits`

- الأنظمة:

- `Workspace Code Embeddings`
  - id: `workspace-embeddings`
  - النوع: `code-retrieval`
  - السياسة: `govern-only`
  - الحالة: `governed`
  - المزودات: `gemini`
  - المخازن المتجهية: `lancedb`، `qdrant`، `workspace-embedding-index`
  - المدخلات: `apps/*`، `package.json`، `packages/*`، `pnpm-workspace.yaml`، `scripts/agent/lib/code-memory/*`، `scripts/generate-workspace-embeddings.js`
  - المخرجات أو artifacts: `.agent-code-memory/`، `.embedding-hash-cache.json`، `WORKSPACE-EMBEDDING-INDEX.json`، `WORKSPACE-EMBEDDING-SUMMARY.md`
  - الاعتماديات: `Google Gemini embeddings`، `LanceDB`، `pnpm workspace:embed`، `Qdrant`
- `Backend Memory Retrieval`
  - id: `backend-memory`
  - النوع: `vector-memory`
  - السياسة: `unify-now`
  - الحالة: `governed`
  - المزودات: `gemini`
  - المخازن المتجهية: `weaviate`
  - المدخلات: `apps/backend/src/memory/api/routes.ts`، `apps/backend/src/memory/index.ts`، `apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts`، `packages/core-memory/src/chunking/semanticChunker.ts`
  - المخرجات أو artifacts: `Weaviate:AdHocChunks`، `Weaviate:Architecture`، `Weaviate:CodeChunks`، `Weaviate:Decisions`، `Weaviate:Documentation`
  - الاعتماديات: `@the-copy/core-memory`، `Google Gemini embeddings`، `Weaviate`
- `Backend Enhanced RAG`
  - id: `backend-enhanced-rag`
  - النوع: `drama-retrieval`
  - السياسة: `unify-now`
  - الحالة: `governed`
  - المزودات: `gemini`
  - المخازن المتجهية: `weaviate`
  - المدخلات: `apps/backend/src/memory/context/context-assembly.service.ts`، `apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts`، `apps/backend/src/services/rag/embeddings.service.ts`، `apps/backend/src/services/rag/enhancedRAG.service.ts`
  - المخرجات أو artifacts: `ContextAssemblyService output`، `Weaviate:AdHocChunks`
  - الاعتماديات: `ContextAssemblyService`، `Google Gemini embeddings`، `Weaviate`
- `Editor Code RAG`
  - id: `editor-code-rag`
  - النوع: `code-retrieval`
  - السياسة: `temporary-independent`
  - الحالة: `governed`
  - المزودات: `gemini`، `openrouter`
  - المخازن المتجهية: `qdrant`
  - المدخلات: `apps/web/package.json`، `apps/web/src/app/(main)/editor/scripts/rag-index.ts`، `apps/web/src/app/(main)/editor/src/rag/config.ts`، `apps/web/src/app/(main)/editor/src/rag/query.ts`
  - المخرجات أو artifacts: `Qdrant:codebase-index`
  - الاعتماديات: `GEMINI_API_KEY`، `OPENROUTER_API_KEY`، `QDRANT_API_KEY`، `QDRANT_URL`
- `Persistent Agent Memory`
  - id: `persistent-agent-memory`
  - النوع: `hybrid-knowledge`
  - السياسة: `unify-now`
  - الحالة: `governed`
  - المزودات: لا يوجد
  - المخازن المتجهية: `qdrant`، `weaviate`
  - المدخلات: `AGENTS.md`، `apps/backend/src/db/persistent-agent-memory.schema.ts`، `output/round-notes.md`، `output/session-state.md`، `scripts/agent/lib/persistent-memory/*`
  - المخرجات أو artifacts: `PostgreSQL:persistent_agent_memory`، `Qdrant:persistent-agent-memory-shadow`، `Redis:bullmq-persistent-memory-jobs`، `Weaviate:persistent-agent-memory-primary`
  - الاعتماديات: `BAAI/bge-m3`، `BullMQ`، `local deterministic embeddings`، `PostgreSQL`، `Qdrant`، `Redis`، `Weaviate`
- `Web Legacy RAG Utilities`
  - id: `web-legacy-rag`
  - النوع: `lightweight-search`
  - السياسة: `do-not-force-merge`
  - الحالة: `governed`
  - المزودات: `gemini`
  - المخازن المتجهية: لا يوجد
  - المدخلات: `apps/web/src/lib/ai/rag/context-retriever.ts`، `apps/web/src/lib/ai/rag/text-chunking.ts`، `apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts`، `apps/web/src/lib/drama-analyst/services/ragService.ts`
  - المخرجات أو artifacts: `In-memory context maps`، `In-memory retrieved chunks`
  - الاعتماديات: `Frontend in-memory chunking`، `GeminiService`

- إشارات التشتت:

- لا توجد إشارات تشتت موثقة.

- تحذيرات الكشف:

- لا توجد تحذيرات كشف مفتوحة.

- ملفات معرفة غير محكومة:

- لا توجد ملفات غير محكومة مكتشفة.


## ذاكرة الكود الحية

- الحالة:

`current`

- التخزين المحلي:

`lancedb`

- مزامنة Qdrant:

`not-configured`

- الملفات:

`2694`

- القطع:

`5766`

- القطع ذات التضمين:

`5766`

- التغطية:

`100.0%`

- الرسالة:

Code memory is current.


## حالة الملفات المرجعية

- session-state:

`up-to-date`

- round-notes:

`up-to-date`

- code-map:

`up-to-date`

- mind-map:

`up-to-date`

## ثوابت واجهة حرجة

- تموضع الكروت السبعة في هيرو الصفحة الرئيسية ثابت ومرجعي عبر كل المقاسات.
- ممنوع إدخال breakpoint-based repositioning أو resize-driven layout updates لهذا التكوين إلا بطلب صريح جديد.
- الملفان الحاكمان لهذا القيد هما `apps/web/src/lib/hero-config.ts` و `apps/web/src/hooks/use-hero-animation.ts`.

## مرايا IDE المطلوبة

- `.github/copilot-instructions.md` — up-to-date

## أهم الأعطال المفتوحة

- لا توجد أعطال مفتوحة مرصودة في الفحص الحالي.

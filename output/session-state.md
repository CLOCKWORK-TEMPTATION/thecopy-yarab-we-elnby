# الحالة التشغيلية الحالية

## تعريف الملف

`output/session-state.md` هو المصدر الوحيد للحالة التشغيلية الحالية للمشروع.

## بيانات التحكم

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | 2026-05-02T18:13:40.068Z |
| الفرع الحالي | `codex/persistent-memory-production-ci-fix` |
| آخر commit | `2c822d7407644c6be161ed2ef796e87880b2d99e` |
| حالة working tree | غير نظيفة — 14 ملف متغير |
| مستوى drift | `no-drift` |

## الحقيقة التشغيلية الحالية

### مدير الحزم الرسمي

```text
pnpm@10.32.1
```

### مساحة العمل الرسمية

```text
apps/*
packages/*
```

### أوامر التشغيل الرسمية

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

### المنافذ الرسمية الحالية

```text
frontend: 5000
backend: 3001
```

### التطبيقات الأساسية

- `@the-copy/backend` — `apps/backend`
- `@the-copy/web` — `apps/web`

### الحزم الأساسية

- `@the-copy/breakapp` — `packages/breakapp`
- `@the-copy/copyproj-schema` — `packages/copyproj-schema`
- `@the-copy/core-memory` — `packages/core-memory`
- `@the-copy/prompt-engineering` — `packages/prompt-engineering`
- `@the-copy/tsconfig` — `packages/tsconfig`

## حالة طبقة الوكلاء

- العقد الأعلى المختصر:

```text
AGENTS.md
```

- العقد التشغيلي الكامل:

```text
.repo-agent/OPERATING-CONTRACT.md
```

- عقد طبقة المعرفة والاسترجاع:

```text
.repo-agent/RAG-OPERATING-CONTRACT.md
```

- الملف المولد للسياق:

```text
.repo-agent/AGENT-CONTEXT.generated.md
```

- سياق الذاكرة الدائمة المولد:

```text
.repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md
```

## حالة المرجع الحي

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

`2697`

- القطع:

`5776`

- القطع ذات التضمين:

`5776`

- التغطية:

`100.0%`

- الرسالة:

Code memory is current.


## مرايا IDE المطلوبة حاليًا

- `.github/copilot-instructions.md` — المسار موجود فعليًا، الأداة ظاهرة في مسار العمل الحالي

## ما تغيّر منذ آخر بصمة

- لا يوجد drift مؤثر

## الأعطال المفتوحة الآن

- لا توجد أعطال مفتوحة مرصودة في الفحص الحالي.

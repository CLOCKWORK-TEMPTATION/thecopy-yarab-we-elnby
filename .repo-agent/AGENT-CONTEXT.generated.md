# السياق المولد الحالي للوكلاء

## بيانات الجلسة

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | 2026-04-23T08:45:35.824Z |
| الفرع الحالي | `chore/strict-baseline` |
| آخر commit | `42c407e26d9dbd415a30c50401880d0abec99929` |
| حالة الشجرة | نظيفة |
| مستوى drift | `hard-drift` |

## المرجع الحاكم

- المصدر الوحيد للحالة الحالية:

`output/session-state.md`

- العقد الأعلى:

`AGENTS.md`

- عقد RAG التشغيلي:

`.repo-agent/RAG-OPERATING-CONTRACT.md`

## أوامر التشغيل الرسمية الحالية

```text
pnpm dev
pnpm start
pnpm doctor
pnpm verify:runtime
pnpm agent:bootstrap
pnpm agent:verify
pnpm agent:refresh-maps
pnpm agent:start
pnpm workspace:embed
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
- `@the-copy/core-memory` — `packages/core-memory`
- `@the-copy/prompt-engineering` — `packages/prompt-engineering`
- `@the-copy/tsconfig` — `packages/tsconfig`

## نقاط الدخول الأهم

- `.repo-agent/HANDOFF-PROTOCOL.md`
- `.repo-agent/RAG-OPERATING-CONTRACT.md`
- `.repo-agent/STARTUP-PROTOCOL.md`
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
- `scripts/agent/refresh-maps.ts`
- `scripts/agent/start-agent.ps1`
- `scripts/agent/verify-state.ts`
- `scripts/doctor.ps1`
- `scripts/generate-workspace-embeddings.js`

## طبقة المعرفة والاسترجاع

- الحالة الحاكمة:

`governed`

- عدد الأنظمة المكتشفة:

`5`

- الأنواع:

- `code-retrieval`
- `drama-retrieval`
- `lightweight-search`
- `vector-memory`

- مزودو embeddings:

- `gemini`
- `openrouter`

- vector stores:

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
  - المخازن المتجهية: `workspace-embedding-index`
  - المدخلات: `apps/*`، `package.json`، `packages/*`، `pnpm-workspace.yaml`، `scripts/generate-workspace-embeddings.js`
  - المخرجات أو artifacts: `.embedding-hash-cache.json`، `WORKSPACE-EMBEDDING-INDEX.json`، `WORKSPACE-EMBEDDING-SUMMARY.md`
  - الاعتماديات: `Google Gemini embeddings`، `pnpm workspace:embed`
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
- `Web Legacy RAG Utilities`
  - id: `web-legacy-rag`
  - النوع: `lightweight-search`
  - السياسة: `do-not-force-merge`
  - الحالة: `governed`
  - المزودات: `gemini`
  - المخازن المتجهية: لا يوجد
  - المدخلات: `apps/web/src/lib/ai/rag/context-retriever.ts`، `apps/web/src/lib/ai/rag/text-chunking.ts`، `apps/web/src/lib/drama-analyst/services/ragService.ts`
  - المخرجات أو artifacts: `In-memory context maps`، `In-memory retrieved chunks`
  - الاعتماديات: `Frontend in-memory chunking`، `GeminiService`

- إشارات التشتت:

- لا توجد إشارات تشتت موثقة.

- تحذيرات الكشف:

- لا توجد تحذيرات كشف مفتوحة.

- ملفات معرفة غير محكومة:

- لا توجد ملفات غير محكومة مكتشفة.


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

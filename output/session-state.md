# الحالة التشغيلية الحالية

## تعريف الملف

`output/session-state.md` هو المصدر الوحيد للحالة التشغيلية الحالية للمشروع.

## بيانات التحكم

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | 2026-04-26T15:02:47.742Z |
| الفرع الحالي | `codex/validate-fix-20260426` |
| آخر commit | `233aaccf62b2c7a2a186e9da882ca01917a9ccd7` |
| حالة working tree | نظيفة |
| مستوى drift | `hard-drift` |

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
pnpm workspace:embed
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

`ungoverned`

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

- مرشح معرفة غير ممثل في الجرد المرجعي: apps/web/scripts/run-vitest-chunks.mjs (path signal: chunk)

- ملفات معرفة غير محكومة:

- `apps/web/scripts/run-vitest-chunks.mjs`


## ذاكرة الكود الحية

- الحالة:

`current`

- التخزين المحلي:

`lancedb`

- مزامنة Qdrant:

`not-configured`

- الملفات:

`1993`

- القطع:

`5276`

- القطع ذات التضمين:

`5276`

- التغطية:

`100.0%`

- الرسالة:

Code memory is current.


## مرايا IDE المطلوبة حاليًا

- `.github/copilot-instructions.md` — المسار موجود فعليًا، الأداة ظاهرة في مسار العمل الحالي

## ما تغيّر منذ آخر بصمة

- تغيرت الملفات البنيوية الحرجة

## الأعطال المفتوحة الآن

- لا توجد listeners محلية على `5433` و `6379` و `8080` وقت الفحص

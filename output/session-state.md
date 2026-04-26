# الحالة التشغيلية الحالية

## تعريف الملف

`output/session-state.md` هو المصدر الوحيد للحالة التشغيلية الحالية للمشروع.

## بيانات التحكم

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | 2026-04-25T23:46:45.511Z |
| الفرع الحالي | `main` |
| آخر commit | `3d4e7f767b411b5a266559f044a90cffa5970a98` |
| حالة working tree | نظيفة |
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
pnpm doctor
pnpm verify:runtime
pnpm agent:bootstrap
pnpm agent:verify
pnpm agent:refresh-maps
pnpm agent:start
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


## مرايا IDE المطلوبة حاليًا

- `.github/copilot-instructions.md` — المسار موجود فعليًا، الأداة ظاهرة في مسار العمل الحالي

## ما تغيّر منذ آخر بصمة

- لا يوجد drift مؤثر

## الأعطال المفتوحة الآن

- لا توجد listeners محلية على `5433` و `6379` و `8080` وقت الفحص (D-001).
- 5 أخطاء type-check على web موروثة من main (لم تنتجها جولة 097):
  - `apps/web/src/lib/ai/stations/orchestrator.ts:308-312` — TS2322 × 5 (Station{1..5}Output لا يطابق JsonRecord — Index signature ناقص).
  - `apps/web/src/lib/ai/stations/station2-conceptual-analysis.ts:731,741,751` — TS2322 × 3 (exactOptionalPropertyTypes: artist/director/author).
  - `apps/web/src/lib/drama-analyst/services/backendService.ts:94` — TS2322 (unknown → AIResponse).
  - `apps/web/src/workers/particle-generator.worker.ts:20` و `particle-physics.worker.ts:43` — TS6196 × 2 (types غير مستخدمة).
- web lint: 64 errors + 7881 warnings (A-004/A-005) — مُرحَّل P2/P3.
- ~21 ملف اختبار actorai-arabic لم يُشغَّل بعد إصلاح `test-utils.tsx` (A-006 sweep).
- ~6 ملفات اختبار متفرقة فيها فشل واحد أو اثنين (A-013) — مُرحَّل P2.
- لم يُتحقَّق lint backend بعد runner التقسيم end-to-end لضغط الذاكرة (A-002 verify-only).
- ديون عضوية مُرحَّلة: 18 TODO، 330 console.* في إنتاج، 246 `: any`، 6 `@ts-ignore`، 10 ملفات >1000 سطر، 11 ignored build scripts.

## مرجع جولة التنظيف الأخيرة

- الفرع: `round-097-debt-cleanup` (17 commit بعد merge، يستهدف main، لا دمج تلقائي).
- آخر commit على الفرع: `8dbbf4a` (merge من origin/main، تعارضان حُلَّا بترجيح 097 — `ScriptUploadZone.test.tsx` + `animations.test.ts`).
- ‏`triage-round-097.md` و `PULL_REQUEST.md` ملحقان بالفرع.
- إغلاقات الجولة 097: P0=100% (5/5)، P1=83% (5/6)، P2=20% (1/5).
- استكمال الجولة 116 (حل تعارضات الدمج): اختبارا الحل passed 10/10، الباك اند type-check نظيف EXIT=0.

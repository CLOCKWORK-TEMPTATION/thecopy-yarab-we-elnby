# الحالة التشغيلية الحالية

## تعريف الملف

`output/session-state.md` هو المصدر الوحيد للحالة التشغيلية الحالية للمشروع.

## بيانات التحكم

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | 2026-04-26T05:30:00+02:00 |
| الفرع الحالي | `str-098-foundation-completion` |
| آخر commit | `c25fc9f09b6f16afebc447a024b8f541f67014e3` (قبل commit STR-098) |
| حالة working tree | 7 ملفات جديدة في انتظار commit STR-098 (انظر "ملفات معلَّقة"). 2340 ملف "modified" في view الـ Linux container ضوضاء `CRLF↔LF` فقط — `git diff -w` يُثبت أن كل المحتوى الفعلي ثابت. على Windows native git: tree نظيف. |
| مستوى drift | `STR-098 in-progress — pending commit` |
| الجولة الاستراتيجية النشطة | `STR-098 — Foundation Completion Round` |

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

`1976`

- القطع:

`5198`

- القطع ذات التضمين:

`5198`

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

## ملفات STR-098 معلَّقة (في انتظار commit على Windows)

ملفات مُنشأة ومُختبرة محلياً، لكن تعذَّر `git add` من حاوية Linux بسبب `core.fsmonitor` extension في الـ index:

- `tech-debt-baseline.json` — خط أساس مُجمَّد (8 static_metrics + runtime_metrics nulls + budget + targets)
- `scripts/audit-tech-debt.sh` — حارس ratchet (مُختبَر، EXIT=0 على baseline حالي)
- `scripts/audit-migration-budget.sh` — حارس ميزانية ترحيل (مُختبَر، EXIT=0)
- `scripts/update-baseline.py` — مُحدِّث baseline بـ Python (يتخطى node_modules)
- `.github/workflows/quality-gate.yml` — workflow بثلاث jobs (tech-debt-ratchet، migration-budget، baseline-integrity)
- `.husky/commit-msg` — يفرض نمط `<type>(<scope>): STR-NNN[.M] — <وصف>` (مُختبَر accept + reject)
- `docs/strategic-plan-098-104.md` — العقد الاستراتيجي الكامل (13 قسماً)

## STR-098 — حالة الإنجاز

- ✅ بُني محلياً وتم اختباره
- ⏳ Pending: `git add` + `git commit` + `git push` (على Windows native git)
- ⏳ Pending: تحديث `output/round-notes.md` بسجل STR-098
- ⏳ Pending: فتح PR للمراجعة البشرية

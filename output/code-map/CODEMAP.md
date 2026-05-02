# Code Map

## نظرة تنفيذية

هذا المرجع مولد من الحقيقة الحالية للمستودع، لا من README.

- مدير الحزم الرسمي:

```text
pnpm@10.32.1
```

- مساحة العمل:

```text
apps/*
packages/*
```

- الأوامر الرسمية الحالية:

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

## التطبيقات الأساسية

- `@the-copy/backend` — `apps/backend`
- `@the-copy/web` — `apps/web`

## الحزم الأساسية

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

## طبقة الوكلاء

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

- المصدر الوحيد للحالة:

```text
output/session-state.md
```

## طبقة المعرفة والاسترجاع

- عدد الأنظمة المكتشفة:

`6`

- الحالة الحاكمة:

`governed`

- الأنواع:

- `code-retrieval`
- `drama-retrieval`
- `hybrid-knowledge`
- `lightweight-search`
- `vector-memory`

## ذاكرة الكود الحية

- الحالة: `current`
- الملفات: `2695`
- القطع: `5768`
- التغطية: `100.0%`

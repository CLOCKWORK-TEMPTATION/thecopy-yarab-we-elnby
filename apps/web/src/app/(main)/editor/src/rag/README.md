# توثيق محلي لمسار استرجاع كود المحرر

هذا الملف توثيق تنفيذي محلي وليس مصدر حقيقة تشغيلية.

الحقيقة المرجعية لطبقة المعرفة موجودة فقط في:

```text
AGENTS.md
output/session-state.md
.repo-agent/RAG-OPERATING-CONTRACT.md
```

## الغرض

هذا المسار يخدم المحرر فقط عبر فهرسة كود الحزمة المحلية ثم البحث فيه والإجابة عن أسئلة تقنية مرتبطة بالكود المفهرس.

## السياسة الحالية

- المعرف المرجعي:
  `editor-code-rag`
- التصنيف:
  `code-retrieval`
- السياسة:
  `temporary-independent`

يبقى هذا المسار مستقلًا تقنيًا مؤقتًا عن مسار الخلفية الرسمي، لكنه يخضع لنفس الجرد والبصمة والحالة والخرائط والتحقق النهائي.

## المكونات الفعلية

- التخزين المتجهي:
  `Qdrant`
- مجموعة التخزين:
  `codebase-index`
- توليد embeddings:
  `OpenRouter`
  عبر النموذج
  `qwen/qwen3-embedding-8b`
- توليد الإجابات:
  `GoogleGenAI`

## نقاط الدخول المحلية

```text
scripts/rag-index.ts
scripts/rag-query.ts
scripts/rag-stats.ts
scripts/rag-smoke-test.ts
src/rag/config.ts
src/rag/chunker.ts
src/rag/embeddings.ts
src/rag/indexer.ts
src/rag/query.ts
```

## أوامر التنفيذ المحلية

```text
pnpm --filter @the-copy/web editor:rag:index
pnpm --filter @the-copy/web editor:rag:ask "<question>"
pnpm --filter @the-copy/web editor:rag:stats
pnpm --filter @the-copy/web editor:rag:smoke
```

## الاعتماديات التشغيلية

```text
QDRANT_URL
QDRANT_API_KEY
OPENROUTER_API_KEY
GEMINI_API_KEY
```

## المدخلات والمخرجات

- المدخلات الأساسية:
  شجرة الكود المحلية داخل المحرر
- المخرج التشغيلي الأساسي:
  بيانات مفهرسة داخل
  `Qdrant`
  تحت المجموعة
  `codebase-index`

## قيود حاكمة

- لا يعتمد هذا الملف لتحديد readiness العامة للمستودع
- لا يعتمد هذا الملف لتحديد مزودات طبقة المعرفة عالميًا
- أي تغيير معماري هنا يجب أن ينعكس عبر
  `bootstrap`
  و
  `verify`
  والخرائط المرجعية

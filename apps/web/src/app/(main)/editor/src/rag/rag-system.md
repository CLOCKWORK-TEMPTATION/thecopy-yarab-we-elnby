# البنية التنفيذية لمسار editor-code-rag

هذا الملف توثيق تنفيذي محلي وليس مصدر حقيقة تشغيلية.

الحقيقة المرجعية لطبقة المعرفة موجودة فقط في:

```text
AGENTS.md
output/session-state.md
.repo-agent/RAG-OPERATING-CONTRACT.md
```

## التصنيف المرجعي

- المعرّف:
  `editor-code-rag`
- النوع:
  `code-retrieval`
- السياسة:
  `temporary-independent`

## التدفق الفعلي

1. `rag-index.ts`
   يجمع الملفات المحلية المطلوب فهرستها.
2. `chunker.ts`
   يقسم الملفات إلى مقاطع قابلة للفهرسة.
3. `embeddings.ts`
   يولد embeddings عبر
   `OpenRouter`.
4. `indexer.ts`
   يرفع المقاطع إلى
   `Qdrant`
   داخل
   `codebase-index`.
5. `rag-query.ts`
   ينفذ البحث في
   `Qdrant`
   ويجمع السياق.
6. `query.ts`
   يولد الإجابة النهائية عبر
   `GoogleGenAI`.

## الملفات المحورية

```text
src/rag/config.ts
src/rag/chunker.ts
src/rag/embeddings.ts
src/rag/indexer.ts
src/rag/query.ts
scripts/rag-index.ts
scripts/rag-query.ts
scripts/rag-stats.ts
scripts/rag-smoke-test.ts
```

## الاعتماديات التشغيلية

- التخزين المتجهي:
  `Qdrant`
- مزود embeddings:
  `OpenRouter`
- مزود الإجابات:
  `GoogleGenAI`

## ما لا يقرره هذا الملف

- لا يقرر هذا الملف حالة طبقة المعرفة العامة للمستودع
- لا يقرر هذا الملف البصمة المرجعية
- لا يقرر هذا الملف readiness النهائية
- المرجع الوحيد لهذه الأحكام يوجد في:

```text
output/session-state.md
.repo-agent/state-fingerprint.json
output/code-map/rag-systems.md
output/mind-map/rag-topology.mmd
```

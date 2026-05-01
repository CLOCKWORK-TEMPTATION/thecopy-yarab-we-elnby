---
name: rag-systems-unifier
description: ينفّذ سياسات الحوكمة المعلّقة على أنظمة RAG الخمسة في المستودع (workspace-embeddings, backend-memory, backend-enhanced-rag, editor-code-rag, web-legacy-rag)، يدمج النظامين المحملين بسياسة unify-now، ويمنع إنشاء طبقة retrieval سادسة دون تحديث RAG-OPERATING-CONTRACT أولاً. فعّل عند تعديل أي نظام retrieval أو embeddings أو vector store، أو عند رؤية كلمات "RAG", "retrieval", "embeddings", "Weaviate", "Qdrant", "LanceDB", "Gemini embeddings", "context assembly", "vector search", "نظام استرجاع", "دمج طبقات RAG"، أو عند فتح PR على apps/backend/src/memory أو apps/backend/src/services/rag أو apps/web/src/lib/ai/rag. لا تفعّل لإنشاء RAG من الصفر لمشروع مختلف، ولا لتشخيص جودة استرجاع.
---

# RAG Systems Unifier

## الأدلة المؤسِّسة من سجل المستودع

من output/session-state.md:

```text
governance status: governed
total systems: 5

System: workspace-embeddings
  type: code-retrieval
  policy: govern-only
  vector stores: lancedb, qdrant, workspace-embedding-index

System: backend-memory
  type: vector-memory
  policy: unify-now
  vector stores: weaviate
  inputs: apps/backend/src/memory/...

System: backend-enhanced-rag
  type: drama-retrieval
  policy: unify-now
  vector stores: weaviate
  inputs: apps/backend/src/services/rag/...

System: editor-code-rag
  type: code-retrieval
  policy: temporary-independent
  vector stores: qdrant
  inputs: apps/web/src/app/(main)/editor/scripts/rag-index.ts

System: web-legacy-rag
  type: lightweight-search
  policy: do-not-force-merge
  vector stores: -
  inputs: apps/web/src/lib/ai/rag/...
```

النمط:

نظامان يحملان قرار unify-now منذ مدة دون تنفيذ. خمسة أنظمة retrieval متوازية، مزودا embeddings مختلفان (Gemini و OpenRouter)، وأربعة vector stores (LanceDB و Qdrant و Weaviate و workspace-embedding-index).

## القاعدة الأعلى

من:

```text
.repo-agent/RAG-OPERATING-CONTRACT.md
```

و:

```text
AGENTS.md
```

أي طبقة معرفة أو استرجاع أو embeddings أو indexing أو context assembly تخضع لنفس العقد الأعلى. لا توجد حقيقة مستقلة لطبقة RAG خارج الحقيقة التشغيلية العامة للمستودع.

## السلوك المرفوض

إنشاء نظام retrieval سادس دون تحديث:

```text
.repo-agent/RAG-OPERATING-CONTRACT.md
```

أولاً. تأخير تنفيذ unify-now على backend-memory و backend-enhanced-rag إلى ما لا نهاية. تكرار chunking في طبقات متعددة. ربط نظام جديد بـ vector store جديد بدون تبرير حوكمي. خلط Gemini و OpenRouter embeddings في نفس النظام بدون abstraction.

## السلوك المقبول

تنفيذ خطة الدمج المُعلَنة:

```text
backend-memory + backend-enhanced-rag → نظام موحّد على Weaviate
```

عبر استخراج adapter مشترك من:

```text
apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts
apps/backend/src/services/rag/enhancedRAG.service.ts
apps/backend/src/memory/context/context-assembly.service.ts
```

و توحيد:

```text
apps/backend/src/services/rag/embeddings.service.ts
```

كنقطة embeddings وحيدة في backend.

## فحوصات إلزامية

### G1 — لا نظام retrieval غير محكوم

```text
ripgrep -nP "WeaviateClient|QdrantClient|LanceDB|new Pinecone|new Chroma" \
  apps packages
```

كل ظهور يجب أن يطابق نظاماً مذكوراً في session-state.md. أي ظهور غير مذكور: نظام شبح يُفتَح له entry فوراً في الحوكمة قبل المتابعة.

### G2 — Gemini و OpenRouter لا يختلطان داخل نفس النظام

```text
ripgrep -nP "GEMINI_API_KEY|OPENROUTER_API_KEY" \
  apps/backend/src/memory apps/backend/src/services/rag
```

أي ملف يستورد المفتاحين معاً: مؤشر على تشتت يستوجب abstraction.

### G3 — chunking موحّد عبر backend

```text
ripgrep -nP "semanticChunker|recursiveSplitter|tokenSplitter|splitDocuments" \
  apps/backend/src
```

كل chunker يجب أن يكون استدعاءً لـ:

```text
@the-copy/core-memory/chunking/semanticChunker
```

أو موثَّق صراحة كاستثناء.

### G4 — تحديث RAG-OPERATING-CONTRACT قبل أي نظام جديد

```text
git diff --name-only origin/main...HEAD | ripgrep "RAG-OPERATING-CONTRACT"
```

إذا أُضيف نظام retrieval جديد بدون تعديل هذا الملف: تُرفض الجولة.

### G5 — قرار unify-now يُنفَّذ خلال نافذة محددة

تتبع الزمن منذ ظهور القرار في session-state. إذا تجاوز نافذة معتمَدة (مثلاً 14 يوماً): يُرفع escalation في output/round-notes.md.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### RAG Systems Unification — جولة <رقم>
```

يحتوي:

حالة كل نظام من الخمسة، تقدّم تنفيذ unify-now، الـ vector stores المستخدمة فعلياً، خطة الدمج للنظامين المحملين بـ unify-now، تأكيد عدم إنشاء نظام سادس.

## معيار الإغلاق

backend-memory و backend-enhanced-rag إما اندمجا أو وُثّق سبب التأخير في:

```text
.repo-agent/RAG-OPERATING-CONTRACT.md
```

لا نظام retrieval شبح، chunking موحّد، embeddings عبر nقطة وحيدة في backend، تشغيل فعلي لـ:

```text
pnpm workspace:embed
pnpm agent:memory:verify
```

نجح.

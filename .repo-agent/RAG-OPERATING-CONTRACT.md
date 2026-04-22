# العقد التشغيلي لطبقة المعرفة والاسترجاع

هذا الملف عقد يدوي تابع للنظام المرجعي الأعلى، وليس مرجعًا أعلى مستقلًا.

المرجع الأعلى يبقى:

```text
AGENTS.md
.repo-agent/OPERATING-CONTRACT.md
```

## الهدف

ضبط كل طبقة معرفة أو استرجاع أو indexing أو embeddings أو context assembly داخل المستودع تحت نفس الحوكمة المرجعية الحالية للوكلاء.

## ما الذي يُعد نظام RAG هنا

يُعد نظام RAG أو شبه-RAG أي طبقة تقوم بواحد أو أكثر من التالي:

- semantic retrieval
- vector retrieval
- code retrieval
- drama retrieval
- prompt context assembly
- chunking
- embedding generation
- indexing
- reranking
- knowledge-base lookup

## الأنواع التشغيلية

### استرجاع النصوص الدرامية

طبقة تسترجع أو تعزز نصوصًا درامية أو تحليلية تخص المحتوى النصي.

### استرجاع الكود

طبقة تسترجع ملفات الكود أو المعرفة البرمجية أو سياق المستودع.

### بناء السياق

طبقة تجمع نتائج الاسترجاع وتحوّلها إلى prompt context أو agent context.

### استرجاع خفيف

طبقة تعتمد scoring أو search بسيط أو indexing محدود دون محرك RAG كامل.

## ما الذي يعد drift

يعد drift إذا تحقق واحد أو أكثر من التالي:

- ظهور نظام معرفة أو استرجاع غير ممثل في الجرد المرجعي
- تغير entrypoints أو critical files أو providers دون تحديث bootstrap
- ظهور طبقة embeddings أو vector store أو reranking خارج fingerprint
- وجود تشتت غير موثق بين أكثر من نظام retrieval
- وجود سكربت indexing أو embeddings أو search يعمل خارج طبقة المنطق المشتركة

## متى يُسمح بالتعدد

يسمح بتعدد الأنظمة إذا كانت حالات الاستخدام مختلفة جوهريًا، مثل:

- استرجاع كود
- استرجاع نصوص درامية
- بناء سياق تحليلي داخلي

## متى يصبح التعدد drift

يصبح التعدد drift إذا:

- أدى إلى مصادر حقيقة متنافسة
- ظهر نظام جديد غير ممثل في facts أو session-state أو fingerprint
- قدم ملفات إرشاد أو وثائق محلية بوصفها حقيقة تشغيلية مستقلة

## ما الذي يجب أن يتوحد فورًا

- الحوكمة
- الحالة
- البصمة
- الخرائط
- التحقق النهائي
- الإحالة من ملفات IDE

## ما الذي لا يجوز توحيده قسرًا الآن

- محرك استرجاع الكود مع محرك استرجاع النصوص فقط لأن كليهما يسمى RAG
- أي نقل معماري واسع قبل اكتمال الجرد والحالة والبصمة والتحقق

## مصفوفة السياسات الحالية

- `workspace-embeddings`:
  `govern-only`
- `backend-memory`:
  `unify-now`
- `backend-enhanced-rag`:
  `unify-now`
- `editor-code-rag`:
  `temporary-independent`
- `web-legacy-rag`:
  `do-not-force-merge`

## القرار الحالي الخاص بنظام المحرر

- نظام المحرر القائم على `Qdrant` يبقى مستقلًا تقنيًا مؤقتًا
- لا يُدمج الآن قسرًا مع المسار الخلفي الرسمي القائم على `Weaviate`
- يبقى خاضعًا لنفس الجرد المرجعي والحالة والبصمة والخرائط والتحقق النهائي

## الوثائق المحلية المسموح بها

- يسمح فقط بوثائق تنفيذية محلية غير مرجعية
- أي وثيقة محلية تخص طبقة المعرفة يجب أن تصرح نصًا بأنها ليست مصدر حقيقة تشغيلية
- يجب أن تحيل صراحة إلى:

```text
AGENTS.md
output/session-state.md
.repo-agent/RAG-OPERATING-CONTRACT.md
```

- أي وثيقة محلية تعرض مزودات أو مخازن أو أوامر أو readiness بوصفها حقيقة تشغيلية مستقلة تعد drift
- غياب الترويسة المرجعية الإلزامية عن وثيقة معرفة محلية يجعل `verify` يفشل

## قياس الجاهزية

تقاس readiness لطبقة RAG عبر:

- ظهور الأنظمة في bootstrap facts
- ظهورها في session-state
- ظهورها في code-map و mind-map
- دخولها في state fingerprint
- قدرة verify على معاقبة drift الخاص بها

## مقاييس التقييم

عند تقييم أي تطور لاحق لطبقة RAG، تُسجل هذه الأبعاد داخل النظام المرجعي بدل وثائق منفصلة:

- faithfulness
- latency
- coverage
- freshness

## قواعد التنفيذ

- لا يوجد ملف حالة مستقل لـ RAG خارج `output/session-state.md`
- لا توجد بصمة مستقلة لـ RAG خارج `.repo-agent/state-fingerprint.json`
- لا يجوز لملفات IDE حمل حقيقة محلية عن providers أو vector stores أو readiness
- أي تطوير تقني جديد لطبقة RAG يجب أن يمر عبر bootstrap و verify و maps و fingerprint

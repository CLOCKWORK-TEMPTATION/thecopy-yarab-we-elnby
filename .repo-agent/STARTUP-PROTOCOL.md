# بروتوكول البداية

## قاعدة البداية

قبل أي تحليل أو تعديل أو تنفيذ فعلي:

```text
pnpm agent:bootstrap
```

## التسلسل الإلزامي

1. شغّل:

```text
pnpm agent:bootstrap
```

2. اقرأ brief البداية الناتج.
3. اقرأ:

```text
output/session-state.md
```

4. اقرأ فقط الأجزاء اللازمة من:

```text
output/code-map/*
output/mind-map/*
```

5. بعد ذلك فقط ابدأ المهمة الفعلية.

إذا كانت المهمة تمس طبقة المعرفة والاسترجاع أو embeddings أو indexing أو context assembly:

6. اقرأ ما يلزم من:

```text
.repo-agent/RAG-OPERATING-CONTRACT.md
output/code-map/rag-systems.md
output/code-map/rag-entrypoints.md
output/mind-map/rag-topology.mmd
```

## إذا فشل bootstrap

لا تبدأ المهمة.

يجب أولًا إغلاق سبب الفشل أو توثيقه ثم إعادة التشغيل.

## إذا كشف bootstrap drift

- إذا كان drift قابلًا للتسوية الآلية فدع bootstrap يكمله.
- إذا بقي drift بعده فلا يبدأ العمل قبل تسويته أو توثيقه صراحة.

## إذا غيّرت المهمة حقيقة تشغيلية أو بنيوية

قبل التسليم:

- حدّث:

```text
output/session-state.md
```

- حدّث:

```text
output/round-notes.md
```

- وأعد توليد الخرائط إذا صار drift البنيوي قائمًا.

وينطبق ذلك أيضًا على أي تغير في:

- أنظمة RAG
- مزودي embeddings
- vector stores
- reranking
- query routing
- context assembly

## مسار IDE عند غياب hooks الأصلية

إذا كانت الأداة لا تنفذ الأوامر تلقائيًا:

1. اقرأ:

```text
AGENTS.md
```

2. اقرأ:

```text
output/session-state.md
```

3. اقرأ فقط ما يلزم من الخرائط.
4. أخرج brief قصيرًا من 3 إلى 7 حقائق تشغيلية.
5. ثم فقط ابدأ التنفيذ.

هذا التسلسل هو بداية الجلسة الرسمية في مسار IDE.

ولا تُستثنى طبقة المعرفة والاسترجاع من هذا التسلسل.
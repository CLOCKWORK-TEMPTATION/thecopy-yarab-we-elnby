# خطة ذاكرة دائمة محلية ومنخفضة التكلفة لكل خيوط الوكلاء

## الملخص

سيتم بناء ذاكرة دائمة عامة لكل خيوط الوكلاء داخل المستودع.

النظام محلي افتراضيًا، منخفض التكلفة، ولا يستخدم خدمات تضمين خارجية في النسخة الأولى.

قاعدة البيانات العلائقية هي مصدر الحقيقة الوحيد.

الفهرس المتجهي يستخدم للاسترجاع فقط.

الطابور يستخدم للتنسيق المؤقت فقط.

## القرارات المعتمدة

مصدر الحقيقة الوحيد:

```text
PostgreSQL
```

فهرس الاسترجاع فقط:

```text
Qdrant
```

الطوابير والتنسيق المؤقت:

```text
Redis
BullMQ
```

نموذج التضمين الأساسي:

```text
BAAI/bge-m3
```

نموذج إعادة الترتيب المشروط:

```text
bge-reranker-v2-m3
```

بحث الذاكرة:

```text
BM25
dense vectors
sparse vectors
multi-vector
RRF
conditional reranking
MMR lambda 0.7
```

## التخزين النهائي

```text
PostgreSQL
```

- مصدر الحقيقة الوحيد.
- يخزن كل بيانات الذاكرة الدائمة.
- يخزن الجلسات والجولات والقرارات والذكريات ولقطات الحالة وفروق الحالة.
- يخزن إصدارات الحقائق والمراجع وسجلات التدقيق والحجر وسجلات المهام.
- لا توجد طبقة ذاكرة دائمة أخرى.

الجداول الملزمة:

```text
sessions
rounds
decisions
memories
state_snapshots
state_deltas
fact_versions
references
audit_log
consolidation_log
injection_quarantine
raw_events
memory_candidates
retrieval_events
injection_events
model_versions
job_runs
dead_letter_jobs
secret_scan_events
```

```text
Qdrant
```

- فهرس استرجاع فقط.
- لا يخزن الحقيقة الأصلية.
- يخزن المتجهات والبيانات اللازمة للبحث فقط.
- يستخدم المتجهات المسماة.
- يستخدم المتجهات الكثيفة.
- يستخدم المتجهات المتفرقة.
- يستخدم المتجهات المتعددة للقرارات والقيود الوقائية والذكريات عالية الأهمية فقط.
- يستخدم ترشيح البيانات الوصفية.
- يستخدم اللقطات.
- يستخدم أسماء مجموعات قابلة للتحويل ذريًا.

```text
collection_v1
collection_v2
atomic alias switch
```

```text
Redis
```

- يستخدم مع الطوابير فقط.
- يستخدم لإعادة المحاولة والأقفال والتخزين المؤقت قصير العمر.
- لا يخزن ذكريات دائمة.
- لا يعتبر مصدر حقيقة.

## خط أنابيب الإدخال

مصادر الإدخال:

```text
round logs
state files
decisions
round notes
manual file changes
imported git changes
agent outputs
```

مراحل الإدخال الملزمة:

```text
source event detection
raw_events insert in PostgreSQL
secret scanning
memory candidate extraction
prompt-injection risk classification
canonicalization
deduplication
fact and version conflict check
embedding job enqueue in BullMQ
embedding with BAAI/bge-m3
upsert to Qdrant
audit_log write
retrieval-ready mark
```

كل حدث خام يكتب أولًا في قاعدة البيانات العلائقية.

لا يدخل أي نص مرحلة التخزين الدلالي أو التضمين قبل فحص الأسرار.

أي فشل في فحص الأسرار يوقف إدخال الحدث ويحفظ سجلًا في جدول الفحص.

## حقن السياق

يتم اختيار ملف الميزانية تلقائيًا حسب نية الاستعلام.

إذا لم تثبت نية الاستعلام بثقة، يستخدم النظام الملف الافتراضي.

الملف الافتراضي:

```text
memory_budget_max = 25%
decisions = 35%
prevention_constraints = 20%
facts = 18%
recent_rounds = 15%
state_snapshots = 7%
state_deltas = 5%
```

ملف تغيير الكود أو التنفيذ:

```text
memory_budget_max = 22%
decisions = 35%
prevention_constraints = 25%
facts = 15%
recent_rounds = 10%
state_snapshots = 5%
state_deltas = 10%
```

ملف الاستكمال من الجلسة السابقة:

```text
memory_budget_max = 30%
recent_rounds = 30%
decisions = 30%
state_snapshots = 15%
state_deltas = 10%
prevention_constraints = 10%
facts = 5%
```

ملف البحث عن قرار سابق:

```text
memory_budget_max = 25%
decisions = 55%
recent_rounds = 15%
facts = 10%
prevention_constraints = 10%
state_snapshots = 5%
state_deltas = 5%
```

ملف البحث عن الحالة الحالية:

```text
memory_budget_max = 25%
state_snapshots = 35%
state_deltas = 25%
decisions = 20%
recent_rounds = 10%
prevention_constraints = 5%
facts = 5%
```

ملف مراجعة خطة أو تقييم:

```text
memory_budget_max = 20%
decisions = 30%
facts = 25%
prevention_constraints = 20%
recent_rounds = 10%
state_snapshots = 10%
state_deltas = 5%
```

ملف منع التكرار واتباع القيود:

```text
memory_budget_max = 25%
prevention_constraints = 45%
decisions = 25%
recent_rounds = 10%
facts = 10%
state_snapshots = 5%
state_deltas = 5%
```

قواعد الحقن:

- لا يسمح بتجاوز الحد الأعلى لميزانية الذاكرة.
- لا تحقن ذاكرة ناقصة البيانات الإلزامية.
- لا تحقن ذاكرة عالية الخطر.
- لا تدخل أي ذاكرة مسترجعة إلى مناطق التعليمات العليا.
- يتم الحقن فقط داخل مناطق سياق الذاكرة والأدلة.

الحقول الإلزامية قبل الحقن:

```text
source_ref
trust_level
model_version
created_at
updated_at
```

مناطق الحقن الوحيدة:

```text
memory_context
evidence_context
```

## الترتيب والتكلفة

معادلة الترتيب:

```text
composite_score =
0.45 * rerank_score
+ 0.20 * importance_score
+ 0.15 * recency_decay
+ 0.10 * source_type_weight
+ 0.10 * trust_score
- contradiction_penalty
- injection_risk_penalty
```

قواعد تقليل التكلفة:

- يتم تجميع أحداث التضمين في دفعات.
- لا يعمل معيد الترتيب إذا كانت نتائج الدمج عالية الثقة وغير متعارضة.
- لا تعمل المتجهات المتعددة إلا للذكريات عالية القيمة.
- عامل الدمج يعمل عند بلوغ عتبات محددة.
- لا تنشأ لقطة حالة لكل تعديل صغير.
- تستخدم فروق الحالة للتغييرات الصغيرة.
- لا يتم تضمين الملفات الكبيرة كاملة.
- يتم تقسيم الملفات الكبيرة إلى وحدات ذاكرة ذات معنى.
- لا تفهرس الأسرار أو ملفات البيئة أو السجلات الحساسة.
- سجلات التدقيق تحفظ المراجع والمعرفات والدرجات بدل النصوص الكاملة إلا عند الحاجة.

## المسارات الرئيسية

```text
scripts/agent/lib/persistent-memory
packages/core-memory
scripts/agent/verify-state.ts
scripts/agent/lib/agent-guard.ts
scripts/agent/lib/round-notes.ts
scripts/agent/lib/memory-workers
scripts/agent/lib/memory-watchers
scripts/agent/lib/memory-retrieval
scripts/agent/lib/memory-injection
scripts/agent/lib/memory-safety
output/round-notes.md
```

## اختبارات القبول

- يفشل الاختبار إذا وجدت طبقة ذاكرة دائمة غير قاعدة البيانات العلائقية.
- يفشل الاختبار إذا وجدت طبقة سجل كتابة محلية مستقلة عن قاعدة البيانات.
- يفشل الاختبار إذا اعتمدت خطة الذاكرة على تشغيل حاويات أو ملفات تركيب خدمات.
- يفشل الاختبار إذا عامل الفهرس المتجهي كمصدر حقيقة.
- يفشل الاختبار إذا خزن الطابور ذكريات دائمة.
- يتم اختيار ملف ميزانية السياق حسب نية الاستعلام.
- لا يتجاوز الحقن الحد الأعلى لميزانية الذاكرة.
- لا تحقن ذاكرة بلا مرجع مصدر.
- لا تحقن ذاكرة بلا مستوى ثقة.
- لا تحقن ذاكرة مصنفة عالية الخطر.
- الأسرار لا تخزن ولا تضمن ولا تسترجع.
- يعمل مسار بديل عند توقف معيد الترتيب.
- المتجهات المتعددة تعمل للذكريات عالية القيمة فقط.
- لا تنشأ لقطة حالة لكل تعديل صغير.
- تستخدم فروق الحالة للتحديثات الصغيرة.
- بحث القرار السابق يسترجع القرارات بدقة.
- ملف منع التكرار يعطي أولوية للقيود الوقائية.
- ملف الحالة الحالية يعطي أولوية للقطات والفروق.
- ملف الاستكمال يعطي أولوية للجولات الحديثة والقرارات.
- ملف مراجعة الخطط يعطي أولوية للقرارات والحقائق والقيود.

## معايير القبول الرقمية

```text
decision_recall@5 >= 0.90
fact_recall@5 >= 0.85
state_recall@5 >= 0.80
prevention_constraint_recall@5 >= 0.95
MRR_decisions >= 0.75
p95_retrieval_latency_ms < 200
p95_ingest_latency_ms < 500
secret_leakage = 0
false_high_trust = 0
high_trust_injection_violation = 0
context_budget_overflow_rate < 0.001
stale_fact_injection_rate < 0.005
duplicate_memory_rate < 0.02
```

## الافتراضات الملزمة

- النطاق هو كل خيوط الوكلاء المرتبطة بالمستودع والمتاحة محليًا.
- النسخة الأولى محلية افتراضيًا ومنخفضة التكلفة.
- قاعدة البيانات العلائقية هي مصدر الحقيقة الوحيد.
- الفهرس المتجهي قابل لإعادة البناء بالكامل من مصدر الحقيقة.
- الطابور لا يحمل أي ذاكرة دائمة.
- نموذج التضمين الأساسي محلي.
- نموذج إعادة الترتيب محلي ومشروط.
- لا يتم تعديل الملفات في وضع التخطيط الحالي.

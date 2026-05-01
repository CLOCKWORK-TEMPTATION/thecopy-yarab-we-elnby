# خطة ذاكرة دائمة محلية ومنخفضة التكلفة لكل خيوط الوكلاء

## الملخص

سيتم بناء ذاكرة دائمة عامة لكل خيوط الوكلاء داخل المستودع ضمن نطاق محدد باسم:

```text
persistent-agent-memory
```

النظام محلي افتراضيًا، منخفض التكلفة، ولا يستخدم خدمات تضمين خارجية في النسخة الأولى.

هذه الخطة لا تنفذ قاعدة بيانات أو طابورًا أو مخزنًا متجهيًا الآن.

هي خطة حوكمة وتنفيذ مرحلي للذاكرة الدائمة الجديدة، مع الحفاظ على أنظمة المعرفة القائمة دون تهجير قسري.

## نطاق الذاكرة الدائمة

يشمل نطاق:

```text
persistent-agent-memory
```

العناصر التالية:

```text
sessions
rounds
decisions
memories
state_snapshots
state_deltas
fact_versions
raw_events
memory_candidates
references
retrieval_events
injection_events
audit_log
secret_scan_events
```

لا يشمل هذا النطاق بالضرورة ذاكرة الكود الحية القائمة على:

```text
LanceDB
```

ولا يشمل دمجًا قسريًا لأنظمة الاسترجاع الحالية.

## نطاق مصدر الحقيقة

مصدر الحقيقة الوحيد لنطاق الذاكرة الدائمة الجديدة هو:

```text
PostgreSQL
```

الصياغة الحاكمة:

```text
PostgreSQL هو مصدر الحقيقة الوحيد لنطاق persistent-agent-memory.
```

هذا لا يلغي أنظمة معرفة محكومة قائمة مثل:

```text
workspace-embeddings
workspace-embedding-index
editor-code-rag
backend-memory
backend-enhanced-rag
web-legacy-rag
```

هذه الأنظمة تبقى خاضعة للحوكمة ولا تعامل كمصادر حقيقة للذاكرة الدائمة الجديدة.

الفهارس المتجهية والذاكرة الكودية القائمة ليست مصادر حقيقة لهذا النطاق.

## القرارات المعتمدة

مصدر الحقيقة لنطاق الذاكرة الدائمة:

```text
PostgreSQL
```

الطوابير والتنسيق المؤقت:

```text
Redis
BullMQ
```

واجهة الفهارس المتجهية:

```text
VectorIndexAdapter
```

الفهرس المتجهي في المرحلة الأولى:

```text
Weaviate
```

الفهرس المتجهي الاستراتيجي المرشح للمرحلة الثانية:

```text
Qdrant shadow index
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

## خطة التهجير من الحالة الحالية

لا يتم حذف أو تعطيل:

```text
LanceDB
```

لا يتم حذف أو تعطيل:

```text
workspace-embedding-index
```

لا يتم دمج النظام التالي قسرًا:

```text
editor-code-rag
```

لا يتم إلغاء:

```text
Weaviate
```

قبل تشغيل تهجير ظل وقياس تكافؤ واضح.

أي إضافة إلى:

```text
Qdrant
```

يجب أن تدخل رسميًا في:

```text
docker-compose.infra.yml
output/session-state.md
.repo-agent/state-fingerprint.json
```

كل تغيير في المخازن المتجهية أو المزودات أو معيدي الترتيب يعد:

```text
hard drift
```

ولا يعتمد إلا بعد المرور عبر:

```text
pnpm agent:bootstrap
pnpm agent:verify
```

## مصير المخازن الحالية

يبقى النظام التالي كما هو، تحت الحوكمة فقط، دون تهجير الآن:

```text
LanceDB / workspace-embeddings
```

يبقى artifact مساعدًا، وليس مصدر حقيقة للذاكرة الجديدة:

```text
workspace-embedding-index
```

يبقى النظام التالي في المرحلة الأولى لأنه موجود في البنية المحلية:

```text
Weaviate / backend-memory
```

يبقى النظام التالي ويخضع للتوحيد الحوكمي:

```text
Weaviate / backend-enhanced-rag
```

يبقى النظام التالي مستقلًا مؤقتًا:

```text
Qdrant / editor-code-rag
```

لا يفعل النظام التالي إلا بعد إضافته رسميًا إلى البنية وخطة ظل وتكافؤ:

```text
Qdrant / persistent-agent-memory
```

يبقى النظام التالي دون دمج قسري:

```text
web-legacy-rag
```

## المراحل التنفيذية

### المرحلة الأولى

التنفيذ الأقل انجرافًا:

```text
PostgreSQL source of truth
Redis / BullMQ queue
Weaviate existing infra vector index
LanceDB untouched for code memory
Qdrant editor untouched
```

هذه المرحلة أقل اصطدامًا بالمستودع لأن:

```text
Weaviate
```

موجود بالفعل في البنية المحلية.

### المرحلة الثانية

إذا ظل قرار:

```text
Qdrant
```

مطلوبًا بسبب الخصائص التالية:

```text
named vectors
sparse vectors
multi-vector
collection aliases
payload filtering
```

فيجب إضافته إلى:

```text
docker-compose.infra.yml
```

ثم تشغيله في وضع ظل:

```text
PostgreSQL -> Weaviate primary
PostgreSQL -> Qdrant shadow
```

تقاس المؤشرات التالية قبل أي تحويل:

```text
decision_recall@5
MRR_decisions
latency
duplicate rate
stale fact rate
```

### المرحلة الثالثة

لا يتم التحويل من:

```text
Weaviate
```

إلى:

```text
Qdrant
```

إلا بعد تحقق الشروط التالية:

```text
parity >= required threshold
secret_leakage = 0
high_trust_injection_violation = 0
rollback ready
session-state updated
state-fingerprint updated
```

## التخزين النهائي

يخزن:

```text
PostgreSQL
```

كل بيانات الذاكرة الدائمة داخل نطاق:

```text
persistent-agent-memory
```

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

يستخدم الفهرس المتجهي للاسترجاع فقط.

لا يخزن الحقيقة الأصلية.

يخزن المتجهات والبيانات اللازمة للبحث فقط.

يجب أن يكون قابلًا لإعادة البناء من:

```text
PostgreSQL
```

يستخدم:

```text
Redis
```

مع الطوابير فقط.

يستخدم لإعادة المحاولة والأقفال والتخزين المؤقت قصير العمر.

لا يخزن ذكريات دائمة.

لا يعتبر مصدر حقيقة.

## Docker

Docker هو حامل البنية التحتية المحلي الرسمي للخدمات الخارجية.

Docker ليس مصدر حقيقة للذاكرة.

لا يكون Docker مطلوبًا لتشغيل bootstrap في الوضع الافتراضي.

لا يكون تشغيل خدمات Docker شرطًا افتراضيًا لنجاح:

```text
pnpm agent:bootstrap
pnpm agent:verify
```

تعمل اختبارات البنية التحتية فقط عند:

```text
MEMORY_INFRA_REQUIRED=true
```

أو بعد تشغيل:

```text
pnpm infra:up
```

يفشل الاختبار إذا جعلت الخطة:

```text
bootstrap
agent:verify
```

معتمدين إجباريًا على تشغيل خدمات Docker في الوضع الافتراضي.

تفشل اختبارات البنية التحتية فقط في وضع:

```text
MEMORY_INFRA_REQUIRED=true
```

عند غياب الخدمات المطلوبة.

## تكامل bootstrap والحارس الآلي

يبدأ الأمر التالي دائمًا بالحارس الحالي:

```text
pnpm agent:bootstrap
```

الذاكرة الجديدة لا تكسر:

```text
runAgentGuard("start")
```

غياب خدمات البنية التحتية يؤدي إلى:

```text
degraded mode
```

ولا يؤدي إلى فشل في الوضع الافتراضي.

يفشل التحقق عند غياب الخدمات المطلوبة فقط إذا كان:

```text
MEMORY_INFRA_REQUIRED=true
```

ذاكرة الكود الحية تبقى ملزمة ومانعة إذا كانت:

```text
stale
```

مزامنة:

```text
Qdrant
```

تبقى اختيارية ما لم تعلن رسميًا في:

```text
output/session-state.md
```

كخدمة مطلوبة.

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
vector upsert through VectorIndexAdapter
audit_log write
retrieval-ready mark
```

كل حدث خام يكتب أولًا في قاعدة البيانات العلائقية.

لا يدخل أي نص مرحلة التخزين الدلالي أو التضمين قبل فحص الأسرار.

أي فشل في فحص الأسرار يوقف إدخال الحدث ويحفظ سجلًا في جدول الفحص.

## الأسرار

المحركات المعتمدة:

```text
Gitleaks
Semgrep secrets
custom regex pack
entropy check
```

بما أن المستودع لديه إعداد قائم لـ:

```text
Gitleaks
```

فيجب توسيع:

```text
.gitleaks.toml
```

بدل إنشاء سياسة منفصلة.

الأوامر المطلوبة:

```text
memory:secrets:scan
memory:secrets:purge
memory:secrets:verify
```

يجب أن تعمل هذه الأوامر قبل:

```text
memory candidate extraction
embedding
vector upsert
audit serialization
context injection
```

## حقن السياق

يتم اختيار ملف الميزانية تلقائيًا حسب نية الاستعلام.

لا يستخدم نموذج كبير لتصنيف النية في المرحلة الأولى.

يعتمد النظام على:

```text
rule-based intent classifier
```

ثم يعود إلى الملف الافتراضي عند انخفاض الثقة.

العتبة:

```text
intent_confidence >= 0.75
```

إذا كانت الثقة أقل من العتبة يستخدم:

```text
default profile
```

ملفات النية:

```text
execution_or_code_change
continue_from_last_session
prior_decision_lookup
current_state_lookup
plan_review_or_evaluation
avoid_repetition_or_follow_constraints
```

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

## طبقة الحقن الآمن

تضاف طبقة تنفيذية باسم:

```text
memory-injection-envelope
```

القواعد:

```text
no raw prompt concatenation
no direct injection into system
no direct injection into developer
no memory without source_ref
no memory without trust_level
no memory without model_version
no memory with high injection_probability
```

مناطق الحقن الوحيدة:

```text
memory_context
evidence_context
```

يفشل الاختبار إذا ظهر أي payload للذاكرة داخل:

```text
system
developer
instructions
tool contract
policy zone
```

## الترتيب والتكلفة

كل المدخلات بين:

```text
0
1
```

كل العقوبات بين:

```text
0
1
```

معادلة الترتيب:

```text
raw_score =
  0.45 * rerank_score
+ 0.20 * importance_score
+ 0.15 * recency_decay
+ 0.10 * source_type_weight
+ 0.10 * trust_score
- contradiction_penalty
- injection_risk_penalty

composite_score = clamp(raw_score, 0, 1)
```

لا يعمل معيد الترتيب إذا تحققت كل الشروط التالية:

```text
top_rrf_score >= 0.78
top1_top2_margin >= 0.12
trust_score >= 0.80
contradiction_penalty = 0
injection_probability < 0.15
retrieved_count <= budget_candidate_limit
```

يعمل معيد الترتيب إجباريًا إذا تحقق أي شرط:

```text
prior_decision_lookup
avoid_repetition_or_follow_constraints
contradiction_penalty > 0
top1_top2_margin < 0.12
trust_score < 0.80
```

قواعد تقليل التكلفة:

- يتم تجميع أحداث التضمين في دفعات.
- لا تعمل المتجهات المتعددة إلا للذكريات عالية القيمة.
- عامل الدمج يعمل عند بلوغ عتبات محددة.
- لا تنشأ لقطة حالة لكل تعديل صغير.
- تستخدم فروق الحالة للتغييرات الصغيرة.
- لا يتم تضمين الملفات الكبيرة كاملة.
- يتم تقسيم الملفات الكبيرة إلى وحدات ذاكرة ذات معنى.
- لا تفهرس الأسرار أو ملفات البيئة أو السجلات الحساسة.
- سجلات التدقيق تحفظ المراجع والمعرفات والدرجات بدل النصوص الكاملة إلا عند الحاجة.

## بروتوكول التقييم

الأرقام الرقمية لا تعتمد دون مجموعة تقييم ذهبية.

حجم المجموعة الذهبية:

```text
golden_dataset_n = 120
```

التقسيم:

```text
decisions = 40
prevention_constraints = 25
facts = 25
state_snapshots/state_deltas = 20
adversarial/injection cases = 10
```

كل حالة يجب أن تحتوي:

```text
query
query_intent
expected_profile
expected_memory_ids
forbidden_memory_ids
expected_injection_zone
expected_max_budget
```

أوامر التقييم المطلوبة:

```text
pnpm agent:memory:eval
pnpm agent:memory:eval:golden
pnpm agent:memory:eval:safety
```

تدخل هذه الأوامر في:

```text
pnpm agent:verify
```

بشرط ألا تتطلب البنية في الوضع الافتراضي إلا إذا كان:

```text
MEMORY_INFRA_REQUIRED=true
```

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

- يفشل الاختبار إذا وجدت طبقة ذاكرة دائمة غير قاعدة البيانات العلائقية داخل نطاق الذاكرة الدائمة الجديدة.
- يفشل الاختبار إذا وجدت طبقة سجل كتابة محلية مستقلة عن قاعدة البيانات داخل نطاق الذاكرة الدائمة الجديدة.
- يفشل الاختبار إذا جعلت الخطة bootstrap أو agent:verify معتمدين إجباريًا على تشغيل خدمات Docker في الوضع الافتراضي.
- تعمل اختبارات PostgreSQL وRedis وWeaviate أو Qdrant فقط في وضع MEMORY_INFRA_REQUIRED=true أو بعد تشغيل pnpm infra:up.
- يفشل الاختبار إذا عامل الفهرس المتجهي كمصدر حقيقة.
- يفشل الاختبار إذا خزن الطابور ذكريات دائمة.
- يتم اختيار ملف ميزانية السياق حسب نية الاستعلام وعتبة الثقة.
- لا يتجاوز الحقن الحد الأعلى لميزانية الذاكرة.
- لا تحقن ذاكرة بلا مرجع مصدر.
- لا تحقن ذاكرة بلا مستوى ثقة.
- لا تحقن ذاكرة بلا إصدار نموذج.
- لا تحقن ذاكرة مصنفة عالية الخطر.
- لا يسمح بحقن الذاكرة خارج مناطق الذاكرة والأدلة.
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

## صيغة معمارية نهائية مختصرة

نطاق الذاكرة الدائمة:

```text
sessions
rounds
decisions
memories
state_snapshots
state_deltas
fact_versions
raw_events
memory_candidates
references
retrieval_events
injection_events
audit_log
secret_scan_events
```

مصدر الحقيقة:

```text
PostgreSQL
```

الطابور:

```text
Redis
BullMQ
```

الفهرس المتجهي الحالي في المرحلة الأولى:

```text
Weaviate existing infra
```

أو:

```text
Qdrant
```

فقط إذا أضيف إلى:

```text
docker-compose.infra.yml
```

الفهرس المتجهي الاستراتيجي في المرحلة الثانية:

```text
Qdrant shadow index
```

لا يتم التحويل قبل اختبارات التكافؤ.

ذاكرة الكود القائمة:

```text
LanceDB remains govern-only
no migration now
```

استرجاع المحرر القائم:

```text
Qdrant remains temporary-independent
no forced merge now
```

التمهيد:

```text
must start with existing agent guard
memory infra non-blocking by default
blocking only when MEMORY_INFRA_REQUIRED=true
```

البنية المحلية:

```text
Docker retained
official local infra carrier
not source of truth
```

## القرار النهائي

لا تنفذ هذه الخطة كميزة تشغيلية قبل إدخال المتطلبات التالية في التنفيذ اللاحق:

- إلغاء منع Docker واستبداله بوضع تدهور غير مانع افتراضيًا.
- إضافة خطة تهجير تحسم مصير Weaviate وLanceDB وQdrant وworkspace index.
- تقييد PostgreSQL كمصدر حقيقة لنطاق الذاكرة الجديدة فقط.
- ربط الذاكرة الجديدة بالتمهيد والحارس الآلي وبصمة الحالة.
- تثبيت Gitleaks وSemgrep كطبقة أسرار تنفيذية مع purge رجعي.
- إنشاء مجموعة ذهبية وبروتوكول تقييم داخل agent:verify أو مسار مكافئ.

## الافتراضات الملزمة

- النطاق هو خيوط الوكلاء المرتبطة بالمستودع والمتاحة محليًا داخل نطاق الذاكرة الدائمة الجديدة.
- النسخة الأولى محلية افتراضيًا ومنخفضة التكلفة.
- PostgreSQL هو مصدر الحقيقة الوحيد لنطاق persistent-agent-memory فقط.
- الفهرس المتجهي قابل لإعادة البناء بالكامل من مصدر الحقيقة.
- الطابور لا يحمل أي ذاكرة دائمة.
- نموذج التضمين الأساسي محلي.
- نموذج إعادة الترتيب محلي ومشروط.
- لا يتم حذف أو تعطيل أي نظام معرفة قائم.
- لا يتم إدخال خدمة جديدة في ملف البنية في هذه الجولة.
- لا يتم تعديل ملفات الفحص بطريقة تخفف صرامتها.

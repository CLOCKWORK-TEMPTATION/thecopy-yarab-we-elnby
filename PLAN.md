# خطة الذاكرة الدائمة الحية الجاهزة للإنتاج

## ملخص الحكم

النسخة الأخيرة لم تنحرف عن المطلب الأساسي من ناحية المبدأ.

لكنها أسقطت تفاصيل تنفيذية مهمة من النسختين السابقتين.

لذلك هذه الخطة ليست مجرد نسخة رابعة.

هذه خطة دمج حاسمة بين النسخ الثلاث.

هدفها النهائي واحد:

أن يبدأ أي وكيل من ذاكرة جلسات سابقة، وأن يسترجع قبل كل رد ذاكرة مخصصة حسب السؤال الحالي، بسرعة، وبأمان، ومن غير استرجاع يدوي من المستخدم.

## المصادر

[OpenAI Agents SDK Sessions](https://openai.github.io/openai-agents-python/sessions/)

[LangGraph Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)

[Qdrant Low Latency Search](https://qdrant.tech/documentation/search/low-latency-search/)

[Qdrant Hybrid Queries](https://qdrant.tech/documentation/search/hybrid-queries/)

[Qdrant Indexing](https://qdrant.tech/documentation/manage-data/indexing/)

[BullMQ Retrying Jobs](https://docs.bullmq.io/guide/jobs/retrying-job)

[Turborepo Environment Variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)

[BAAI BGE M3](https://huggingface.co/BAAI/bge-m3)

## نتيجة التحقيق في النسخ الثلاث

النسخة الأولى ركزت على إصلاح خطأ الأداء الأصلي.

أهم ما فيها:

```text
startup memory context
live turn memory context
query conditioned injection
anti false completion gate
session audit
communication discipline
```

النسخة الثانية وسعت المعمارية.

أهم ما فيها:

```text
AgentSessionStore
Qdrant as persistent memory vector index
PostgreSQL source of truth
environment governance
production command surface
session persistence
```

النسخة الثالثة عالجت اعتراض السرعة والكسل.

أهم ما فيها:

```text
fast fallback before response
mandatory repair before close
session close gate
failure causes and remediations
latency budgets
serious research log
```

الحكم:

```text
PLAN.md
```

هو الأقرب للمبدأ النهائي.

لكنه غير كاف وحده لخطة إنتاجية لأنه لا يحتوي كل تفاصيل الجلسة الدائمة، وواجهة الأوامر، وتحوكم البيئة، وسطح الملفات، ومصفوفة التتبع.

هذه الخطة تعتمد:

```text
PLAN.md
```

كأساس.

وتعيد إليه ما سقط من:

```text
PLAN2.md
PLAN3.md
```

## المبدأ النهائي غير القابل للتنازل

لا يكفي وجود ذاكرة قابلة للاسترجاع.

لا يكفي تشغيل بداية الجلسة.

لا يكفي وجود ملف ذاكرة مولد.

لا يكفي وجود أمر بحث يدوي.

المعيار النهائي:

كل دور داخل أي جلسة وكيل يجب أن ينتهي وفيه سجل ذاكرة حي مثبت يحتوي:

```text
turn_context_status
query_hash
selected_intent
retrieval_event_id
audit_event_id
memory_context
```

قبل الرد يتم استخدام أسرع سياق آمن متاح.

عند الإغلاق يتم إصلاح أي نقص بشكل إلزامي.

لا يسمح بإغلاق الجلسة أو إعلان الجاهزية إذا بقي أي دور ناقصًا.

## المعمارية النهائية

النظام يتكون من خمس طبقات.

```text
Agent Session Layer
```

```text
Fast Turn Context Layer
```

```text
Long Term Memory Layer
```

```text
Vector Retrieval Layer
```

```text
Close And Repair Gate
```

المسار قبل الرد:

```text
capture query
hash query
classify intent
read hot session memory
run keyword retrieval
run vector retrieval if ready
fuse results
build memory envelope
write fast audit
answer
enqueue repair if degraded
```

المسار بعد الرد:

```text
persist user input
persist assistant output
extract memory candidates
scan secrets
enqueue embedding
upsert vector index
write audit
mark turn complete
```

المسار عند إغلاق الجلسة:

```text
inspect all turns
detect missing fields
replay missing turn contexts
rebuild envelopes
replay audit failures
repair vector gaps
fail close if anything remains unresolved
```

## مصدر الحقيقة والتخزين

مصدر الحقيقة الوحيد لنطاق الذاكرة الدائمة:

```text
PostgreSQL
```

يخزن:

```text
sessions
turns
rounds
decisions
memories
state_snapshots
state_deltas
fact_versions
references
raw_events
memory_candidates
retrieval_events
injection_events
audit_log
secret_scan_events
consolidation_log
injection_quarantine
model_versions
job_runs
dead_letter_jobs
repair_journal
turn_context_records
```

الفهرس المتجهي:

```text
Qdrant
```

وظيفته استرجاع فقط.

لا يكون مصدر حقيقة.

يستخدم:

```text
dense vectors
sparse vectors
multi vectors
named vectors
payload filtering
collection aliases
snapshots
```

التخزين السريع:

```text
Redis
```

وظيفته:

```text
BullMQ
locks
short lived cache
hot turn cache
```

ممنوع أن يخزن ذكريات دائمة.

تبقى الأنظمة القائمة كما هي:

```text
LanceDB
Weaviate
workspace-embedding-index
editor-code-rag
backend-memory
backend-enhanced-rag
web-legacy-rag
```

لا حذف.

لا تعطيل.

لا تهجير قسري.

## واجهات عامة جديدة

واجهة الجلسة:

```text
AgentSessionStore
```

الدوال:

```text
getSessionItems(sessionId)
appendSessionItems(sessionId, items)
getRecentTurns(sessionId, limit)
markTurnStarted(turnId)
markTurnContextBuilt(turnId, context)
markTurnAnswered(turnId, answerRef)
markTurnClosed(turnId)
findIncompleteTurns(sessionId)
compactSession(sessionId)
```

واجهة سياق السؤال:

```text
TurnContextBuilder
```

الدوال:

```text
buildFastTurnContext(input)
repairTurnContext(turnId)
renderTurnContext(context)
writeTurnContext(context)
```

واجهة الإغلاق:

```text
SessionCloseGate
```

الدوال:

```text
inspectSession(sessionId)
repairMissingTurns(sessionId)
assertSessionClosable(sessionId)
writeCloseReport(sessionId)
```

واجهة الفهرس:

```text
VectorIndexAdapter
```

الدوال:

```text
upsert(points)
delete(ids)
search(query)
health()
rebuildFromPostgres()
```

واجهة البحث:

```text
PersistentMemoryRetriever
```

الدوال:

```text
retrieveForTurn(query, intent, budget)
retrieveStartupConstraints()
retrieveRecentSessionContext(sessionId)
```

## الأوامر الرسمية

أوامر الجلسة:

```text
pnpm agent:persistent-memory:session:start
pnpm agent:persistent-memory:session:append
pnpm agent:persistent-memory:session:resume
pnpm agent:persistent-memory:session:compact
pnpm agent:persistent-memory:session:close
pnpm agent:persistent-memory:session:repair
```

أوامر سياق السؤال:

```text
pnpm agent:persistent-memory:turn
pnpm agent:persistent-memory:turn:repair
pnpm agent:persistent-memory:turn:verify
```

أوامر الذاكرة:

```text
pnpm agent:persistent-memory:init
pnpm agent:persistent-memory:migrate
pnpm agent:persistent-memory:index
pnpm agent:persistent-memory:watch
pnpm agent:persistent-memory:search
pnpm agent:persistent-memory:status
```

أوامر الأسرار:

```text
pnpm agent:persistent-memory:secrets:scan
pnpm agent:persistent-memory:secrets:verify
pnpm agent:persistent-memory:secrets:purge
```

أوامر التقييم:

```text
pnpm agent:persistent-memory:eval
pnpm agent:persistent-memory:eval:golden
pnpm agent:persistent-memory:eval:safety
pnpm agent:persistent-memory:eval:latency
```

أوامر البنية:

```text
pnpm infra:up
pnpm infra:down
pnpm infra:status
pnpm infra:logs
pnpm infra:reset
```

## الملفات الأساسية

يتم إنشاء أو تعديل هذه الملفات كحد أدنى:

```text
scripts/agent/lib/persistent-memory/session-store.ts
scripts/agent/lib/persistent-memory/turn-context.ts
scripts/agent/lib/persistent-memory/session-close-gate.ts
scripts/agent/lib/persistent-memory/repair-journal.ts
scripts/agent/lib/persistent-memory/retriever.ts
scripts/agent/lib/persistent-memory/vector-index.ts
scripts/agent/lib/persistent-memory/injection.ts
scripts/agent/lib/persistent-memory/secrets.ts
scripts/agent/lib/persistent-memory/runtime.ts
scripts/agent/persistent-memory-turn.ts
scripts/agent/persistent-memory-session.ts
scripts/agent/verify-state.ts
scripts/agent/bootstrap.ts
scripts/agent/lib/templates.ts
package.json
turbo.json
podman-compose.infra.yml
```

ملفات السياق المولدة:

```text
.repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md
.repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md
.repo-agent/AGENT-CONTEXT.generated.md
```

ملفات التوثيق والتدقيق:

```text
output/persistent-memory-research.md
output/round-notes.md
output/session-state.md
```

## سياق البداية

سياق البداية لا يحقن أرشيفًا.

سياق البداية يحقن فقط:

```text
startup governing constraints
memory status
allowed zones
forbidden zones
last successful close gate status
last repair status
```

ممنوع في سياق البداية:

```text
broad state snapshots
full conversation history
large round notes
unrelated decisions
raw session logs
```

القبول:

```text
startup context is small
startup context is embedded not linked only
startup context requires live turn context before executive response
startup context does not exceed governing memory budget
```

## سياق السؤال الحي

كل سؤال يولد سياقًا خاصًا به.

الملف:

```text
.repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md
```

يحتوي:

```text
turn_context_status
query_hash
selected_intent
selected_profile
retrieval_event_id
audit_event_id
memory_context
latency_ms
degradation_reason
repair_job_id
```

لا يخزن السؤال الخام إذا احتوى أسرارًا.

يستخدم:

```text
redacted_query_preview
query_hash
```

الحقن المسموح:

```text
memory_context
evidence_context
```

الحقن المحظور:

```text
system
developer
instructions
tool contract
policy zone
```

## سياسة السرعة

الهدف:

```text
p95_memory_overhead_before_response <= 300ms
```

الحد الأعلى:

```text
hard_pre_response_timeout <= 800ms
```

إذا تجاوز المسار الكامل الحد، لا يتوقف الرد.

يستخدم النظام مسارًا سريعًا:

```text
hot cache
recent session summary
keyword retrieval
governing constraints
existing vector hits
```

ثم يسجل إصلاحًا خلفيًا.

لا ينتظر الرد:

```text
embedding current turn
reranking unless needed
vector upsert
consolidation
full repair
```

إعادة الترتيب تعمل فقط عند:

```text
low confidence
contradiction detected
top result margin too small
explicit prior decision lookup
explicit follow constraints query
```

## أسباب غياب الحقول وحلولها

سبب:

```text
pre turn hook missed
```

الحل:

```text
session close replays turn context from session log
```

سبب:

```text
query capture failed
```

الحل:

```text
derive query hash from persisted session item
```

سبب:

```text
query contains secret
```

الحل:

```text
store hash and redacted preview only
```

سبب:

```text
PostgreSQL unavailable
```

الحل:

```text
write durable repair journal
answer from hot cache
block close until replay succeeds
```

سبب:

```text
Qdrant unavailable
```

الحل:

```text
fallback to keyword and recent session memory
enqueue vector repair
```

سبب:

```text
Redis unavailable
```

الحل:

```text
use direct synchronous local queue fallback for minimal audit
block close until queue replay is restored
```

سبب:

```text
embedding model cold
```

الحل:

```text
skip current turn embedding before response
enqueue embedding after response
```

سبب:

```text
reranker timeout
```

الحل:

```text
skip reranker and record degraded rank path
```

سبب:

```text
all retrieved memories quarantined
```

الحل:

```text
inject no unsafe memory
record quarantine audit
repair candidate set
```

سبب:

```text
audit write failed
```

الحل:

```text
append repair journal record
block close until audit is replayed
```

سبب:

```text
context file write failed
```

الحل:

```text
keep in memory envelope
retry write
block close until file and hash match
```

سبب:

```text
concurrent turns conflict
```

الحل:

```text
per session turn lock
bounded retry
strict turn ordering
```

سبب:

```text
agent stopped before close
```

الحل:

```text
next bootstrap detects orphan session and runs repair
```

## بوابة إغلاق الجلسة

لا تنتهي أي جلسة وكيل فعليًا قبل:

```text
pnpm agent:persistent-memory:session:close
```

البوابة تفشل إذا:

```text
missing turn_context_status
missing query_hash
missing selected_intent
missing retrieval_event_id
missing audit_event_id
missing memory_context
pending repair jobs
unreplayed audit journal
unindexed required memory
unsafe injected memory
unclosed previous session
```

البوابة تصلح تلقائيًا ما يمكن إصلاحه.

إذا بقي نقص بعد الإصلاح، يكون الحكم:

```text
لم يكتمل التحقق التنفيذي بعد
```

ولا يسمح بأي إعلان اكتمال.

## البحث الجاد المطلوب

قبل أي قرار معماري غير محسوم، يجب تحديث:

```text
output/persistent-memory-research.md
```

كل إدخال يحتوي:

```text
date
question
sources
evidence_type
claim
impact_on_design
decision
confidence
```

تصنيف الأدلة:

```text
operational
official documentation
primary paper
source code
benchmark
unverified
```

لا تقبل قرارات مبنية على نتائج بحث فقط.

لا تقبل قرارات من مصدر واحد إذا كانت تؤثر على المعمارية.

## متغيرات البيئة والإنتاج

يتم تحديث:

```text
turbo.json
```

حتى لا يحجب مدير البناء متغيرات مهمة في الوضع الصارم.

تصنيف المتغيرات:

```text
required production
required only when memory strict mode is enabled
optional degraded mode
```

لا تكسر متغيرات الذاكرة الإنتاج إذا كان الوضع الاختياري مفعلًا.

تكسر التشغيل فقط عند:

```text
MEMORY_INFRA_REQUIRED=true
```

أو:

```text
PERSISTENT_MEMORY_INFRA_REQUIRED=true
```

## خطة التنفيذ بالتتابع

### المهمة الأولى

تثبيت حالة الشجرة الحالية.

الأوامر:

```text
pnpm agent:bootstrap
git status --short --branch
git diff -- scripts/agent/lib/persistent-memory
git diff -- scripts/agent/bootstrap.ts
git diff -- scripts/agent/lib/templates.ts
git diff -- scripts/agent/verify-state.ts
```

الناتج المطلوب:

```text
baseline report
```

يصنف كل ملف إلى:

```text
keep
replace
regenerate
requires user approval before discard
```

### المهمة الثانية

كتابة اختبارات فاشلة لسياق السؤال الحي.

الأمر:

```text
pnpm exec vitest run scripts/agent/lib/persistent-memory/turn-context.test.ts
```

الحالات:

```text
question specific injection
different questions produce different contexts
empty question fails
secret question stores hash only
forbidden zones rejected
missing metadata rejected
high risk memory quarantined
```

### المهمة الثالثة

تنفيذ سياق السؤال الحي.

المخرجات:

```text
turn context builder
intent classifier
budget selector
fast retrieval path
safe envelope writer
audit writer
repair job marker
```

الأمر الرسمي:

```text
pnpm agent:persistent-memory:turn -- --query "هل الحقن يعتمد على السؤال؟"
```

### المهمة الرابعة

تصغير سياق البداية.

المطلوب:

```text
startup context contains governing constraints only
```

الممنوع:

```text
broad state snapshots
large previous round history
generic archive injection
```

### المهمة الخامسة

بناء طبقة الجلسة.

المخرجات:

```text
PostgresAgentSessionStore
InMemoryAgentSessionStore for tests
turn lifecycle states
session resume
session append
session compact
```

### المهمة السادسة

بناء بوابة الإغلاق والإصلاح.

المخرجات:

```text
SessionCloseGate
RepairJournal
missing turn replay
audit replay
vector repair scheduling
orphan session repair on bootstrap
```

### المهمة السابعة

تحسين السرعة.

المطلوب:

```text
hot cache
recent summary
parallel lexical and vector retrieval
bounded timeout
reranker only when needed
latency metrics
```

### المهمة الثامنة

تثبيت الأسرار.

المطلوب:

```text
pre storage scan
redacted preview
query hash
purge command
vector point deletion
audit entry
```

### المهمة التاسعة

تحديث التحقق الرسمي.

الأمر:

```text
pnpm agent:verify
```

يفشل عند:

```text
missing live turn command
missing close gate
missing generated turn context
same context for different questions
startup context too broad
session close not enforced
```

### المهمة العاشرة

تحديث البحث والتوثيق.

المطلوب:

```text
output/persistent-memory-research.md
```

يتضمن قرارات:

```text
session layer
fast fallback
Qdrant indexing
BullMQ repair jobs
environment strict mode
BGE M3 evaluation
```

### المهمة الحادية عشرة

تشغيل تحقق القبول الكامل.

الأوامر:

```text
pnpm agent:bootstrap
pnpm agent:persistent-memory:turn -- --query "هل الحقن يعتمد على السؤال؟"
pnpm agent:persistent-memory:turn -- --query "ما الذي لا يجب تكراره؟"
pnpm agent:persistent-memory:turn -- --query "ما حالة البنية المحلية؟"
pnpm agent:persistent-memory:session:close
pnpm agent:persistent-memory:secrets:verify
pnpm agent:persistent-memory:eval
pnpm agent:persistent-memory:eval:golden
pnpm agent:persistent-memory:eval:safety
pnpm agent:persistent-memory:eval:latency
pnpm agent:verify
pnpm infra:status
pnpm type-check
pnpm test
pnpm build
```

## اختبارات القبول

اختبار البداية:

```text
startup context is governing only
```

اختبار السؤال:

```text
turn context depends on current question
```

اختبار الاختلاف:

```text
three different questions produce three different memory envelopes
```

اختبار السرعة:

```text
p95 memory overhead before response <= 300ms
```

اختبار المهلة:

```text
hard timeout <= 800ms
```

اختبار الإغلاق:

```text
session close fails when any turn is incomplete
```

اختبار الإصلاح:

```text
session close repairs missing turn contexts
```

اختبار التدهور:

```text
fast fallback answers safely and creates repair job
```

اختبار الأسرار:

```text
secret query stores hash and redacted preview only
```

اختبار الإنتاج:

```text
missing optional memory infra does not crash production
```

اختبار الوضع الصارم:

```text
strict memory infra mode fails without required services
```

## معايير الإغلاق النهائية

لا يسمح بإعلان الاكتمال إلا إذا:

```text
all turns have required context fields
```

```text
session close gate passes
```

```text
live turn context exists
```

```text
startup context is small
```

```text
memory injection changes by question
```

```text
fast path meets latency budget
```

```text
repair path is tested
```

```text
secret path is tested
```

```text
audit path is tested
```

```text
vector rebuild from PostgreSQL is tested
```

```text
agent verify passes
```

```text
no failed relevant checks remain
```

```text
no dirty incomplete implementation remains
```

## حزمة الإثبات عند التسليم

التقرير النهائي يجب أن يحتوي:

```text
date
branch
commit
changed files
commands run
command results
startup context proof
turn context proof
different questions proof
latency proof
close gate proof
repair proof
secret proof
production env proof
remaining unproven items
confidence statement
```

إذا غاب أي عنصر من هذه الحزمة، يمنع إعلان:

```text
مكتمل
```

ويمنع إعلان:

```text
Fully Featured and Production-Ready
```

## القرار النهائي

الخطة النهائية لا تعتمد فقط على آخر نسخة.

الخطة النهائية تدمج:

```text
PLAN3.md
```

لإصلاح خطأ الأداء والحقن الحي.

وتدمج:

```text
PLAN2.md
```

لإضافة طبقة الجلسة والمعمارية الإنتاجية.

وتدمج:

```text
PLAN.md
```

لإضافة السرعة والإغلاق المانع والإصلاح الإلزامي.

النتيجة المطلوبة:

```text
fast response now
mandatory memory repair before close
question specific injection always
no false completion claims
```

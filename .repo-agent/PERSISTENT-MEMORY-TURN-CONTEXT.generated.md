# Persistent Memory Live Turn Context

turn_context_status: ready
status: ready
zone: memory_context
query_hash: 16331ef2c369946144677f6b3ebffcd174e906636618c12deec1296f7eb7ea68
redacted_query_preview: القرار الحاسم: لا توجد أربعة مسارات اختيارية، ولا يوجد مجال للمفاضلة أو إعادة ترتيب الخطة حسب الراحة.\n\nنقطة الدخول للجولة الأولى هي:\n\n## أعلى مخاطر الإنتاج
secret_scan_status: clean
selected_intent: execution_or_code_change
selected_profile: execution_or_code_change
retrieval_event_id: b52f12c1-5730-4487-a2ae-74720190d790
audit_event_id: 4a9f198d-1de2-4327-ab64-72717382f100
latency_ms: 201
degradation_reason: none
repair_job_id: none

memory_context:

- id: e48b2f46-5c3f-4fa4-be56-d2337da8a18e
  source_ref: AGENTS.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: قرار حاكم عالي الثقة: عند تدهور بنية الذاكرة الدائمة يستخدم الوكيل أسرع سياق آمن متاح ولا يحقن خارج memory_context.
- id: 4c0d625e-09f2-4284-9d4f-8df4520b1c1f
  source_ref: .repo-agent/STARTUP-PROTOCOL.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: قيد تشغيل: يجب بناء سياق سؤال حي يتضمن query_hash وretrieval_event_id وaudit_event_id قبل الحكم التنفيذي.

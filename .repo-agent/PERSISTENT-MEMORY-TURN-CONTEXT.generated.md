# Persistent Memory Live Turn Context

turn_context_status: ready
status: ready
zone: memory_context
query_hash: ae2461e064594701ec50d3f059c419731af07c7b3e0351a84929e4aeff7e11e2
redacted_query_preview: القرار الحاسم: لا توجد أربعة مسارات اختيارية، ولا يوجد مجال للمفاضلة أو إعادة ترتيب الخطة حسب الراحة.\n\nنقطة الدخول للجولة الأولى هي:\n\n## أعلى مخاطر الإنتاج
secret_scan_status: clean
selected_intent: execution_or_code_change
selected_profile: execution_or_code_change
retrieval_event_id: 0a3edb3a-c255-40b8-a4f6-316a1b25ee4e
audit_event_id: f31790e5-888b-4640-9b2d-942e805c0c26
latency_ms: 226
degradation_reason: none
repair_job_id: none

memory_context:

- id: 70682eb3-7363-4ed1-9318-a9c2b04a0b21
  source_ref: AGENTS.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: قرار حاكم عالي الثقة: عند تدهور بنية الذاكرة الدائمة يستخدم الوكيل أسرع سياق آمن متاح ولا يحقن خارج memory_context.
- id: 96c82c5b-64c5-42ad-a61c-3c4618830dc4
  source_ref: .repo-agent/STARTUP-PROTOCOL.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: قيد تشغيل: يجب بناء سياق سؤال حي يتضمن query_hash وretrieval_event_id وaudit_event_id قبل الحكم التنفيذي.

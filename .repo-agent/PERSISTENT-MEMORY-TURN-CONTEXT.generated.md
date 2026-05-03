# Persistent Memory Live Turn Context

turn_context_status: ready
status: ready
zone: memory_context
query_hash: 47edd7dc6de1354ca20ff114e27a8be9575c024ad9868d425f12645f10b7f308
redacted_query_preview: وضع الحقن الالي ايه
secret_scan_status: clean
selected_intent: default
selected_profile: default
retrieval_event_id: e546cbc0-6fd4-4e93-94f1-e22b68df717b
audit_event_id: 4b249743-31a3-4dc5-b0df-8cb8ff1836cd
latency_ms: 17
degradation_reason: none
repair_job_id: none

memory_context:

- id: 2ecd1bf8-1728-4423-bf35-9f1de5590ebd
  source_ref: AGENTS.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: قرار حاكم عالي الثقة: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي، ولا يكفي وجود ملف الذاكرة بلا قراءة وحقن.
- id: 9130537a-7e77-4ece-944d-ad756fdfe641
  source_ref: .repo-agent/STARTUP-PROTOCOL.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: قيد بداية: سياق البداية يحقن قيودًا حاكمة فقط داخل memory_context، وسياق السؤال الحي الرسمي يجب أن يولد .repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md قبل الرد التنفيذي.
- id: f2427eb5-38a9-456a-a191-ad41121751f3
  source_ref: AGENTS.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: قرار حاكم: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي، ولا يكفي وجود ملف الذاكرة بلا قراءة وحقن.

# Persistent Memory Startup Context

status: ready
zone: memory_context
retrieval_event_id: 859871f6-9975-41c7-9786-2198663042b1
audit_event_id: 1d08726d-35a5-41df-99c0-1f576ffc861b

## Injected Memories

- id: 40a11b3c-08fd-43e3-aeae-74eca7512e99
  source_ref: AGENTS.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: قرار حاكم عالي الثقة: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي، ولا يكفي وجود ملف الذاكرة بلا قراءة وحقن، ويجب بناء سياق سؤال حي قبل أي حكم تنفيذي.
- id: 4d51a2c7-01bc-432b-8e80-87d29bfcdba4
  source_ref: .repo-agent/STARTUP-PROTOCOL.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: قيد بداية: يجب قراءة .repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md كسياق حاكم صغير فقط داخل memory_context، وسياق السؤال الحي الرسمي يجب أن يولد .repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md قبل الرد التنفيذي.
- id: 9130537a-7e77-4ece-944d-ad756fdfe641
  source_ref: .repo-agent/STARTUP-PROTOCOL.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: قيد بداية: سياق البداية يحقن قيودًا حاكمة فقط داخل memory_context، وسياق السؤال الحي الرسمي يجب أن يولد .repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md قبل الرد التنفيذي.

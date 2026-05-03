# Persistent Memory Live Turn Context

turn_context_status: ready
status: ready
zone: memory_context
query_hash: 38918b1dc80a295af732a70efe64319ca76e8c6570fb14bdd76b74a930b98ebf
redacted_query_preview: ما حالة البنية المحلية؟
secret_scan_status: clean
selected_intent: current_state_lookup
selected_profile: current_state_lookup
retrieval_event_id: 042eaf2a-f83a-4d90-bf78-2e8001484cb1
audit_event_id: e9ca330e-c4ae-4359-bb0a-f78ecd006977
latency_ms: 17
degradation_reason: none
repair_job_id: none

memory_context:

- id: live-state-repo-agent-live-runtime-state
  source_ref: .repo-agent/live-runtime-state
  trust_level: high
  model_version: baai-bge-m3-local
  text: لقطة حالة حية مولدة لحظة السؤال. الفرع الحالي: main آخر commit: e44c80f612f6b9f87a308d67da5900da077a6e14 حالة working tree: غير نظيفة — 13 ملف متغير عدد الملفات المتغيرة: 13 هذه اللقطة تسبق ملفات الحالة المولدة عند سؤال الحالة الحالية.
- id: live-state-output-session-state-md
  source_ref: output/session-state.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: | الفرع الحالي | `main` | | آخر commit | `e44c80f612f6b9f87a308d67da5900da077a6e14` | | حالة working tree | غير نظيفة — 13 ملف متغير | | مستوى drift | `no-drift` | pnpm infra:up pnpm infra:down pnpm infra:status pnpm infra:logs pnpm infra:reset - سياق الذاكرة الدائمة المولد: - `qdrant` - `weaviate` - المخازن المتجهية: `lancedb`، `qdrant`، `workspace-embedding-index` - الاعتماديات: `Google Gemini embeddings`، `LanceDB`، `pnpm workspace:embed`، `Qdrant` - المخازن المتجهية: `weaviate` - المدخلات: `
- id: live-state-output-round-notes-md
  source_ref: output/round-notes.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: ### مستوى drift `no-drift` # سجل الحالة التنفيذية الحالية > هذا الملف يرصد الوضع الحالي فقط، ولا يحتفظ بتاريخ الجولات السابقة. ## لقطة الحالة الحالية ### وقت الرصد الحالي 2026-05-03T04:38:41.297Z ### آخر مزامنة مرجعية 2026-05-03T04:38:39.863Z ### نوع الرصد تشغيل بداية الجلسة ### ما الذي فحصه bootstrap - حالة git الحالية - أوامر التشغيل الرسمية - المنافذ الرسمية - التطبيقات والحزم - العقود اليدوية - الملفات المرجعية الحية - مرايا IDE المطلوبة - طبقات المعرفة والاسترجاع ### ما الذي تم تحديثه - out
- id: 9a3fe7de-e1b8-4c6f-9be8-4a22dd2ffdf6
  source_ref: output/round-notes.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: # سجل الحالة التنفيذية الحالية > هذا الملف يرصد الوضع الحالي فقط، ولا يحتفظ بتاريخ الجولات السابقة. ## لقطة الحالة الحالية ### وقت الرصد الحالي 2026-05-03T03:38:14.940Z ### آخر مزامنة مرجعية 2026-05-03T02:56:22.879Z ### نوع الرصد تشغيل بداية الجلسة ### ما الذي فحصه bootstrap - حالة git الحالية - أوامر التشغيل الرسمية - المنافذ الرسمية - التطبيقات والحزم - العقود اليدوية - الملفات المرجعية الحية - مرايا IDE المطلوبة - طبقات المعرفة والاسترجاع ### ما الذي تم تحديثه - output/session-state.md ### مس
- id: b20bec6a-f1a4-4cc4-ad8f-196b1952f9b6
  source_ref: output/round-notes.md
  trust_level: medium
  model_version: baai-bge-m3-local
  text: # سجل الحالة التنفيذية الحالية > هذا الملف يرصد الوضع الحالي فقط، ولا يحتفظ بتاريخ الجولات السابقة. ## لقطة الحالة الحالية ### وقت الرصد الحالي 2026-05-03T03:35:28.370Z ### آخر مزامنة مرجعية 2026-05-03T02:56:22.879Z ### نوع الرصد تشغيل بداية الجلسة ### ما الذي فحصه bootstrap - حالة git الحالية - أوامر التشغيل الرسمية - المنافذ الرسمية - التطبيقات والحزم - العقود اليدوية - الملفات المرجعية الحية - مرايا IDE المطلوبة - طبقات المعرفة والاسترجاع ### ما الذي تم تحديثه - output/session-state.md ### مس

# 13 - Voice Stylist Agent

## الهدف

توفير جلسة صوتية تفاعلية مع الستايلست أو المخرج أو المنتج وتحويلها إلى أثر عملي منظم.

## المسؤولية

- إدارة جلسة Realtime
- دعم الحوار الصوتي والنصي
- استخراج القرارات والملاحظات
- تحويلها إلى comments أو change requests أو jobs

## المدخلات

- live audio
- current selection
- production context
- session settings

## الأدوات

- `create_realtime_client_secret`
- `append_conversation_notes`
- `dispatch_followup_jobs`

## المخرجات

- live responses
- structured notes
- actionable follow-up items

## القواعد

1. منطق الأدوات الحساسة يبقى على الخادم.
2. كل ما يخرج من الجلسة يجب أن يُدوّن.
3. لا ينفذ اعتمادًا نهائيًا من داخل الجلسة الصوتية.

## مؤشرات الجودة

- latency
- note extraction accuracy
- actionability of session outcomes

# Arab Stylist Studio - Spec Bundle

هذه الحزمة تحتوي على التحويل العملي للوثيقة السابقة إلى ملفات تنفيذية أولية قابلة للبدء مباشرة:

- `prd.md` : وثيقة PRD تفصيلية
- `schema.sql` : مخطط قاعدة البيانات PostgreSQL + pgvector
- `openapi.yaml` : تصميم واجهات API بصيغة OpenAPI 3.1
- `agents/` : تعريف كل وكيل على حدة

## ترتيب التنفيذ المقترح

1. مراجعة `prd.md` واعتماد النطاق
2. مراجعة `schema.sql` وضبط الحقول الخاصة بالمؤسسة
3. ربط `openapi.yaml` بطبقة Route Handlers
4. تنفيذ الوكلاء بالتسلسل:
   - 01 Orchestrator
   - 02 Script Parsing
   - 03 Character Style Bible
   - 04 Scene Look
   - 05 Retrieval
   - 06 Moodboard
   - 07 Image
   - 08 Continuity
   - 09 Approval Translation
   - 10 Vendor Budget
   - 11 Compliance
   - 12 Evaluation
   - 13 Voice Stylist

## ملاحظات

- تم اعتماد بنية متعددة المستأجرين `tenant-aware`.
- تم افتراض PostgreSQL 18 + pgvector.
- تم تصميم الـ API على أساس `/v1`.
- تم فصل الموافقات البشرية عن الوكلاء عمدًا.
- الملف `openapi.yaml` مصمم ليكون نقطة بداية قوية، لا نسخة نهائية مغلقة.

## تسمية الإصدار

- Document baseline date: 2026-03-28
- Product: Arab Stylist Studio
- Language: Arabic-first / RTL-first

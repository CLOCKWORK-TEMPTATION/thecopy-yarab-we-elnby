# Runtime الوكلاء

## المبادئ

- كل وكيل يملك `input_schema` و`output_schema`.
- كل وكيل يقرأ من write scope محدود سلفاً.
- الـschema validation إلزامية قبل تثبيت أي output.
- التقييم guardrail قد يغيّر حالة run إلى `needs_review`.
- الكيانات المعتمدة لا يكتب فوقها أي وكيل مباشرة.

## حالات التشغيل

- `queued`
- `running`
- `needs_review`
- `completed`
- `failed`
- `cancelled`

## دورة التنفيذ

1. إنشاء `agent_run`
2. تحميل المدخلات والسياق
3. استدعاء الوكيل
4. التحقق من الـschema
5. حفظ output مرحلي
6. تشغيل `eval_guardrail` عند الحاجة
7. إما اعتماد بشري أو تثبيت آمن في الجداول المستهدفة

## التتبع

كل run يجب أن يحتفظ بـ:

- `input_payload`
- `output_payload`
- `error_payload`
- `source_refs_json`
- `model_policy_json`
- `review_status`

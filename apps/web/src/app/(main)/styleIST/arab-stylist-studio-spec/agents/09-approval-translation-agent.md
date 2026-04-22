# 09 - Approval Translation Agent

## الهدف

تحويل التعليق البشري أو قرار المراجعة إلى طلب تعديل تنفيذي واضح.

## المسؤولية

- قراءة سلاسل التعليقات
- استخراج التعليمات المؤكدة
- فصل الغامض عن المؤكد
- إنتاج change request structured

## المدخلات

- comment thread
- parent object state
- revision history

## الأدوات

- `read_comments`
- `diff_object_versions`
- `propose_patch`

## المخرجات

```json
{
  "change_request": {
    "summary": "",
    "target_fields": [],
    "explicit_constraints": [],
    "ambiguities": []
  }
}
```

## القواعد

1. لا يختلق intent غير مذكور.
2. لا ينفذ التعديل مباشرة.
3. يميز بين:
   - confirmed instructions
   - inferred suggestions
   - unresolved ambiguity

## مؤشرات الجودة

- translation accuracy
- ambiguity detection
- implementation readiness

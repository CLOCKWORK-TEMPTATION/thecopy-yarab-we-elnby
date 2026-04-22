# 10 - Vendor & Budget Agent

## الهدف

مطابقة عناصر اللوك مع عناصر موردين محتملين وتقدير التكلفة ضمن القيود المالية.

## المسؤولية

- البحث في catalogs
- مطابقة style intent بعناصر قابلة للتوريد
- إنتاج exact match أو substitute
- حساب total estimate

## المدخلات

- look items
- vendor catalogs
- budget limits
- region constraints

## الأدوات

- `search_vendor_items`
- `score_vendor_match`
- `save_vendor_matches`

## المخرجات

```json
{
  "matches": [
    {
      "look_item_ref": "",
      "vendor_item_id": "",
      "match_score": 0.0,
      "price_amount": 0,
      "notes": ""
    }
  ],
  "total_estimate": 0
}
```

## القواعد

1. لا يتجاوز القيود الجغرافية من دون تعليم ذلك.
2. يفرق بين exact match وstylistic substitute.
3. لا يقدّم رقم تكلفة واحدًا من دون تفصيل معقول.

## مؤشرات الجودة

- cost realism
- match usefulness
- budget safety

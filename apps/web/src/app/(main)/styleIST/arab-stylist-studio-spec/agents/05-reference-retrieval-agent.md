# 05 - Reference Retrieval Agent

## الهدف

استرجاع المراجع الأنسب من النصوص والأصول والـ looks السابقة والكتالوجات.

## المسؤولية

- تنفيذ بحث هجين
- فلترة النتائج حسب الشخصية والمشهد والحقبة واللون والخامة
- ترتيب النتائج
- تفسير سبب ظهور النتيجة

## المدخلات

- user query
- scene / character context
- active filters

## الأدوات

- `hybrid_search`
- `filter_assets`
- `rank_references`

## المخرجات

```json
{
  "results": [
    {
      "asset_id": "",
      "reason_codes": ["semantic_match", "palette_match", "era_match"],
      "score": 0.0
    }
  ]
}
```

## القواعد

1. يميز بين search result وapproved reference.
2. لا يعيد أصولًا محجوبة الحقوق عند طلب export reference.
3. يفضل النتائج المرتبطة بالمشروع نفسه قبل النتائج العامة.

## مؤشرات الجودة

- retrieval relevance
- precision@k
- explanation usefulness

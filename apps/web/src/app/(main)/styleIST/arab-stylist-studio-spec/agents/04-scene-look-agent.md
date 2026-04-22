# 04 - Scene Look Agent

## الهدف

اقتراح Looks ملموسة لمشهد محدد، مرتبطة بالشخصية والسياق والاستمرارية والميزانية.

## المسؤولية

- توليد عدة بدائل Look
- ربط كل بديل بعناصر Look items
- إظهار التبرير الدرامي والبصري
- حساب التكلفة التقديرية
- تنبيه مخاطر الاستمرارية

## المدخلات

- scene data
- involved characters
- approved style bible
- continuity context
- budget cap
- reference assets

## الأدوات

- `load_scene`
- `load_style_bible`
- `load_previous_looks`
- `save_look_variants`

## المخرجات

```json
{
  "looks": [
    {
      "title": "",
      "narrative_intent": "",
      "items": [],
      "palette_alignment_score": 0.0,
      "continuity_risk": "low",
      "estimated_cost": 0
    }
  ]
}
```

## القواعد

1. لا يقترح Look بلا عناصر ملموسة.
2. كل عنصر يجب أن يحمل category وpurpose.
3. لا يتجاهل الاستمرارية السابقة.
4. لا يخرج عن Style Bible دون تعليم ذلك بوضوح.

## حالات الفشل

- missing approved style bible
- incomplete scene context
- budget ambiguity

## مؤشرات الجودة

- approval rate
- scene relevance
- continuity safety

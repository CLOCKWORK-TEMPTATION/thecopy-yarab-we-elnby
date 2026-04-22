# 07 - Image Generation & Edit Agent

## الهدف

توليد أو تعديل صور مرجعية تخدم اللوك أو المودبورد دون تحويلها مباشرة إلى مخرج نهائي معتمد.

## المسؤولية

- توليد variants
- تعديل أصل موجود
- الالتزام بالقيود المقفلة
- حفظ metadata لكل نتيجة

## المدخلات

- prompt plan
- source asset if editing
- reference assets
- locked constraints
- target usage

## الأدوات

- `generate_image`
- `edit_image`
- `store_generated_asset`
- `link_asset_to_parent`

## المخرجات

```json
{
  "generated_assets": [
    {
      "asset_id": "",
      "variant_label": "",
      "constraint_report": {
        "palette_followed": true,
        "era_followed": true
      }
    }
  ]
}
```

## القواعد

1. لا يعتمد الصورة نهائيًا.
2. كل تعديل يجب أن يشير إلى الأصل.
3. كل نتيجة يجب أن تُربط بالسياق المناسب.
4. أي إخلال بالقيد يجب أن يظهر في `constraint_report`.

## مؤشرات الجودة

- prompt adherence
- edit fidelity
- useful variant diversity

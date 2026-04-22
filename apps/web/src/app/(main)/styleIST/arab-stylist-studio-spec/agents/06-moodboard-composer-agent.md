# 06 - Moodboard Composer Agent

## الهدف

تحويل مجموعة أصول وقرارات Look إلى لوحة مرجعية مرتبة بصريًا وقابلة للنقاش.

## المسؤولية

- اقتراح layout
- توزيع الأصول
- إضافة captions وrationales
- التفريق بين anchor / inspiration / contrast / detail assets

## المدخلات

- selected assets
- style bible or scene look
- moodboard objective
- layout constraints

## الأدوات

- `load_assets`
- `generate_layout_plan`
- `save_moodboard`
- `attach_captions`

## المخرجات

```json
{
  "moodboard": {
    "title": "",
    "objective": "",
    "items": [
      {
        "asset_id": "",
        "placement": { "x": 0, "y": 0, "w": 0, "h": 0 },
        "caption": "",
        "rationale": ""
      }
    ]
  }
}
```

## القواعد

1. الترتيب ليس تجميليًا فقط بل تفسيريًا أيضًا.
2. يجب أن يظل المودبورد قابلًا للقراءة في الاجتماعات.
3. لا يخلط بين النسخة النهائية ونسخ العمل.

## مؤشرات الجودة

- scanability
- clarity
- composition usefulness

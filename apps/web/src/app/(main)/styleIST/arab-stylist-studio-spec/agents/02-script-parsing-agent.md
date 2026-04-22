# 02 - Script Parsing Agent

## الهدف

تحويل النص الخام للسيناريو إلى مشاهد وشخصيات وإشارات بصرية قابلة للتخزين والفهرسة.

## المسؤولية

- تقسيم السيناريو إلى مشاهد
- استخراج الشخصيات
- ربط الشخصيات بالمشاهد
- رصد مناطق الشك
- إنتاج بنية JSON قابلة للتدقيق

## المدخلات

- extracted script text
- document metadata
- parser policy version

## الأدوات

- `normalize_arabic_text`
- `split_document_chunks`
- `persist_scenes`
- `persist_characters`
- `persist_mentions`

## المخرجات

```json
{
  "scenes": [],
  "characters": [],
  "scene_character_links": [],
  "uncertainties": []
}
```

## القواعد

1. لا يبتكر مشاهد غير موجودة.
2. يحتفظ دائمًا بالنص الخام `header_raw`.
3. يميز بين المؤكد والمحتمل وغير المؤكد.
4. يسجل مناطق الالتباس لمراجعة بشرية.

## حالات الفشل

- unreadable extraction
- weak boundaries
- duplicate character forms
- mixed-language header ambiguity

## مؤشرات الجودة

- دقة تقسيم المشاهد
- دقة استخراج الشخصيات
- نسبة false merge / false split

# 08 - Continuity Agent

## الهدف

كشف كسور الاستمرارية البصرية عبر المشاهد والحلقات.

## المسؤولية

- مقارنة looks عبر الزمن السردي
- اكتشاف اختفاء أو ظهور غير مبرر
- اكتشاف تغيّر غير مبرر في حالة القطعة
- اقتراح fix دون فرضه

## المدخلات

- scene sequence
- looks by chronology
- snapshots / assets
- narrative time jumps

## الأدوات

- `load_scene_sequence`
- `load_character_looks`
- `persist_continuity_events`

## المخرجات

```json
{
  "issues": [
    {
      "issue_type": "missing_accessory",
      "severity": "high",
      "scene_id": "",
      "previous_scene_id": "",
      "character_id": "",
      "description": "",
      "proposed_fix": {}
    }
  ]
}
```

## القواعد

1. يفرق بين intentional jump وactual break.
2. لا يغلق issue تلقائيًا.
3. يفضّل التفسير الأبسط المتوافق مع التسلسل السردي.

## مؤشرات الجودة

- precision
- false positives
- resolution usefulness

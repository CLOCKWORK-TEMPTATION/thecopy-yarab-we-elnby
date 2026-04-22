# نموذج البيانات

## الكيانات المحورية

- `productions`
- `script_documents`
- `script_versions`
- `scenes`
- `scene_revisions`
- `scene_plan_versions`
- `setups`
- `shots`
- `takes`
- `assets`
- `knowledge_chunks`
- `continuity_flags`
- `pickup_requests`
- `handoff_packages`
- `agent_definitions`
- `agent_runs`

## القرارات البنيوية

1. المشهد كيان مستقر، وظهوره داخل النسخة النصية هو `scene_revision`.
2. الخطط تتبع نموذج النسخ `scene_plan_versions`.
3. الأصول immutable على مستوى الملف.
4. الربط بين الأصول والكيانات يتم عبر `asset_links`.
5. البيانات الخاصة بالمورد تحفظ في `metadata_json`.
6. البحث النصي والدلالي يعمل فوق `knowledge_chunks`.
7. كل الجداول الساخنة تحمل `org_id` و`production_id` و`row_version` قدر الإمكان.

## دورة الحياة

`script_version -> scene_revision -> scene_plan_version -> setup -> shot -> take -> continuity/pickup -> handoff`

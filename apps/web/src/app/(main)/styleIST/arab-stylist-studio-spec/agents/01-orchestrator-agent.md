# 01 - Orchestrator Agent

## الهدف

تنسيق بقية الوكلاء، وتحديد الوكيل المطلوب لكل عملية، والتحقق من الشروط المسبقة قبل أي تشغيل.

## المسؤولية

- تحديد نوع العملية المطلوبة
- فحص الصلاحيات
- فحص وجود الكيانات المرجعية المطلوبة
- منع الاستدعاءات غير الضرورية
- تحويل الطلب إلى Job منظم

## المدخلات

- route / user action
- current user
- tenant / production context
- selected objects
- latest approval states

## الأدوات المسموح بها

- `get_production_context`
- `get_permissions`
- `search_entities`
- `dispatch_agent_job`
- `create_comment`
- `create_approval`

## المخرجات الإلزامية

```json
{
  "operation": "generate_scene_looks",
  "required_agents": ["scene_look_agent", "reference_retrieval_agent"],
  "blocking_checks": ["style_bible_exists", "permissions_ok"],
  "sync_response": false
}
```

## القواعد

1. لا يولد محتوى إبداعيًا بنفسه.
2. لا يكتب مباشرة إلى قاعدة البيانات.
3. لا يمرر طلبًا لوكيل تنفيذي إذا كانت الشروط المسبقة غير متحققة.
4. لا يتجاوز approvals أو locks أو project status.

## حالات الفشل

- missing context
- invalid object reference
- permission denied
- unsupported workflow

## مؤشرات الجودة

- صحة اختيار الوكيل
- انخفاض الاستدعاءات غير اللازمة
- انخفاض نسب الفشل الناتج عن preconditions

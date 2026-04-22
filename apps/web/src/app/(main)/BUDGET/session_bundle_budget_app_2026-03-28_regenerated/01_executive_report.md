# التقرير التنفيذي — تطبيق ويب تفاعلي لمساعد إنشاء ميزانية الأفلام والمسلسلات العربية وفق السوق المصري

## الخلاصة التنفيذية

القرار الصحيح ليس بناء شات بوت فقط، بل بناء منصة تشغيل للميزانية تتكوّن من:

- واجهة تفاعلية شبيهة بالإكسل لإدارة البنود
- محرك قواعد مالي حتمي وقابل للمراجعة
- مساعد ذكي يقرأ النصوص والمستندات ويقترح البنود والافتراضات ويحذر من المخاطر

حتى 28 مارس 2026، التكديس الأكثر اتزانًا وحداثة:

- Next.js 16.2
- React 19.2
- Python 3.14
- FastAPI
- PostgreSQL 18.3
- pgvector
- Structured Outputs + Function Calling + multimodal input
- OpenTelemetry + Sentry

## لماذا يحتاج السوق المصري إلى تصميم خاص؟

- الجنيه المصري هو العملة الأساسية
- دعم التقاطات سعر الصرف التاريخية
- فهرسة تضخمية
- Tax Profiles مرنة
- قابلية التكامل مع الفاتورة الإلكترونية والإيصال الإلكتروني
- منطق للتصاريح والمهلات والموافقات

## ما الذي يجب أن يكونه المنتج فعليًا؟

- واجهة ميزانية جدولية
- لوحة جانبية للمساعد الذكي
- نظام نسخ وإصدارات
- وحدة استيراد نصوص ومستندات
- وحدة اعتماد وموافقات
- Actuals مقابل Budget

## التكديس التقني المقترح

### الواجهة

- Next.js 16.2
- React 19.2
- TypeScript
- Tailwind CSS 4.x

### الخلفية

- Python 3.14
- FastAPI

### قاعدة البيانات

- PostgreSQL 18.3
- pgvector

### الذكاء الاصطناعي

- Provider Abstraction
- Structured Outputs
- Function Calling
- Stateful interactions

### المراقبة

- OpenTelemetry
- Sentry

## المعمارية المقترحة

- Modular Monolith

```text
المستخدم
  -> واجهة Next.js
    -> API Gateway / BFF
      -> Budget Service
      -> Script Breakdown Service
      -> AI Orchestrator
      -> Vendor & Quote Service
      -> Approval Workflow
      -> Reporting Service
        -> PostgreSQL + pgvector
        -> Object Storage
        -> Worker Queue
        -> Audit Log
```

## الوظائف الأساسية

- إنشاء أنواع مشاريع متعددة
- استيراد النص
- Scene Breakdown
- توليد مسودة ميزانية أولية
- Rate Cards خاصة بالشركة
- إدارة عروض الأسعار
- سيناريوهات متعددة
- توزيع التكاليف
- Workflow اعتماد
- تقارير وتصدير

## قواعد محرك الميزانية المصري

كل بند يجب أن يحمل على الأقل:

- department
- cost_code
- description
- unit_type
- quantity
- base_currency
- quoted_currency
- unit_cost
- fx_snapshot_date
- fx_rate
- tax_profile
- allocation_scope
- episode_or_block
- assumption_source
- confidence_score
- version_id

## الأمن والحوكمة

- RBAC صارم
- عزل بيانات كل شركة
- Audit Log غير قابل للعبث
- تشفير الملفات الحساسة
- مراجعة لكل تغيير مالي
- عدم تمرير البيانات الحساسة إلى نموذج خارجي دون سياسات واضحة

## ما لا يُنصح به

- لا تبدأ بـ Microservices
- لا تجعل AI هو الحاسب النهائي
- لا تعتمد على أسعار عامة ثابتة
- لا تؤجل Excel export
- لا تبنِ المنتج على واجهة جميلة فقط دون محرك قواعد مالي

# PRD تفصيلي + مخطط قاعدة البيانات + تصميم واجهات API + تصميم الوكلاء

## 1. بطاقة الوثيقة

| البند                | القيمة                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| اسم المنتج           | Arab Production Budget OS                                                           |
| نوع المنتج           | SaaS / Private Cloud Web App                                                        |
| السوق المستهدف       | شركات الإنتاج في مصر أولًا، ثم السوق العربي                                         |
| المستخدمون الأساسيون | المنتج، مدير الإنتاج، المحاسب، المشتريات، المراجع المالي، الإدارة                   |
| هدف الإصدار الأول    | إنشاء مسودة ميزانية دقيقة وقابلة للمراجعة من النص وعروض الأسعار والافتراضات المحلية |

## 2. تعريف المشكلة

الحالة الحالية تقوم على:

- ملفات Excel متفرقة وغير مضبوطة الإصدارات
- اعتماد كبير على الخبرة الفردية
- صعوبة تتبع سبب ظهور رقم معين
- فصل بين النص الفني وعروض الأسعار والميزانية والتنفيذ الفعلي
- غياب سجل تدقيق موحد

## 3. الرؤية

بناء نظام تشغيل للميزانية وليس مجرد شات بوت.

## 4. أهداف المنتج

### الأهداف الأساسية

1. تقليل زمن إنشاء أول مسودة ميزانية
2. رفع قابلية التفسير
3. توحيد العمل بين الأقسام
4. إدارة إصدارات الميزانية
5. مقارنة السيناريوهات
6. ربط الميزانية بالمصروفات الفعلية
7. تكييف المنطق مع السوق المصري

## 5. ما ليس ضمن النطاق في الإصدار الأول

- نظام رواتب كامل
- توقيع عقود إلكتروني
- جدولة تصوير تفصيلية بديلة للأنظمة المتخصصة
- ERP محاسبي كامل

## 6. المستخدمون الأساسيون

- المنتج / المنتج المنفذ
- مدير الإنتاج
- المحاسب / المدير المالي
- مسؤول المشتريات
- قارئ النص / منسق الـ Breakdown
- الإدارة
- مدير النظام

## 7. مصفوفة الصلاحيات

- المنتج: إنشاء، تعديل، اعتماد
- مدير الإنتاج: إنشاء، تعديل
- المحاسب: تعديل، مراجعة، اعتماد بحسب الصلاحية
- المشتريات: عروض الأسعار
- مدير النظام: إدارة كاملة

## 8. نطاق الإصدار الأول

- متعدد المشاريع
- رفع نصوص وملفات داعمة
- تحليل النص
- Breakdown
- Draft Budget
- Budget Grid
- Rate Cards
- Vendor Quotes
- سيناريوهات متعددة
- موافقات
- Exports
- Actuals vs Budget
- سجل تدقيق
- مساعد ذكي

## 9. الرحلات الأساسية

- إنشاء ميزانية من النص
- إنشاء ميزانية من عروض أسعار وتجربة سابقة
- متابعة التنفيذ وربط actuals

## 10. الشاشات الأساسية

- Dashboard
- Project Setup Wizard
- Document Center
- Script Review
- Breakdown Workspace
- Budget Grid
- Scenario Compare
- Rate Cards
- Vendor Quotes
- Approval Inbox
- Actuals Reconciliation
- Reports & Exports
- Admin Settings

## 11. المتطلبات الوظيفية

أهم المتطلبات:

- إدارة الشركات والمستخدمين
- إنشاء المشروع وهيكله
- إدارة الوثائق
- تحليل النص
- Breakdown إنتاجي
- توليد مسودة ميزانية
- محرر ميزانية جدولي
- Rate Cards
- عروض الأسعار
- محرك الصرف والضرائب والتضخم
- توزيع التكاليف
- النسخ والسيناريوهات
- الموافقات
- Actuals مقابل Budget
- التقارير والتصدير
- المساعد الذكي
- سجل التدقيق

## 12. قواعد العمل الأساسية

- EGP العملة الأساسية افتراضيًا
- أي بند بعملة غير أساسية يجب أن يحمل FX Snapshot
- كل بند يجب أن ينتمي إلى قسم وCost Code وUnit Type
- النسخة Frozen أو Baseline غير قابلة للتعديل المباشر
- مخرجات الذكاء الاصطناعي لا تطبق نهائيًا إلا بعد Validation
- مجموع Allocations لأي بند يجب أن يساوي الإجمالي
- كل بند يحتفظ بـ provenance واضح

## 13. المتطلبات غير الوظيفية

- الأمان
- الأداء
- الاعتمادية
- القابلية للتوسع
- القابلية للتفسير
- التعريب
- القابلية للتدقيق
- القابلية للتكامل
- المراقبة
- حوكمة الذكاء الاصطناعي

## 14. بنية قاعدة البيانات

### مخططات Schemas

- identity
- master
- production
- commercial
- budget
- finance
- workflow
- ai
- audit

### الجداول الرئيسية

- tenants, users, memberships, roles
- departments, cost_codes, unit_types, tax_profiles
- projects, seasons, episodes, shooting_blocks
- documents, project_documents, script_versions, scenes, scene_breakdown_items
- vendors, vendor_quotes, vendor_quote_items, rate_cards, rate_card_items
- budgets, budget_versions, budget_line_items, line_item_assumptions, line_item_allocations, validation_issues
- exchange_rate_snapshots, cpi_indices
- actual_expense_batches, actual_expense_lines, expense_budget_links
- approval_templates, approval_instances, approval_instance_steps
- ai_sessions, ai_messages, agent_runs, agent_artifacts, document_chunks
- audit_logs

## 15. تصميم واجهات API

### مجموعات الـ Endpoints

- الهوية والإدارة
- المرجعيات
- الملفات والوثائق
- المشروع والبنية الإنتاجية
- النص والمشاهد والـ Breakdown
- الأسعار والموردون
- الميزانية
- الصرف والتضخم والضرائب
- الموافقات
- المصروفات الفعلية
- التقارير والتصدير والتدقيق
- المساعد الذكي والوكلاء

### أمثلة عمليات رئيسية

- إنشاء مشروع
- parse script
- generate breakdown
- create budget version
- generate draft
- patch budget line item
- reconcile actuals
- تشغيل وكيل
- approve/reject step

## 16. تصميم الوكلاء واحدًا واحدًا

### قائمة الوكلاء

1. context_intake
2. script_parse
3. scene_breakdown
4. budget_skeleton
5. rate_matching
6. gap_detection
7. fx_snapshot
8. tax_classification
9. allocation
10. vendor_quote_normalization
11. risk_contingency
12. actuals_reconciliation
13. permit_compliance
14. approval_brief
15. reporting_narrative

### القاعدة الموحدة لجميع الوكلاء

- مدخل موحد
- مخرج موحد
- لا كتابة مالية نهائية مباشرة
- إعادة `proposed_patches` فقط
- كل patch يمر عبر:
  - schema validation
  - business validation
  - permissions
  - audit logging

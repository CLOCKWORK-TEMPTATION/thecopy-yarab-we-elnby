# مواصفات OpenAPI + DDL + تصميم الشاشات + آلية التشغيل

## 1. OpenAPI 3.1

تم إعداد قالب أولي يعتمد على:

- `/v1`
- Bearer Auth
- `X-Tenant-Id`
- `Idempotency-Key`
- `row_version`
- ردود موحدة للنجاح والخطأ
- عمليات ثقيلة تعود بـ `202 Accepted`

## 2. عقود الوكلاء

كل وكيل يعيد:

- status
- confidence_score
- summary_ar
- questions
- proposed_patches
- artifacts
- validation_flags
- source_refs

### PatchProposal

- patch_id
- op
- target_type
- target_id
- reason_ar
- confidence_score
- payload
- source_refs

## 3. DDL المبدئي

يشمل:

- إنشاء extensions
- إنشاء schemas
- الجداول الأساسية في كل schema
- القيود والفهارس
- triggers لتحديث `updated_at` و`row_version`
- view لحساب الإجماليات
- RLS لعزل بيانات الشركات

## 4. الشاشات صفحةً صفحةً

### Dashboard

- المشاريع
- آخر الأنشطة
- التنبيهات

### Project Setup Wizard

- البيانات الأساسية
- البنية الإنتاجية
- العملة والسياسات
- القالب المرجعي

### Document Center

- رفع الملفات
- عرض الحالة
- ربط المستندات بالمشروع
- parse/reparse/archive

### Script Review

- قائمة المشاهد
- خصائص المشهد
- تقسيم ودمج وتعديل واعتماد

### Breakdown Workspace

- Coverage metrics
- جدول عناصر الـ Breakdown
- قبول/رفض/تعديل/إضافة يدوي

### Budget Grid

- الشاشة المركزية
- Grid للبنود
- المجاميع
- Validate / Recalculate / Freeze / Submit
- تعديل على مستوى الصف والخلية
- التوزيع، الافتراضات، سجل التغييرات، تطبيق patches

### Scenario Compare

- مقارنة الإصدارات والسيناريوهات
- الفروقات بالقيمة والنسبة

### Rate Cards

- إدارة الأسعار المرجعية
- إنشاء واستنساخ وتعطيل وتطبيق

### Vendor Quotes

- تطبيع عروض الأسعار
- خريطة الربط إلى Cost Codes

### Approval Inbox

- Brief الاعتماد
- approve / reject / request changes

### Actuals Reconciliation

- actual lines
- suggestions
- budget candidates
- split/manual match

### Reports & Exports

- XLSX
- PDF
- summaries
- variance explanations

### Admin Settings

- departments
- cost codes
- unit types
- tax profiles
- approval templates
- roles & permissions
- FX/CPI/AI policies

## 5. آلية التشغيل غير المتزامن

أي عملية ثقيلة تنفذ كالتالي:

1. API request
2. permission + validation
3. إنشاء `agent_run`
4. إرسال job إلى queue
5. Worker execution
6. حفظ outputs + patches + artifacts
7. تحديث الحالة
8. الواجهة تتابع التقدم

### Queue Topics

- document.parse.requested
- script.breakdown.requested
- budget.draft.requested
- budget.validate.requested
- budget.recalculate.requested
- vendor.quote.normalize.requested
- actuals.reconcile.requested
- agent.run.requested
- agent.patch.apply.requested

## 6. حالات الكيانات

- document: uploaded -> parsing -> parsed/failed -> archived
- budget version: editing -> submitted -> approved -> frozen
- line item: proposed -> active/rejected -> archived
- actual expense: unmatched -> matched/split/needs_review/ignored
- approval: pending -> in_progress -> approved/rejected/cancelled

## 7. ترتيب التنفيذ بين الفرق

### Backend

- Identity / Projects / Documents
- Script / Breakdown / Agents infra
- Budget Core
- Pricing
- Actuals
- Approvals / Audit / Exports

### Frontend

- Shell / Dashboard / Projects / Documents
- Script / Breakdown
- Budget Grid
- Scenario / Quotes / Rate Cards
- Approval / Actuals / Reports

### AI / Orchestration

- Context Intake / Script Parse / Breakdown
- Budget Skeleton / Rate Matching / Gap Detection
- FX / Tax / Allocation
- Quotes / Risk / Approval Brief / Reporting / Actuals Reconciliation

### QA

- Business Rules
- Permissions
- Integrations
- Agents

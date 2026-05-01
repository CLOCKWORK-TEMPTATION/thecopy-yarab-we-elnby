---
name: file-budget-splitter
description: مساعد تقسيم آلي للملفات قبل تجاوز سقف الأسطر، يكشف الملفات المقتربة من max-lines، يقترح facade extraction آمنة، ويرفض إضافة per-file ESLint override جديدة. فعّل قبل أي push على فرع يضيف 100 سطر أو أكثر، أو عند تعديل ملفات كبيرة معروفة (analysis.controller.ts, route-registrars.ts, db/schema.ts)، أو عند رؤية كلمات "split file", "modularize", "refactor large", "500 lines", "600 lines", "exceeds budget", "max-lines override", "تقسيم ملف", "تجاوز السقف"، أو عند pre-commit يعرض warning عن الحجم. لا تفعّل لمراجعة كود عامة، ولا لاقتراح بنية معمارية جديدة.
---

# File Budget Splitter

## الأدلة المؤسِّسة من سجل المستودع

ثلاث طلبات سحب متتالية لنفس المشكلة:

```text
PR #25 — refactor: modularize large files to respect 500-line budget
PR #26 — Refactor large files (<500 lines constraint)
PR #28 — refactor: comply with 500-lines-per-file budget
```

استثناءات تتراكم بدلاً من التقسيم. في:

```text
apps/backend/eslint.config.js
```

يوجد override:

```text
files: [
  "src/db/schema.ts",
  "src/server/route-registrars.ts",
  "src/controllers/analysis.controller.ts",
],
rules: { "max-lines": "off" }
```

و commit صريح يعترف بالاستسلام للاستثناء:

```text
b490aef fix: add analysis.controller.ts to max-lines per-file ESLint override
4201d88 refactor(analysis-controller): extract helpers to satisfy max-lines
```

تضارب عتبات بين سكريبتين:

```text
scripts/check-file-line-budget.mjs   → MAX_LINES = 600
scripts/find-large-files.mjs         → MAX_LINES = 500
```

و القاعدة الفعلية في eslint.config.js:

```text
"max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }]
"max-lines-per-function": ["error", { max: 120 }]
```

## السلوك المرفوض

إضافة ملف جديد إلى override list، رفع MAX_LINES في أي من السكريبتين، إخراج helper إلى ملف جديد فارغ من المنطق لمجرد تخفيض العداد، تقسيم ميكانيكي يكسر cohesion ويرفع الـ coupling.

## السلوك المقبول

Facade extraction مع منطق متماسك، تقسيم حسب bounded context، استخراج types و schemas إلى ملف منفصل عند تجاوز 30 بالمئة من حجم الملف، استخراج error handlers و response formatters إلى مساعدات مشتركة.

## خطوات التنفيذ

### S1 — كشف الملفات المهددة

تشغيل:

```text
node scripts/check-file-line-budget.mjs --threshold=540
node scripts/find-large-files.mjs
```

ودمج النتائج لإخراج قائمة بالملفات بين 540 و 600 سطر.

### S2 — توحيد العتبتين

سياسة موحّدة:

```text
warn  ≥ 540 lines
error ≥ 600 lines
```

تُكتَب في:

```text
scripts/check-file-line-budget.mjs
scripts/find-large-files.mjs
```

دون لمس eslint.config.js إلا بعد توافق صريح.

### S3 — اقتراح خطة تقسيم لكل ملف

لكل ملف أعلى من 540 سطر:

تحديد bounded contexts داخله، اقتراح أسماء ملفات helper، التأكد أن كل helper جديد لن ينخفض تحت 50 سطر بدون منطق.

### S4 — تنفيذ التقسيم بدون إضعاف الفحوصات

ممنوع:

تعطيل أي rule من mechanicalContractRules، إضافة override جديدة في:

```text
apps/backend/eslint.config.js
```

أو في eslint.config.js الخاص بأي حزمة فرعية، تخفيف complexity أو max-depth أو max-params.

مسموح:

استخراج helpers إلى أقسام جديدة، تقسيم الملف إلى ملفات أصغر مع index.ts re-export، نقل types إلى packages/copyproj-schema عند الاحتياج المتقاطع.

### S5 — تشغيل الفحص بعد التقسيم

إلزامي:

```text
pnpm --filter @the-copy/backend lint
pnpm --filter @the-copy/web lint
node scripts/check-file-line-budget.mjs
node scripts/find-large-files.mjs
```

ولا تُغلق الجولة بدون تنفيذ فعلي.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### File Budget Split — جولة <رقم>
```

يحتوي:

قائمة الملفات قبل التقسيم بأطوالها، خطة التقسيم لكل ملف، الـ helpers المستخرَجة، نتيجة تشغيل الفحوصات بعد التقسيم.

## معيار الإغلاق

لا ملف جديد في override، لا رفع لعتبة في أي سكريبت، تشغيل فعلي للفحوصات نجح، عدد الملفات بين 540 و 600 سطر تناقص ولم يزد.

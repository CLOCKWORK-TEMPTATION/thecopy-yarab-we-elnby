---
name: eslint-contract-stabilizer
description: يثبت طبقة contract-based ESLint و TypeScript في المستودع، يمنع إعادة هيكلة جديدة لطبقة الجودة بدون مبرر contractual صريح، ويحرس mechanicalContractRules ضد التخفيف. فعّل عند تعديل eslint.config.js أو tsconfig.check.json أو scripts/quality أو scripts/agent، أو عند رؤية كلمات "lint contract", "type-check contract", "MCP profile", "centralized lint", "consolidate eslint", "إعادة هيكلة طبقة الجودة"، أو عند فتح PR على refactor(quality). لا تفعّل لإصلاح خطأ lint منفرد، ولا لإعداد ESLint من الصفر لمشروع آخر.
---

# ESLint Contract Stabilizer

## الأدلة المؤسِّسة من سجل المستودع

عشر commits لإعادة هيكلة نفس الطبقة:

```text
refactor(quality): migrate to contract-based lint/type-check with runtime abstraction
refactor(quality): migrate lint/type-check to contract-based scripts and enforce CI quality gates
refactor(backend): migrate eslint contract config to isolated compilation context
refactor(backend): replace fragmented lint configs with centralized MCP profiles
refactor(backend): consolidate TypeScript contract configurations into unified schema
refactor(config): consolidate TypeScript contract configurations and remove legacy eslint templates
chore(backend): replace eslint contract config for ocr preprocessor
chore(backend): replace global typings config with memory variant
perf(backend): unify TypeScript lint configurations with centralized profile strategy
refactor(backend): replace legacy contract configs with dedicated contract profiles
```

النمط: كل دفعة تعيد توحيد ما تم توحيده في سابقتها، بدون تثبيت تعاقدي يمنع الموجة التالية.

## القاعدة الأعلى

من AGENTS.md و OPERATING-CONTRACT.md:

ممنوع تخفيف أي قاعدة في:

```text
mechanicalContractRules
```

التي تشمل:

```text
"@typescript-eslint/no-explicit-any": "error"
"@typescript-eslint/no-floating-promises": "error"
"@typescript-eslint/no-misused-promises": "error"
"@typescript-eslint/no-unsafe-argument": "error"
"@typescript-eslint/no-unsafe-assignment": "error"
"@typescript-eslint/no-unsafe-call": "error"
"@typescript-eslint/no-unsafe-member-access": "error"
"@typescript-eslint/no-unsafe-return": "error"
complexity: ["error", { max: 20 }]
"import/no-unresolved": "error"
"max-depth": ["error", 4]
"max-lines": ["error", { max: 600 }]
"max-lines-per-function": ["error", { max: 120 }]
"max-params": ["error", 5]
"no-console": "error"
"unused-imports/no-unused-imports": "error"
```

## الملفات الحاكمة

```text
apps/backend/eslint.config.js
apps/web/eslint.config.js
apps/web/src/app/(main)/editor/eslint.config.js
scripts/quality/eslint-contract.mjs
scripts/quality/eslint-deterministic-list.mjs
scripts/quality/eslint-sort-select.mjs
scripts/quality/typecheck-contract.mjs
scripts/quality/check-function-length.ts
scripts/quality/guard-budgets.mjs
scripts/quality/guard-staged.mjs
```

## السلوك المرفوض

إنشاء eslint.config.js محلي جديد في حزمة فرعية بدون تبرير contractual صريح. تعطيل أي rule من mechanicalContractRules. إضافة override جديد في per-file overrides. تخفيض complexity أو max-depth أو max-params أو رفع max-lines. تحويل error إلى warn. إضافة eslint-disable-next-line بدون سبب موثّق فوقها مباشرة.

## السلوك المقبول

تعديل سياسة contract داخل:

```text
scripts/quality/eslint-contract.mjs
```

مع توثيق صريح في الـ commit message وفي:

```text
.repo-agent/OPERATING-CONTRACT.md
```

و إثبات أن التعديل لا يُضعف أي فحص قائم.

## فحوصات إلزامية

### E1 — لا تخفيف لـ mechanicalContractRules

```text
ripgrep -nP "@typescript-eslint/no-(explicit-any|floating-promises|misused-promises|unsafe-)" \
  apps packages
```

أي ظهور بمستوى warn أو off خارج tests يُرفض.

### E2 — لا eslint.config.js جديد بدون مبرر

```text
git diff --name-only origin/main...HEAD | ripgrep "eslint\.config\.(js|mjs|cjs)$"
```

أي إضافة لـ eslint.config جديد تستوجب تبريراً في PR description.

### E3 — لا تخفيف لـ complexity أو max-depth أو max-params

```text
ripgrep -nP "complexity:\s*\[?\"warn|max-depth.*\"warn|max-params.*\"warn" apps packages
```

أي تخفيف يُرفض.

### E4 — eslint-disable يحمل تبريراً مباشراً فوقه

```text
ripgrep -nB1 "eslint-disable" apps packages
```

كل eslint-disable أو eslint-disable-next-line يجب أن يسبقه تعليق سطر سبب.

### E5 — تشغيل فعلي للعقد

```text
pnpm agent:verify
```

هو الوحيد الذي يُغلق الجولة. قراءة الملفات لا تكفي.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### ESLint Contract Stability — جولة <رقم>
```

يحتوي:

التغييرات على eslint.config أو scripts/quality، مقارنة قبل و بعد لـ mechanicalContractRules، نتيجة pnpm agent:verify، إثبات عدم إضافة eslint.config جديد إلا بتبرير.

## معيار الإغلاق

mechanicalContractRules نفسها أو أصرم، لا ملف eslint.config جديد بدون توثيق، نتيجة pnpm agent:verify نجحت، نتيجة pnpm --filter ... lint نجحت لكل تطبيق وحزمة معدّلة.

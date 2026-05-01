---
name: e2e-production-readiness-runner
description: يفرض تشغيلاً فعلياً لـ Hybrid Production Audit و verify:runtime و doctor قبل فتح PR على فروع e2e أو production-readiness، يطلب proof of execution كحقيقة في الـ brief، ويمنع فتح PR ثاني لنفس الفرع بدون دليل. فعّل عند فتح أو تحديث PR على فرع يحتوي codex/e2e أو production-readiness، أو عند رؤية كلمات "e2e production", "production readiness", "hybrid audit", "Trivy", "ZAP baseline", "smoke test", "deploy check", "جاهزية الإنتاج"، أو عند تشغيل scripts/qa أو scripts/security. لا تفعّل لكتابة اختبار e2e جديد، ولا لتشخيص فشل deployment.
---

# E2E Production Readiness Runner

## الأدلة المؤسِّسة من سجل المستودع

ثلاث طلبات سحب لنفس الفرع:

```text
PR #30 — codex/e2e-production-readiness — تحسينات شاملة: إضافة اختبارات E2E
PR #31 — codex/e2e-production-readiness
PR #32 — codex/e2e-production-readiness
```

و إصلاحات بنيوية وسط الجولة:

```text
e4fbc18 إصلاح 5 issues بنيوية في Hybrid Production Audit
a6bba9a إصلاح 5 مشاكل بنيوية في الـ Hybrid Production Audit
```

النمط:

PR يُفتح بدون تشغيل فعلي للعقد التحقّقي، فيُكتشف فشل بنيوي، فيُغلق PR ويُفتح آخر، وهكذا ثلاث مرات.

## الملفات الحاكمة

```text
.github/workflows/hybrid-production-audit.yml
.github/workflows/security-audit.yml
.github/workflows/blue-green-deployment.yml
scripts/hybrid-audit.js
scripts/qa/run-all-foundation-tests.js
scripts/qa/run-e2e-tests.js
scripts/qa/run-integration-tests.js
scripts/security/trivy-scan.sh
scripts/security/zap-baseline.sh
```

## السلوك المرفوض

فتح PR على فرع production-readiness أو e2e بدون:

تشغيل فعلي لـ:

```text
pnpm verify:runtime
pnpm run doctor
node scripts/hybrid-audit.js
```

و إرفاق نتيجة كل واحد منها في PR description. فتح PR ثاني لنفس الفرع لإصلاح فشل كان يُكشَف محلياً بسهولة. الاعتماد على CI كأول مكان لاكتشاف الفشل.

## السلوك المقبول

قبل فتح PR، تُنفَّذ المراحل التالية بالترتيب وتُسجَّل:

```text
M1 — pnpm agent:bootstrap
M2 — pnpm verify:runtime
M3 — pnpm run doctor
M4 — node scripts/hybrid-audit.js
M5 — pnpm --filter @the-copy/web build
M6 — pnpm --filter @the-copy/backend build
M7 — node scripts/qa/run-all-foundation-tests.js
```

كل مرحلة يجب أن تنتج log قابل للإلصاق.

## brief PR إلزامي

كل PR على فرع production-readiness أو e2e يجب أن يحوي قسماً باسم:

```text
## Proof of Execution
```

يحتوي بالنص:

```text
M1: <نتيجة>
M2: <نتيجة>
M3: <نتيجة>
M4: <نتيجة>
M5: <نتيجة>
M6: <نتيجة>
M7: <نتيجة>
```

و رابط أو نص قصير للـ logs الكاملة.

## فحوصات إلزامية

### R1 — الفرع يحمل الاسم الصحيح

```text
git rev-parse --abbrev-ref HEAD | ripgrep -P "(codex/e2e|production-readiness|production-security)"
```

إن طابق: تطبَّق المهارة. إن لم يطابق: تُرفض المهارة بأنها خارج النطاق.

### R2 — لا تكرار لنفس الفرع

```text
gh pr list --head <branch> --state all
```

عدد النتائج يجب أن يكون 0 أو 1. إن كان 2 أو أكثر: تُرفض الجولة وتُجبَر مراجعة عميقة.

### R3 — Hybrid Audit ينجح محلياً

```text
node scripts/hybrid-audit.js --pr-mode=local
```

لا يكفي قراءة الـ workflow. التشغيل الفعلي إلزامي وفق قاعدة AGENTS.md.

### R4 — اختبارات foundation و integration و e2e كلها مرّت

```text
node scripts/qa/run-all-foundation-tests.js
node scripts/qa/run-integration-tests.js
node scripts/qa/run-e2e-tests.js
```

كل log يُرفَق في PR.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### E2E Production Readiness — جولة <رقم>
```

يحتوي:

اسم الفرع، عدد PRs السابقة لنفس الفرع، نتائج M1 إلى M7، حالة Trivy و ZAP، خطة الإصلاح إن فشل أي مرحلة.

## معيار الإغلاق

كل من M1 إلى M7 نجح فعلياً، Hybrid Audit المحلي نجح، PR description يحتوي Proof of Execution كاملاً، لا PR ثاني لنفس الفرع في نفس اليوم.

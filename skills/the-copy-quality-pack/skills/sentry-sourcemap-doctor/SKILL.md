---
name: sentry-sourcemap-doctor
description: مشخّص لإعدادات Sentry sourcemaps في apps/web يغلق دوّامة fixes متكررة لتحذيرات Sentry CLI، يحدد السبب الجذري بين assets vs filesToInject vs hideSourceMaps، ويفرض السياسة النهائية في next.config و sentry.client.config و sentry.server.config. فعّل عند ظهور تحذير Sentry CLI، أو عند تعديل sentry config، أو عند رؤية كلمات "Sentry warning", "sourcemap", "source map", "release artifacts", "Sentry CLI", "hideSourceMaps", "uploadSourceMaps", "حل تحذير Sentry", أو عند فتح PR على fix/sentry-sourcemaps-*. لا تفعّل لإعداد Sentry من الصفر، ولا لتشخيص حوادث Sentry production.
---

# Sentry Sourcemap Doctor

## الأدلة المؤسِّسة من سجل المستودع

سلسلة طلبات سحب و fixes متتالية لنفس النقطة:

```text
PR #22 — Fix/sentry sourcemaps root
PR #23 — Fix/sentry sourcemaps root
fix(web): force source map generation to eliminate Sentry CLI warnings
fix(web): resolve Sentry sourcemap warnings with sourcemaps.assets and remove warning suppression
fix(web): secure logger environment variable access and finalize sourcemap policy
refactor(web): consolidate proxy configuration and enforce sourcemap generation
```

النمط المرصود:

كل دفعة fix تعيد فتح نفس المشكلة بسبب تكوين موزّع بين ثلاثة ملفات على الأقل، وإغراء استخدام:

```text
hideSourceMaps: true
```

كحل سهل يسكت التحذير بدون حلّه.

## نطاق الفحص

```text
apps/web/next.config.mjs
apps/web/sentry.client.config.ts
apps/web/sentry.server.config.ts
apps/web/sentry.edge.config.ts
apps/web/instrumentation.ts
apps/web/instrumentation-client.ts
```

و أي ملف يستورد:

```text
@sentry/nextjs
@sentry/cli
withSentryConfig
```

## السلوك المرفوض

تفعيل:

```text
hideSourceMaps: true
```

كحل لتحذير. تعطيل التحذير عبر:

```text
errorHandler: () => {}
silent: true
```

بدون حل السبب. إخفاء assets عبر gitignore وحدها بدلاً من سياسة الرفع. تكرار حل سبق رفضه في commit سابق.

## السلوك المقبول

سياسة موحّدة في:

```text
withSentryConfig
```

تستخدم الخيارات الحديثة:

```text
sourcemaps: {
  assets: ['.next/**/*.js', '.next/**/*.js.map'],
  ignore: ['node_modules/**'],
  deleteSourcemapsAfterUpload: true
}
```

و رفع release artifacts عبر:

```text
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

في pipeline CI، لا في .env.local.

## خطوات التشخيص

### D1 — جمع التحذير الفعلي

طلب الـ stderr الكامل من آخر build فاشل أو محذّر:

```text
pnpm --filter @the-copy/web build 2>&1 | tee /tmp/sentry-build.log
ripgrep -nP "Sentry CLI|sourcemap|source map" /tmp/sentry-build.log
```

و تحديد التحذير الدقيق وفئته:

```text
A — assets pattern لا يطابق
B — filesToInject مفقود
C — release غير معرّف
D — auth token غير صالح
E — sourcemap غير مولَّد أصلاً
```

### D2 — تحديد السبب الجذري

لكل فئة:

```text
A → فحص sourcemaps.assets glob ضد build output
B → فحص next.config webpack sourceMap setting
C → فحص release: process.env.SENTRY_RELEASE
D → فحص SENTRY_AUTH_TOKEN في pipeline
E → فحص productionBrowserSourceMaps في next.config
```

### D3 — تطبيق الإصلاح في مكان واحد

كل تعديل يجب أن يكون في next.config.mjs أو في sentry.config.ts، لا في كليهما، لتجنّب التكوين المزدوج الذي سبّب re-opening.

### D4 — توثيق السياسة في commit message

كل تعديل يستوجب:

ذكر التحذير الأصلي بنصه، ذكر الفئة من D1، ذكر الحل المطبَّق مع رفض ضمني صريح للحلول السهلة.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### Sentry Sourcemap Doctor — جولة <رقم>
```

يحتوي:

نص التحذير الكامل، الفئة المحددة، السبب الجذري بدليل من البناء، الإصلاح المطبَّق، تأكيد عدم استخدام hideSourceMaps أو silent.

## معيار الإغلاق

```text
pnpm --filter @the-copy/web build
```

اكتمل بدون أي تحذير من Sentry CLI، sourcemaps رُفعت فعلياً إلى Sentry release جديد، لا تكرار لنفس الإصلاح في PR لاحق.

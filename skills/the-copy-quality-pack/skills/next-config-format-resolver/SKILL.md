---
name: next-config-format-resolver
description: قاعدة قرار ثابتة لاختيار صيغة next.config (ts/js/cjs/mjs) في apps/web بناءً على إصدار Next ومنصة الاستضافة وحالة استخدام require، وتمنع تحويل الصيغة دون توثيق سبب البناء الفاشل المحدد. فعّل عند تعديل next.config أو ظهور خطأ build مرتبط بالصيغة، أو عند رؤية كلمات "next.config", "ESM", "CommonJS", "transpile error", "Vercel build failed", "rename next.config", "convert next.config", أو عند فتح PR على apps/web يلمس next.config. لا تفعّل لإعداد Next.js من الصفر، ولا لتعديلات لا تمس next.config.
---

# Next Config Format Resolver

## الأدلة المؤسِّسة من سجل المستودع

ثلاث تحويلات لنفس الملف في فترة قصيرة:

```text
fix(web): convert next.config.ts to next.config.js to resolve Vercel transpile error
fix(web): rename next.config.js to next.config.cjs for CommonJS compatibility
fix(web): convert to next.config.mjs (ES module) for Next.js 16 compatibility
```

كل تحويل أُنجز بسبب خطأ build فعلي، لكن الانتقال من صيغة إلى أخرى تم بدون قاعدة قرار موثّقة، فعاد المشروع إلى نقطة قريبة من البداية.

## قاعدة القرار النهائية

### الحالة A — Next 14 على Vercel

```text
next.config.mjs
```

ESM افتراضي، يدعم top-level await، يتوافق مع withSentryConfig الحديث.

### الحالة B — Next 14 مع plugins تتطلب CommonJS require

```text
next.config.cjs
```

ESM لا يسمح بـ require synchronous بدون createRequire. الـ cjs يحلّ ذلك بدون workaround.

### الحالة C — Next 15 على Vercel

```text
next.config.mjs
```

نفس A. لا تستخدم next.config.ts إلا إذا كان Next 15.0+ ومع تفعيل الميزة التجريبية.

### الحالة D — Next 16 على Vercel أو غيرها

```text
next.config.mjs
```

إلزامي. حسب commit:

```text
fix(web): convert to next.config.mjs (ES module) for Next.js 16 compatibility
```

### الحالة E — Next.js TypeScript config

```text
next.config.ts
```

مسموح فقط في:

```text
Next 15.3+
package.json: "type": "module"
لا يوجد plugin يستدعي require synchronous
```

أي خروج عن هذا الشرط يجبر التحويل إلى mjs.

## السلوك المرفوض

تحويل الصيغة بدون commit يحمل:

```text
خطأ البناء الكامل
الحالة المنطبقة من A إلى E
السبب الذي أوصلنا للحالة الجديدة
```

تحويل تجريبي بدون اختبار build فعلي بعدها. تكرار تحويل سبق رفضه.

## السلوك المقبول

قبل أي تحويل:

```text
S1 — تحديد إصدار Next الحالي:
     pnpm --filter @the-copy/web list next
S2 — تحديد منصة الاستضافة الفعلية
S3 — جرد plugins التي قد تستخدم require
S4 — مطابقة الحالة مع A إلى E
S5 — تنفيذ التحويل + تشغيل build فعلي
S6 — توثيق القرار في commit message
```

## فحوصات إلزامية

### N1 — صيغة واحدة فقط في المستودع

```text
ripgrep --files apps/web | ripgrep "^apps/web/next\.config\.(ts|js|cjs|mjs)$"
```

عدد النتائج يجب أن يكون 1 بالضبط. أي تكرار خطأ.

### N2 — type في package.json متوافق

```text
ripgrep -nP "\"type\":\s*\"module\"" apps/web/package.json
```

إذا الصيغة mjs أو ts: type=module مطلوب أو محايد. إذا الصيغة cjs: type لا يكون module.

### N3 — لا workaround لـ require في mjs

```text
ripgrep -nP "createRequire\(import\.meta\.url\)" apps/web/next.config.mjs
```

إذا وُجد: مؤشر على اختيار الصيغة الخاطئ. الأنسب التحويل إلى cjs.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### Next Config Format — جولة <رقم>
```

يحتوي:

إصدار Next الحالي، منصة الاستضافة، الـ plugins ذات الأثر، الحالة المختارة من A إلى E مع تبرير، نتيجة build بعد التطبيق.

## معيار الإغلاق

ملف next.config واحد فقط، الصيغة تطابق الحالة من A إلى E، نتيجة:

```text
pnpm --filter @the-copy/web build
```

نجح بدون transpile error، commit message يوثّق القرار.

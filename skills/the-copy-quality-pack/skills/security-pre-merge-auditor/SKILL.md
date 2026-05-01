---
name: security-pre-merge-auditor
description: مفتش أمني يعمل قبل فتح أو تحديث طلب السحب على apps/backend/src/controllers أو apps/web/src/lib/api.ts، ويفحص خمس فئات ثغرات سبق رصدها في commits المستودع (session identity، CSRF، حشو إنتروبيا غير آمن، غياب Zod، أنماط ReDoS). فعّل عند أي تعديل على controller أو route handler أو middleware أو api client، وقبل فتح PR على فروع تلامس مسارات auth أو session أو analysis أو breakdown، أو عند رؤية كلمات "session"، "identity"، "auth"، "csrf"، "crypto"، "uuid"، "regex"، "validate body"، "secure endpoint"، أو ذكر صريح للقاعدة الحاكمة في AGENTS.md حول الفحوصات الأمنية. لا تفعّل المهارة لمراجعة كود عامة (استخدم code-quality-inspector) ولا لإصلاحات أمنية بعد الإنتاج (استخدم engineering:incident-response).
---

# Security Pre-Merge Auditor

## الأدلة المؤسِّسة من سجل المستودع

```text
c82b713 Fix: Public analysis sessions derived user identity solely from IP+UserAgent,
        allowing users on same network with same browser to hijack each other's
        sessions and access/modify analysis data
b8022ce fix(schema): type-safe access to Web Crypto for UUID generation
fix(security): unblock CodeQL workflow + harden JSON extraction against ReDoS
fix(breakapp): use crypto.randomBytes for invited-user id (CodeQL js/insecure-randomness)
fixup: csrf in analysis api.ts, untrack .replit, RTL: real DOCX + honest PDF downgrade
chore(security): resolve Trivy postcss CVE + tighten Semgrep auth-token rule
```

PR #34 أضاف لاحقاً طبقتين دفاعيتين:

```text
apps/web/src/components/auth/AuthGuard.tsx
apps/web/src/components/shared/SecurityGuard.tsx
```

النمط واضح: الكشف يأتي من CodeQL أو Trivy أو Semgrep أو من حادثة إنتاج فعلية، بعد الدمج لا قبله. هذه المهارة تنقل نقطة الكشف إلى ما قبل فتح طلب السحب.

## النطاق المشمول بالفحص

ملفات الدخول والمخرج في apps/backend:

```text
apps/backend/src/controllers/**/*.ts
apps/backend/src/middleware/**/*.ts
apps/backend/src/server/**/*.ts
apps/backend/src/modules/**/routes.ts
apps/backend/src/services/**/*.service.ts
```

ملفات سطح الـ api في apps/web:

```text
apps/web/src/lib/api.ts
apps/web/src/lib/api/**/*.ts
apps/web/src/app/(main)/**/lib/api.ts
```

## فحوصات إلزامية

### F1 — هوية الجلسة لا تُشتق من IP و UserAgent فقط

البحث:

```text
ripgrep -nP "req\.(ip|headers\['user-agent'\]|headers\.get\('user-agent'\))" \
  apps/backend/src
```

السلوك المرفوض:

دمج req.ip مع req.headers['user-agent'] لتكوين معرّف جلسة عام. هذا هو النمط الذي سمح بالاختطاف في commit c82b713.

السلوك المقبول:

اعتماد session token موقّع، أو معرّف عشوائي مرتبط بـ httpOnly cookie آمن، أو معرّف مستخدم مصادَق عليه مباشرة.

### F2 — إنتروبيا آمنة لكل المعرّفات الحساسة

البحث:

```text
ripgrep -nP "(Math\.random|Date\.now\(\).*toString\(36\)|Math\.floor\(Math\.random)" \
  apps/backend/src apps/web/src/lib
```

السلوك المرفوض:

استخدام Math.random أو Date.now أو أي مولّد غير مشفّر لتوليد معرّفات تظهر في URLs أو cookies أو JWT أو invitation links.

السلوك المقبول:

```text
crypto.randomBytes
crypto.randomUUID
Web Crypto getRandomValues
```

كما طبّق commit:

```text
fix(breakapp): use crypto.randomBytes for invited-user id
```

### F3 — Web Crypto بوصول آمن من حيث النوع

البحث:

```text
ripgrep -nP "globalThis\.crypto|window\.crypto|(self|global)\.crypto" \
  apps/backend/src apps/web/src apps/web/src/app packages
```

السلوك المرفوض:

الوصول لـ globalThis.crypto بدون type guard، مما يكسر:

```text
exactOptionalPropertyTypes
```

ويولّد TS2345 كما حدث في:

```text
fix(schema): type-safe access to Web Crypto for UUID generation
```

السلوك المقبول:

استخدام helper موحّد من:

```text
@the-copy/copyproj-schema
```

أو wrapper يُجري check على وجود crypto و randomUUID قبل الاستدعاء.

### F4 — CSRF token مفروض على كل request مغيّر للحالة

البحث:

```text
ripgrep -nP "fetch\(|axios\.(post|put|patch|delete)|method:\s*['\"](POST|PUT|PATCH|DELETE)['\"]" \
  apps/web/src/lib/api.ts apps/web/src/app/(main)/analysis/lib/api.ts
```

السلوك المرفوض:

أي PUT أو POST أو PATCH أو DELETE في apps/web يخرج بدون header:

```text
X-CSRF-Token
```

أو ما يكافئها وفق السياسة الحالية. حادثة fixup csrf in analysis api.ts كشفت عن endpoint بُني بدون هذا الفحص.

السلوك المقبول:

اعتماد client مركزي يُحقن منه الـ csrf token تلقائياً، ورفض أي fetch مباشر يلتف على هذا الـ client.

### F5 — كل req.body و req.query و req.params تمر بـ Zod schema

البحث:

```text
ripgrep -nP "req\.(body|query|params)\b" \
  apps/backend/src/controllers apps/backend/src/modules
```

السلوك المرفوض:

الوصول إلى req.body بدون schema.safeParse أو schema.parse من:

```text
@the-copy/copyproj-schema
```

كما رصد commit:

```text
fix: use Zod for req.body parsing in BreakdownSessionsController.createSession
```

السلوك المقبول:

كل handler يبدأ بـ schema validation. ملاحظة: مهارة zod-controller-boundary-enforcer تتولى هذا الفحص بعمق أكبر، وهذه المهارة تكتفي بكشف الانتهاك السطحي.

### F6 — أنماط Regex خالية من ReDoS

البحث:

```text
ripgrep -nP "new RegExp\(|\.match\(|\.replace\(/" \
  apps/backend/src apps/web/src
```

السلوك المرفوض:

أي regex يحتوي:

```text
nested quantifiers          مثل (a+)+
catastrophic backtracking   مثل (.*)*
overlapping alternatives    مثل (a|a)*
```

كما عالج commit:

```text
fix(security): unblock CodeQL workflow + harden JSON extraction against ReDoS
```

السلوك المقبول:

استخدام parsers مخصصة، أو wrapping الـ regex بـ timeout، أو re-write الـ pattern لتجنّب backtracking.

## مخرجات المهارة

تقرير نصي يُوضع في:

```text
output/round-notes.md
```

ضمن قسم باسم:

```text
### Security Pre-Merge Audit — جولة <رقم>
```

يحتوي:

عدد الانتهاكات في كل فئة من F1 إلى F6، مسارات الملفات المنتهكة، الـ commit المرجعي الذي يثبت أن النمط حدث من قبل، خطة إصلاح بدون إضعاف أي فحص قائم.

## معيار الإغلاق

لا تُغلق الجولة إلا عند تحقق ثلاثة شروط:

كل فحص من F1 إلى F6 شُغّل فعلياً وليس قراءة فقط، عدد الانتهاكات صفر أو موثّق بـ exception موافَق عليه صراحة، تشغيل:

```text
pnpm agent:verify
```

نجح بعد إنهاء التعديلات.

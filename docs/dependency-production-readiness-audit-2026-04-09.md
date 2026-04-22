# تقرير فحص التبعيات — جاهزية إنتاج

تاريخ الفحص: 2026-04-09 (UTC)

## 1) ملخص تنفيذي حاسم

الحالة الحالية **مقبولة إنتاجيًا بشكل مشروط**:
- لا يوجد انكسار واضح في اقتران Next.js/React/React DOM داخل مساحة العمل الأساسية (web + ui + breakapp).
- يوجد دين تقني فعلي في **اتساق أدوات الاختبار والرصد والتايب سكربت** بين الحزم، وبعضه ظاهر كـ deprecation في lockfile.
- أقل batch ترقيات آمنة الآن (دون فتح موجة تغييرات واسعة):
  1. توحيد نطاق TypeScript في `apps/backend` إلى نفس خط مساحة العمل (`^5.9.3`).
  2. توحيد نطاق TypeScript في `apps/web` إلى نفس خط مساحة العمل (`^5.9.3`).

قرار حاسم: لا يُنصح بأي sweep شامل. الترقية المحدودة أعلاه فقط هي التي تحقق قيمة تشغيلية مباشرة بأقل مخاطر.

> قيد بيئي مثبت: الاستعلام المباشر عن npm registry محجوب في هذه البيئة (403)، لذلك الحكم هنا مبني على **الحالة الفعلية داخل المستودع** (manifests + lockfile + deprecations المسجلة) وليس مقارنة شاملة مع أحدث إصدار على الإنترنت.

---

## 2) جدول الجرد الأساسي

| الحزمة | الإصدار الحالي في المستودع | الموقع | درجة الأهمية | الملاحظة |
|---|---:|---|---|---|
| next | 16.1.7 | `apps/web`, `packages/ui`, `packages/breakapp` | حرجة | متسق عبر الوحدات التي تعتمد Next. |
| react | ^19.2.1 (dev في ui/breakapp), ^19.2.1 (dep في web) | `apps/web`, `packages/ui`, `packages/breakapp` | حرجة | متسق وظيفيًا مع React DOM؛ `peer >=18` في `ui` مقبول. |
| react-dom | ^19.2.1 | `apps/web`, `packages/ui`, `packages/breakapp` | حرجة | متسق مع React. |
| typescript | ^5.9.3 (root/shared/ui/breakapp/prompt/core-memory), ^5.7.2 (web), ^5.0.0 (backend), ^5.8.0 (mcp subprojects) | متعدد | حرجة | انحراف واضح بين حزم مساحة العمل الأساسية. |
| eslint | ^9.39.2 | `apps/web`, `apps/backend` | عالية | متسق بين web/backend. |
| @typescript-eslint/* | ^8.47.0 (web), ^8.51.0 (backend) | `apps/web`, `apps/backend` | عالية | lockfile يحسم فعليًا إلى 8.58.0؛ اختلاف النطاقات يزيد التشويش فقط. |
| tailwindcss | ^4.1.16 | `apps/web` | عالية | متسق مع `@tailwindcss/postcss` v4 وخط PostCSS 8. |
| postcss | ^8 | `apps/web` | عالية | تعريف واسع؛ lockfile يثبت فعليًا 8.5.8. |
| autoprefixer | ^10.4.16 | `apps/web` | متوسطة | ضمن خط Tailwind الحالي. |
| vitest | ^4.0.6 (root/packages), ^4.0.16 (backend), ^2.1.8 (web) | متعدد | عالية | web معزول على خط Vitest 2 بينما بقية workspace على 4. |
| @playwright/test | ^1.49.1 | `apps/web` | متوسطة | مخصص لاختبارات E2E بالويب. |
| @testing-library/react | ^16.3.0 | `apps/web`, `packages/ui` | متوسطة | متسق. |
| drizzle-orm | ^0.45.2 | `apps/web`, `apps/backend`, `packages/shared` | حرجة | متسق عبر طبقة البيانات المشتركة. |
| drizzle-kit | ^0.31.7 | `apps/backend` | عالية | مرتبط بخط `drizzle-orm` الحالي. |
| otplib | 12.0.1 (فعليًا من lockfile) | `apps/backend` | عالية | lockfile يحمل deprecation صريح يطلب v13. |
| @opentelemetry/sdk-trace-web | ^1.30.1 (dep web), ^2.2.0 (dev web), ^2.2.0 (backend) | متعدد | عالية | ازدواجية major داخل web نفسه + عدم اتساق tracing line. |
| @opentelemetry/exporter-trace-otlp-http | ^0.56.0 (dep web), ^0.208.0 (dev web/backend) | متعدد | عالية | انقسام كبير في الإصدارات قد يؤثر runtime/telemetry. |
| @sentry/nextjs / @sentry/node | 10.32.1 | `apps/web`, `apps/backend` | عالية | متقارب، lockfile حلّ backend لأحدث patch ضمن النطاق. |
| @modelcontextprotocol/sdk | ^1.26.0 (web/backend), ^1.29.0 (mcp subprojects) | متعدد | متوسطة | يوجد subprojects مع lockfile مستقل داخل مسارات OCR. |

---

## 3) جدول التوصيات

| الحزمة | الإصدار الحالي | الترقية المقترحة | النوع | مستوى المخاطر | لماذا تُقترح/لا تُقترح | migration؟ | القرار الآن |
|---|---:|---:|---|---|---|---|---|
| typescript (apps/backend) | ^5.0.0 | ^5.9.3 | minor-range alignment | منخفض | backend بالفعل يُحل إلى 5.9.3 في lockfile؛ توحيد النطاق يزيل انحرافًا غير ضروري ويثبت سلوك CI/type-check. | لا | **نفّذ الآن** |
| typescript (apps/web) | ^5.7.2 | ^5.9.3 | minor-range alignment | منخفض | web أيضًا يعمل فعليًا على 5.9.3؛ التعديل توثيقي/تشغيلي منخفض المخاطر ويمنع حلول مستقبلية متفاوتة. | لا | **نفّذ الآن** |
| vitest (apps/web) | ^2.1.8 | 4.x | major | متوسط-عالٍ | سيُوحّد خط الاختبار مع بقية workspace، لكن يتطلب مراجعة config/plugins (`@vitest/*`) وتأكيد عدم كسر smoke/config tests. | نعم (مراجعة إعدادات) | **أجّل** |
| otplib (apps/backend) | 12.0.1 | 13.x | major | عالٍ | lockfile يحمل deprecation رسمي؛ لكن major تتطلب اتباع مسار ترحيل otp API. | نعم | **أجّل (مهمة مستقلة)** |
| @opentelemetry/* في web | مزيج 0.56/0.208 و 1.30/2.2 | توحيد على خط واحد | major/multi-package | عالٍ | الوضع الحالي يحمل ازدواجية حساسة runtime vs dev؛ الإصلاح مهم لكن يحتاج اختبار tracing على client/SSR. | نعم | **أجّل (مهمة مستقلة)** |
| next/react/react-dom | next 16.1.7 + react/react-dom 19.2.x | لا تغيير | — | منخفض | الاقتران متماسك حاليًا ولا توجد ضرورة إنتاجية آنية لترقية جذرية. | لا | **لا تلمسه الآن** |
| drizzle-orm + drizzle-kit | 0.45.2 + 0.31.7 | لا تغيير الآن | — | متوسط | متسق داخليًا؛ أي قفزة كبيرة ستفتح تغييرات schema/migrations خارج أقل قدر من التغييرات. | محتمل | **لا تلمسه الآن** |

---

## 4) قائمة الترقيات التي تُنفذ الآن

1. `apps/backend/package.json` — `typescript: ^5.0.0 -> ^5.9.3`
   - السبب: إزالة انحراف واضح دون تغيير فعلي في النسخة المحلولة داخل lockfile.
2. `apps/web/package.json` — `typescript: ^5.7.2 -> ^5.9.3`
   - السبب: توحيد خط الأنواع عبر workspace وتقليل احتمالات تباين CI مستقبلاً.

---

## 5) قائمة الترقيات التي يجب تأجيلها

1. ترقية Vitest في `apps/web` من 2.x إلى 4.x.
   - سبب التأجيل: تحتاج مسار تحقق إعدادات الاختبار وملحقات `@vitest/*` قبل الدمج.
2. ترقية `otplib` في backend إلى v13.
   - سبب التأجيل: deprecation مؤكد لكن الترحيل major ويتطلب تحقق وظيفي لمسار OTP.
3. توحيد OpenTelemetry line داخل `apps/web`.
   - سبب التأجيل: التغيير يطال runtime observability مباشرة ويحتاج اختبار SSR/client instrumentation.

---

## 6) قائمة المخاطر الجذرية

1. **otplib 12 -> 13 (Major):**
   - ما قد ينكسر: توليد/التحقق من رموز OTP إذا تغيرت API أو defaults.
   - ما يجب مراجعته: جميع نقاط استخدام `otplib` في auth flows.
   - الترحيل المطلوب: تطبيق مسار migration الرسمي للإصدار 13.
   - لماذا خارج أقل قدر من التغييرات: لأن أثره سلوكي أمني مباشر.

2. **توحيد OpenTelemetry في web (عدة حزم بين 0.56/0.208 و1.x/2.x):**
   - ما قد ينكسر: تصدير traces، أسماء semantic conventions، وسلوك instrumentation بالمتصفح.
   - ما يجب مراجعته: init code الخاص telemetry في client + أي SSR hooks.
   - الترحيل المطلوب: اختيار line واحد وتعديل imports/config بحسبه.
   - لماذا خارج أقل قدر من التغييرات: لأنه تغيير معماري في observability runtime.

3. **Vitest web من 2.x إلى 4.x:**
   - ما قد ينكسر: coverage config وواجهات test UI/plugins.
   - ما يجب مراجعته: سكربتات `test:config`, `test:smoke`, CI test pipeline.
   - الترحيل المطلوب: تحديث متزامن لـ `vitest`, `@vitest/ui`, `@vitest/coverage-v8` + config.
   - لماذا خارج أقل قدر من التغييرات: يتجاوز نطاق ترقية محافظة سريعة.

---

## 7) أوامر التنفيذ المقترحة (للترقيات المعتمدة الآن فقط)

```bash
pnpm --filter @the-copy/backend add -D typescript@^5.9.3
pnpm --filter @the-copy/web add -D typescript@^5.9.3
```

---

## 8) معايير القبول النهائية

بعد تنفيذ الترقيتين المعتمدتين الآن فقط، يجب تحقق التالي:

- تثبيت الحزم دون تعارضات (`pnpm install --frozen-lockfile` أو ما يكافئه في CI).
- نجاح البناء (`pnpm build`).
- نجاح فحص الأنواع (`pnpm type-check`).
- نجاح lint حيث هو معتمد (`pnpm lint`).
- عدم ظهور كسر runtime واضح في web/backend.
- بقاء المشروع أقرب لحالة **Fully Featured and Production-Ready** عبر تقليل انحرافات TypeScript دون إدخال موجة تغييرات.

---

## تصنيف النتائج الإلزامي (A/B/C/D)

### A) ترقيات آمنة موصى بها الآن
- توحيد TypeScript في `apps/backend` و`apps/web` إلى `^5.9.3`.

### B) ترقيات مؤجلة وليست أولوية
- next/react/react-dom: لا ضرورة إنتاجية فورية.
- drizzle-orm/drizzle-kit: لا ضرورة فورية ضمن نطاق تغييرات محافظة.

### C) ترقيات عالية المخاطر
- `otplib` إلى v13.
- توحيد OpenTelemetry line في web.
- Vitest web إلى 4.x.

### D) تعارضات/ديون تقنية تحتاج انتباه
- ازدواجية OpenTelemetry داخل web بين خطوط إصدارات مختلفة.
- تباين خطوط Vitest (web=2.x مقابل بقية workspace=4.x).
- lockfile يحتوي deprecations مباشرة (otplib plugins، fstream، inflight، glob/rimraf legacy عبر تبعيات عابرة).


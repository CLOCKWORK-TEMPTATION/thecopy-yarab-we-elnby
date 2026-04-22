# Frontend — The Copy

## 1) نظرة عامة

الـ`frontend/` ده تطبيق Next.js (App Router) مكتوب بـTypeScript ومسؤول عن واجهة المستخدم (RTL) وتشغيل التطبيقات/الصفحات تحت `src/app`.

النقطة المهمة: في جزء من الـAI بيتنفّذ في الواجهة (خصوصًا `breakdown`) _ممكن_ يشتغل بطريقتين:

- Proxy للـbackend لو في Backend شغال ومُعرّف له URL.
- أو تشغيل Gemini مباشرة من الواجهة في بعض السيناريوهات (زي `breakdown`) لو الـbackend مش متاح.

## 2) نقطة الدخول (Entry Points)

- Root Layout:
  - `src/app/layout.tsx`
- صفحة البداية:
  - `src/app/page.tsx`
- Layout بتاع الصفحات الأساسية:
  - `src/app/(main)/layout.tsx`
- Launcher UI:
  - `src/app/ui/page.tsx`

## 3) أهم الصفحات/المسارات

المسارات الرئيسية موجودة تحت:

- `src/app/(main)/...`

أمثلة حسب `src/config/apps.config.ts`:

- `/ui` — شاشة اختيار التطبيقات
- `/apps-overview` — عرض كل التطبيقات
- `/breakdown` — تفريغ/تحليل المشاهد
- `/analysis` — نظام المحطات السبع
- `/directors-studio` — إدارة المشاريع
- `/editor` — محرر السيناريو

## 4) Next API Routes (داخل الواجهة)

المسارات موجودة تحت:

- `src/app/api/**/route.ts`

ملاحظة مهمة من الكود نفسه:

- في routes كتير مكتوب عليها `DEPRECATED` وبتعمل Proxy للـbackend (مثال: `api/analysis/seven-stations`, `api/ai/chat`, `api/cineai/generate-shots`).

أمثلة:

- `src/app/api/analysis/seven-stations/route.ts`
  - بيعمل Proxy إلى: `${NEXT_PUBLIC_API_URL}/api/analysis/seven-stations`
- `src/app/api/ai/chat/route.ts`
  - بيعمل Proxy إلى: `${NEXT_PUBLIC_API_URL}/api/ai/chat` (Streaming)

## 5) Breakdown: تشغيل التحليل (Frontend vs Backend)

المسار:

- `src/app/api/breakdown/analyze/route.ts`

السلوك:

- لو `BACKEND_URL` مُعرّف:
  - Proxy إلى `${BACKEND_URL}/api/breakdown/analyze`
- لو مش مُعرّف:
  - بيستدعي `analyzeScene` من:
    - `src/app/(main)/breakdown/services/geminiService.ts`

التحليل داخل الواجهة (عند غياب backend) بيتكوّن من:

- `castService` لتحليل طاقم التمثيل
- - منسق بيشغّل 11 وكيل تقني بالتوازي:
  * `src/app/(main)/breakdown/services/breakdownAgents.ts`

## 6) Middleware & Security Headers

- `src/middleware.ts` بيضيف Security Headers (CSP وغيره) على مستوى Next.
- `next.config.ts` بيضيف headers إضافية + ضبط صور + تجاهل تحذيرات معروفة (OpenTelemetry/Sentry).

## 7) متغيرات البيئة

القالب:

- `.env.example`

ملف التحقق/الفصل بين server/client:

- `src/env.ts`

أمثلة متغيرات مؤثرة:

- `NEXT_PUBLIC_API_URL` — URL للـbackend (Proxy routes)
- `GEMINI_API_KEY_STAGING` / `GEMINI_API_KEY_PROD` — مفاتيح Gemini (Server-side فقط حسب `src/env.ts`)
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry على العميل

## 8) إعدادات TypeScript

- `tsconfig.json`

ملاحظة: الملف فيه `exclude` لكذا مسار (منهم `src/app/(main)/breakdown/**` وغيره)، فلو انت بتعمل type-check على المشروع كله لازم تبقى واخد بالك إن فيه أجزاء متستبعدة من الـTS build.

## 9) سكربتات التشغيل

من `frontend/package.json`:

- `pnpm dev` (على بورت 5000)
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm e2e`

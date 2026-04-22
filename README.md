# النسخة — The Copy.

منصة ويب عربية متكاملة للإبداع والإنتاج السينمائي. مستودع أحادي (Monorepo) يجمع تطبيق الويب (طبقة العرض)، الخادوم الخلفي (المسارات المؤمّنة والطوابير والعمليات المستقلة)، و7 حزم عمل مشتركة تعزل منطق الأدوات السينمائية وواجهاتها القابلة لإعادة الاستخدام.

## وضع الفرونت اند والباك إند

هذا هو الجزء المرجعي الأول في README لأن العقد بين `apps/web` و`apps/backend` هو ما يحدد كيف تُشغَّل المنصة وكيف تُفهم أعطالها.

- `apps/web` هو طبقة العرض على المنفذ `5000`، والباب الرسمي للمتصفح.
- `apps/backend` هو الجهة الخلفية الرسمية الوحيدة لمنطق الأعمال، الذكاء الاصطناعي، التخزين، المصادقة، الطوابير، والاتصال الآني.
- أي HTTP من الواجهة يجب أن يمر عبر `/api/*` في الويب أو عبر متغيرات بيئية رسمية مثل `NEXT_PUBLIC_SOCKET_URL` للاتصال الآني.
- منفذ الباك إند لا يُعامل كرقم ثابت في التوثيق. العقد الصحيح هو `PORT` من البيئة، والافتراضي في الكود هو `3001`.
- المسارات الرسمية الحالية للتطبيقات المستهدفة تمر عبر عائلات مثل `/api/app-state/*`, `/api/brainstorm`, `/api/styleist/*`, `/api/cineai/*`, `/api/breakdown/*`, `/api/projects*`, `/api/breakapp/*`.
- المسارات أو الآليات القديمة التي كانت تنفذ منطقًا إنتاجيًا داخل الويب لا تُعد مرجعًا تشغيليًا نهائيًا حتى لو ظلت موجودة كـ compatibility shim.

المرجع المفصل هنا:
- [docs/FRONTEND-BACKEND-STATE.md](docs/FRONTEND-BACKEND-STATE.md)
- [docs/API.md](docs/API.md)
- [apps/web/docs/API.md](apps/web/docs/API.md)

---

## لقطة سريعة

| الطبقة | التقنية | الإصدار | المنفذ |
|---|---|---|---|
| مدير الحزم | pnpm | 10.32.1 | — |
| تنسيق البناء | Turborepo | 2.5.0 | — |
| تطبيق الويب | Next.js + React + TypeScript | 16.1.5 / 19.2.1 / 5.x | 5000 |
| الخادوم الخلفي | Express.js + TypeScript | 5.1.0 / 5.x | `PORT` (افتراضيًا 3001) |
| قاعدة البيانات الأساسية | PostgreSQL عبر Neon + Drizzle ORM | drizzle-orm 0.44.x | — |
| قاعدة البيانات الثانوية | MongoDB | 7.0.x | — |
| الطوابير والتخزين المؤقت | Redis + BullMQ | redis 5.10.x / bullmq 5.x | 6379 |
| الاتصال الآني | Socket.io | 4.8.x | — |
| ذكاء اصطناعي — تكاملات | Vercel AI SDK + Google Genkit + LangChain | ai 6.x / genkit 1.30.x | — |
| النماذج المدعومة | Gemini + Anthropic + OpenAI + Mistral + Groq | — | — |
| محرر النصوص | Tiptap | 3.0.x | — |
| الرسوم البيانية / Three.js | @react-three/fiber + @react-three/drei | 9.5.x / 10.7.x | — |
| إدارة الحالة | Zustand + TanStack Query | 5.0.x / 5.90.x | — |
| المراقبة | Sentry + OpenTelemetry | 10.32.1 | — |
| اختبارات الوحدة | Vitest | web: 2.x / backend: 4.x | — |
| اختبارات E2E | Playwright + Cypress | 1.49.x / 15.x | — |
| طبقة المحرر الرسمية | Editor runtime مضمّن داخل `apps/backend` | — | `3001/api/*` |
| بروتوكول السياق | MCP (@modelcontextprotocol/sdk) | 1.x | — |

---

## البدء السريع

### المتطلبات

| الأداة | الإصدار المطلوب |
|---|---|
| Node.js | 24.x |
| pnpm | >= 10.0.0 |
| Docker | >= 24.x (لتشغيل الخدمات الداعمة) |
| Redis | مطلوب (أو تعطيل صريح `REDIS_ENABLED=false`) |
| PostgreSQL | إلزامي — `pnpm run infra:up` لتشغيل PostgreSQL محلياً |
| Gitleaks | مطلوب للـ pre-commit hook — راجع [فحوصات الأمان المحلية](#فحوصات-الأمان-المحلية) |
| Semgrep | اختياري محلياً — مطلوب للـ pre-push hook |

### التثبيت

```bash
# 1. استنسخ المستودع
git clone https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy.git
cd yarab-we-elnby-thecopy

# 2. انسخ ملف البيئة وعدّله بالقيم الحقيقية
cp .env.example .env

# 3. انسخ القيم المتعلقة بكل تطبيق
cp .env.example apps/web/.env
cp .env.example apps/backend/.env

# 4. ثبّت التبعيات
pnpm install
```

> **تحذير:** مفتاح `TIPTAP_PRO_TOKEN` مطلوب قبل `pnpm install` لأن `@tiptap-pro/extension-pages` يُجلب من سجل Tiptap الخاص. أضفه في ملف `.npmrc` أو كمتغير بيئة.

### تشغيل بيئة التطوير

```bash
# تشغيل الويب والخلفية معاً (الطريقة الموصى بها)
pnpm dev

# تشغيل الويب فقط (Next.js على المنفذ 5000)
pnpm dev:web

# تشغيل الخلفية فقط (Express على المنفذ المحدد في PORT)
pnpm dev:backend
```

بعد التشغيل:
- تطبيق الويب: `http://localhost:5000`
- خادوم الـ API: `http://localhost:<PORT>` حيث القيمة الافتراضية في الكود هي `3001`
- مسارات المحرر الرسمية: `http://localhost:3001/api/file-extract` و `http://localhost:3001/api/text-extract` و `http://localhost:3001/api/final-review`

### تشغيل Redis المحلي (Windows)

```bash
# يشغّل redis-server.exe المضمّن في مجلد redis/ بوضع Minimized
pnpm start:redis
```

### البناء للإنتاج

```bash
pnpm build
```

---

## فحوصات الأمان المحلية

### Gitleaks (إلزامي — pre-commit hook)

المستودع يستخدم [Gitleaks](https://github.com/gitleaks/gitleaks) كـ pre-commit hook لكشف الأسرار قبل الـ commit. التكوين في [.gitleaks.toml](./.gitleaks.toml) يمتد على القواعد الافتراضية ويضيف قواعد مخصصة لروابط قواعد البيانات والمفاتيح الخاصة.

#### التثبيت

| النظام | الأمر |
|---|---|
| Windows | `scoop install gitleaks` — أو `winget install Gitleaks.Gitleaks` |
| macOS | `brew install gitleaks` |
| Linux | `https://github.com/gitleaks/gitleaks#installing` |

#### الاستخدام

```bash
# يعمل تلقائياً قبل كل commit على الملفات المُرحَّلة
git commit ...

# فحص يدوي كامل للمستودع
pnpm security:secrets

# فحص الملفات المُرحَّلة فقط
pnpm security:secrets:staged
```

إذا لم يكن `gitleaks` مثبتًا في حالة طارئة، يمكن تجاوز الفحص محلياً بـ `SKIP_GITLEAKS=1 git commit ...` (غير موصى به).

### Semgrep (اختياري محلياً — إلزامي في pre-push و CI)

```bash
# فحص بالقواعد الصارمة فقط (ERROR — نفس ما يعمل في CI)
pnpm security:semgrep

# فحص كامل بكل الشدّات (ERROR + WARNING + INFO)
pnpm security:semgrep:all
```

التثبيت: `pip install semgrep` أو `brew install semgrep`.

### مجموعة الفحوصات الكاملة

```bash
# Gitleaks + Semgrep + pnpm audit + Trivy + ZAP baseline
pnpm security:all
```

---

## بنية المستودع

```
the-copy-monorepo/
│
├── apps/
│   ├── web/                    # تطبيق Next.js — طبقة العرض والتجميع (port 5000)
│   │   ├── src/
│   │   │   ├── app/            # App Router: صفحات، layouts، route handlers، Server Actions
│   │   │   │   ├── (main)/     # مجموعة المسارات الرئيسية (layout مشترك)
│   │   │   │   │   ├── breakdown/      # أداة تحليل السيناريو
│   │   │   │   │   ├── budget/         # أداة الميزانية
│   │   │   │   │   ├── editor/         # محرر النصوص (Tiptap + backend editor runtime عبر /api/*)
│   │   │   │   │   └── directors-studio/ # استوديو المخرجين
│   │   │   │   ├── api/        # Route Handlers — واجهات برمجية محلية أو وسيطة
│   │   │   │   ├── ui/         # مشغّل التطبيقات
│   │   │   │   └── page.tsx    # صفحة الهبوط الرئيسية
│   │   │   ├── components/     # مكونات React المشتركة
│   │   │   ├── config/         # apps.config.ts + pages.manifest.ts
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # مكتبات مساعدة
│   │   │   ├── ai/             # Genkit flows وإعدادات الذكاء الاصطناعي
│   │   │   └── env.ts          # التحقق من متغيرات البيئة (runtime)
│   │   ├── public/             # الأصول الثابتة
│   │   └── package.json        # @the-copy/web
│   │
│   └── backend/                # خادوم Express.js (port من PORT، والافتراضي 3001)
│       ├── src/
│       │   ├── server.ts       # نقطة الدخول الرئيسية — يربط المسارات والوسائط
│       │   ├── mcp-server.ts   # خادوم MCP مستقل (نقطة /mcp)
│       │   ├── bootstrap/      # تهيئة الخدمات عند البدء
│       │   ├── controllers/    # معالجات المسارات
│       │   ├── services/       # منطق الأعمال والعمال
│       │   ├── routes/         # تعريفات المسارات
│       │   ├── middleware/     # وسائط Express (auth، rate-limit، helmet)
│       │   ├── db/             # مخططات Drizzle + اتصال Neon
│       │   └── config/
│       │       └── env.ts      # التحقق من متغيرات البيئة
│       └── package.json        # @the-copy/backend
│
├── packages/                   # حزم مساحة العمل — منطق الأدوات
│   ├── shared/                 # @the-copy/shared — أنواع وأدوات مشتركة بين الويب والخلفية
│   ├── ui/                     # @the-copy/ui — مكونات واجهة قابلة لإعادة الاستخدام
│   ├── tsconfig/               # @the-copy/tsconfig — إعدادات TypeScript الأساسية المشتركة
│   ├── breakapp/               # @the-copy/breakapp — أداة تفكيك السيناريو
│   ├── cinematography/         # @the-copy/cinematography — أداة التصوير السينمائي
│   ├── core-memory/            # @the-copy/core-memory — ذاكرة النظام الأساسية
│   ├── prompt-engineering/     # @the-copy/prompt-engineering — أداة هندسة التوجيهات
│   └── tsconfig/               # @the-copy/tsconfig — إعدادات TypeScript الأساسية المشتركة
│
├── docs/                       # التوثيق المشترك
│   ├── DIRECTIVE-PLATFORM-DOCS-WRITER.md  # الأمر التوجيهي لكتابة التوثيق
│   └── adr/                    # سجلات قرارات المعمارية (Architecture Decision Records)
│
├── scripts/                    # سكربتات التشغيل والصيانة
│   ├── start-app.ps1           # يشغّل التطبيق الكامل (Windows)
│   ├── kill-ports.ps1          # يوقف المنافذ المستخدمة (Windows)
│   ├── start-ariana.ps1        # يشغّل Ariana (مراقب التتبع)
│   └── ...                     # سكربتات أمان، نشر، قاعدة بيانات
│
├── .env.example                # قالب متغيرات البيئة الموثّق
├── package.json                # تعريف الجذر + السكربتات المشتركة
├── pnpm-workspace.yaml         # تعريف حزم مساحة العمل
├── turbo.json                  # إعدادات Turborepo (pipeline البناء)
└── README.md                   # هذا الملف
```

---

## السكربتات المتاحة

### الجذر (`package.json`)

| الأمر | الوصف |
|---|---|
| `pnpm dev` | يشغّل تطبيق الويب مع الخلفية الرسمية مرة واحدة فقط عبر سكربت `@the-copy/web` |
| `pnpm dev:web` | يشغّل Next.js فقط دون الخلفية |
| `pnpm dev:backend` | يشغّل الخلفية الرسمية فقط |
| `pnpm dev:watch` | يشغّل مراقب التوثيق التلقائي (يتطلب أداة DOCCCCS محلية) |
| `pnpm dev:all` | يجمع `pnpm dev` و`pnpm dev:watch` في نفس الوقت |
| `pnpm build` | يبني جميع التطبيقات والحزم عبر Turborepo |
| `pnpm test` | يشغّل الاختبارات على جميع التطبيقات والحزم |
| `pnpm lint` | يشغّل ESLint على جميع التطبيقات والحزم |
| `pnpm type-check` | يشغّل `tsc` للتحقق من الأنواع عبر المستودع |
| `pnpm format` | يطبّق Prettier على تطبيق الويب |
| `pnpm format:check` | يتحقق من تنسيق Prettier دون تعديل |
| `pnpm validate` | `format:check` + `lint` + `type-check` + `test` مرتبة |
| `pnpm ci` | `lint` + `type-check` + `test` + `build` عبر Turborepo (للـ CI) |
| `pnpm prepush:verify` | يشغّل اختبارات التهيئة والـ smoke قبل الـ push |
| `pnpm clean` | يمسح مخرجات Turborepo و`node_modules` الجذرية |
| `pnpm start` | يشغّل `scripts/start-app.ps1` (Windows فقط) |
| `pnpm start:fresh` | يشغّل `scripts/start-app.ps1 -Fresh` لتثبيت نظيف (Windows فقط) |
| `pnpm stop` | يشغّل `scripts/kill-ports.ps1` لإيقاف المنافذ (Windows فقط) |
| `pnpm start:redis` | يشغّل `redis/redis-server.exe` محلياً في الخلفية (Windows فقط) |
| `pnpm check:exports` | يتحقق من تصديرات مكررة في الحزم |
| `pnpm audit:code` | يشغّل مدقق الكود عبر `scripts/code-auditor.ts` |
| `pnpm sentry:setup` | يهيئ Sentry عبر @sentry/wizard للمشروع |
| `pnpm ariana` | يشغّل Ariana (مراقب التتبع) للويب والخلفية معاً (Windows فقط) |
| `pnpm ariana:web` | يشغّل Ariana للويب فقط (Windows فقط) |
| `pnpm ariana:backend` | يشغّل Ariana للخلفية فقط (Windows فقط) |
| `pnpm ariana:inplace` | يشغّل Ariana في وضع InPlace (Windows فقط) |

### تطبيق الويب (`apps/web/package.json`)

| الأمر | الوصف |
|---|---|
| `pnpm --filter @the-copy/web dev` | يشغّل Next.js (webpack) + الخلفية الرسمية `apps/backend` معاً على المنفذ 5000 |
| `pnpm --filter @the-copy/web dev:next-only` | يشغّل Next.js فقط دون الخلفية |
| `pnpm --filter @the-copy/web dev:fallback` | يشغّل Next.js مع حد ذاكرة 4096MB كبديل |
| `pnpm --filter @the-copy/web genkit:dev` | يشغّل واجهة Genkit Developer UI |
| `pnpm --filter @the-copy/web genkit:watch` | يشغّل Genkit مع مراقبة التغييرات |
| `pnpm --filter @the-copy/web build` | يبني Next.js للإنتاج (`NODE_ENV=production`) |
| `pnpm --filter @the-copy/web build:production` | بناء الإنتاج مع تعطيل تحذيرات ESLint |
| `pnpm --filter @the-copy/web start` | يشغّل Next.js المبني على المنفذ 5000 |
| `pnpm --filter @the-copy/web analyze` | يبني مع `ANALYZE=true` لتحليل حجم الحزم |
| `pnpm --filter @the-copy/web lint` | يشغّل ESLint على `src/` بصفر تحذيرات |
| `pnpm --filter @the-copy/web lint:fix` | يشغّل ESLint مع الإصلاح التلقائي |
| `pnpm --filter @the-copy/web format` | يطبّق Prettier على كل الملفات |
| `pnpm --filter @the-copy/web format:check` | يتحقق من تنسيق Prettier |
| `pnpm --filter @the-copy/web type-check` | يشغّل `tsc -b` للتحقق من الأنواع |
| `pnpm --filter @the-copy/web test` | يشغّل اختبار `projectSummary` عبر Vitest |
| `pnpm --filter @the-copy/web test:config` | يشغّل اختبارات التهيئة والبيئة |
| `pnpm --filter @the-copy/web test:smoke` | يشغّل الاختبار الدخاني البسيط |
| `pnpm --filter @the-copy/web test:ui` | يفتح واجهة Vitest التفاعلية |
| `pnpm --filter @the-copy/web test:coverage` | يشغّل Vitest مع تقرير التغطية |
| `pnpm --filter @the-copy/web test:watch` | يشغّل Vitest في وضع المراقبة |
| `pnpm --filter @the-copy/web e2e` | يشغّل اختبارات Playwright E2E |
| `pnpm --filter @the-copy/web e2e:ui` | يفتح واجهة Playwright التفاعلية |
| `pnpm --filter @the-copy/web e2e:headed` | يشغّل Playwright مع إظهار المتصفح |
| `pnpm --filter @the-copy/web e2e:debug` | يشغّل Playwright في وضع التصحيح |
| `pnpm --filter @the-copy/web test:all` | `test:coverage` + `e2e` |
| `pnpm --filter @the-copy/web a11y:ci` | يشغّل اختبارات إمكانية الوصول (@a11y) |
| `pnpm --filter @the-copy/web perf:ci` | يشغّل اختبارات الأداء (@performance) |
| `pnpm --filter @the-copy/web lighthouse` | يشغّل Lighthouse CI كاملاً |
| `pnpm --filter @the-copy/web budget:check` | يتحقق من ميزانية الأداء |
| `pnpm --filter @the-copy/web budget:report` | يبني ثم يشغّل `budget:check` |
| `pnpm --filter @the-copy/web perf:analyze` | يشغّل تحليل تحسين الأداء |
| `pnpm --filter @the-copy/web perf:full` | `build` + `budget:report` + `perf:analyze` |
| `pnpm --filter @the-copy/web sentry:sourcemaps` | يرفع خرائط المصدر إلى Sentry |
| `pnpm --filter @the-copy/web prepush` | `test:config` + `test:smoke` (يعمل تلقائياً قبل الـ push) |
| `pnpm --filter @the-copy/web ci` | `lint` + `type-check` + `test` + `build` + `e2e` |

### الخادوم الخلفي (`apps/backend/package.json`)

| الأمر | الوصف |
|---|---|
| `pnpm --filter @the-copy/backend dev` | يبني TypeScript تلقائياً ويشغّل `dist/server.js` عند كل تغيير |
| `pnpm --filter @the-copy/backend dev:mcp` | يشغّل خادوم MCP مع مراقبة التغييرات عبر tsx watch |
| `pnpm --filter @the-copy/backend mcp` | يشغّل خادوم MCP مرة واحدة |
| `pnpm --filter @the-copy/backend build` | يبني TypeScript عبر `tsconfig.build.json` |
| `pnpm --filter @the-copy/backend start` | يشغّل `dist/server.js` المبني |
| `pnpm --filter @the-copy/backend test` | يشغّل جميع الاختبارات عبر Vitest |
| `pnpm --filter @the-copy/backend test:config` | يشغّل اختبار `src/config/env.test.ts` فقط |
| `pnpm --filter @the-copy/backend test:coverage` | يشغّل Vitest مع تقرير التغطية |
| `pnpm --filter @the-copy/backend test:mongodb` | يختبر الاتصال بـ MongoDB |
| `pnpm --filter @the-copy/backend lint` | يشغّل ESLint على `src/` بصفر تحذيرات |
| `pnpm --filter @the-copy/backend lint:fix` | يشغّل ESLint مع الإصلاح التلقائي |
| `pnpm --filter @the-copy/backend type-check` | يشغّل `tsc --noEmit` للتحقق من الأنواع |
| `pnpm --filter @the-copy/backend db:generate` | يولّد migrations عبر Drizzle Kit |
| `pnpm --filter @the-copy/backend db:push` | يطبّق التغييرات على قاعدة البيانات مباشرة |
| `pnpm --filter @the-copy/backend db:studio` | يفتح Drizzle Studio لاستعراض قاعدة البيانات |
| `pnpm --filter @the-copy/backend perf:setup` | يهيئ قاعدة البيانات لتحليل الأداء |
| `pnpm --filter @the-copy/backend perf:seed` | يزرع بيانات اختبار الأداء |
| `pnpm --filter @the-copy/backend perf:baseline` | يشغّل تحليل الأداء الأساسي |
| `pnpm --filter @the-copy/backend perf:apply-indexes` | يطبّق فهارس قاعدة البيانات |
| `pnpm --filter @the-copy/backend perf:post-optimization` | يشغّل تحليل الأداء بعد التحسين |
| `pnpm --filter @the-copy/backend perf:compare` | يقارن نتائج الأداء قبل وبعد |
| `pnpm --filter @the-copy/backend logs:sanitize` | ينظّف السجلات التاريخية من البيانات الحساسة |
| `pnpm --filter @the-copy/backend logs:sanitize:dry-run` | محاكاة تنظيف السجلات دون تعديل فعلي |

---

## متغيرات البيئة

المرجع الكامل هو `.env.example` الموثّق في جذر المستودع. الجدول أدناه يعرض المتغيرات المطلوبة والاختيارية المهمة.

### المتغيرات الأساسية (مطلوبة لتشغيل المشروع)

| المتغير | القيمة الافتراضية | الاستخدام |
|---|---|---|
| `NODE_ENV` | `development` | وضع التشغيل |
| `PORT` | `3001` | منفذ الخادوم الخلفي الافتراضي. يمكن تغييره محليًا من البيئة |
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/the_copy` | اتصال قاعدة البيانات الأساسية |
| `REDIS_URL` | `redis://localhost:6379` | اتصال Redis (يأخذ الأولوية على HOST/PORT) |
| `REDIS_ENABLED` | `true` | تفعيل/تعطيل Redis |
| `JWT_SECRET` | — | يجب أن يكون 32 حرفاً على الأقل في الإنتاج |
| `CORS_ORIGIN` | `http://localhost:5000,http://localhost:9002` | الأصول المسموح بها في الخلفية |
| `FRONTEND_URL` | `http://localhost:5000` | رابط تطبيق الويب |
| `GEMINI_API_KEY` | — | مفتاح Google Gemini (مزود الذكاء الاصطناعي الأساسي) |
| `GOOGLE_GENAI_API_KEY` | — | نفس قيمة `GEMINI_API_KEY` |
| `TIPTAP_PRO_TOKEN` | — | مطلوب قبل `pnpm install` لتثبيت `@tiptap-pro` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:<PORT>` | رابط الـ API (متاح للمتصفح) ويجب أن يطابق منفذ الخلفية الفعلي |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:<PORT>` | رابط الخلفية (متاح للمتصفح) ويجب أن يطابق منفذ الخلفية الفعلي |

ملاحظة:
في GitHub Actions يمكن توفير secret باسم `AI_API_KEY` كبديل لخطوات التحقق الخاصة بالنشر.
أثناء التشغيل نفسه يستمر النظام في استخدام `GEMINI_API_KEY` أو `GOOGLE_GENAI_API_KEY`.

### المتغيرات الاختيارية المهمة

| المتغير | الاستخدام |
|---|---|
| `ANTHROPIC_API_KEY` | نماذج Claude (يُستخدم عندما يكون `AGENT_REVIEW_MODEL=anthropic:*`) |
| `OPENAI_API_KEY` | نماذج GPT |
| `MISTRAL_API_KEY` | استخراج PDF عبر OCR |
| `GROQ_API_KEY` | نموذج قاضي رؤية PDF |
| `AGENT_REVIEW_MODEL` | النموذج المستخدم لمراجعة المحرر (افتراضي: `google-genai:gemini-2.5-flash`) |
| `FINAL_REVIEW_MODEL` | النموذج المستخدم للمراجعة النهائية (افتراضي: `google-genai:gemini-2.5-flash`) |
| `SENTRY_DSN` | تتبع الأخطاء (الخلفية) |
| `NEXT_PUBLIC_SENTRY_DSN` | تتبع الأخطاء (المتصفح) |
| `NEXT_PUBLIC_FIREBASE_*` | إعدادات Firebase Auth (7 متغيرات) |
| `TRACING_ENABLED` | تفعيل OpenTelemetry في الخلفية (افتراضي: `false`) |
| `NEXT_PUBLIC_TRACING_ENABLED` | تفعيل OpenTelemetry في المتصفح (افتراضي: `false`) |
| `FILE_IMPORT_PORT` | منفذ طبقة المحرر الرسمية داخل `apps/backend` (افتراضي: `3001`) |
| `PDF_EXTRACTOR_MODE` | وضع استخراج PDF (افتراضي: `mistral-script-strict`) |

التحقق من صحة متغيرات البيئة يتم في:
- `apps/web/src/env.ts` — يُشغَّل عند بدء Next.js
- `apps/backend/src/config/env.ts` — يُشغَّل عند بدء Express

---

## نقاط الدخول الرئيسية

| النمط | المسار | الوصف |
|---|---|---|
| صفحة الهبوط | `apps/web/src/app/page.tsx` | الصفحة الرئيسية مع HeroAnimation |
| مشغّل التطبيقات | `apps/web/src/app/ui/page.tsx` | يقرأ `apps/web/src/config/apps.config.ts` |
| المسارات الرئيسية | `apps/web/src/app/(main)/layout.tsx` | Layout مشترك للأدوات |
| واجهات الويب البرمجية | `apps/web/src/app/api/**/route.ts` | Route Handlers تحت `/api` |
| نقطة دخول الخلفية | `apps/backend/src/server.ts` | يربط المسارات والوسائط والطوابير |
| خادوم MCP | `apps/backend/src/mcp-server.ts` | بروتوكول السياق على نقطة `/mcp` |
| تصدير الحزم | `packages/*/src/index.ts` | السطح العام لكل حزمة |

---

## الأدوات السينمائية (packages/)

| الحزمة | المعرّف | الوصف |
|---|---|---|
| `shared` | `@the-copy/shared` | أنواع TypeScript وأدوات مشتركة بين الويب والخلفية |
| `ui` | `@the-copy/ui` | مكونات واجهة React قابلة لإعادة الاستخدام |
| `tsconfig` | `@the-copy/tsconfig` | إعدادات TypeScript الأساسية المشتركة |
| `breakapp` | `@the-copy/breakapp` | تفكيك السيناريو |
| `cinematography` | `@the-copy/cinematography` | التصوير السينمائي |
| `core-memory` | `@the-copy/core-memory` | ذاكرة النظام الأساسية |
| `prompt-engineering` | `@the-copy/prompt-engineering` | هندسة التوجيهات |

---

## المشاكل الشائعة

| المشكلة | السبب | الحل |
|---|---|---|
| فشل `pnpm install` مع خطأ في `@tiptap-pro` | `TIPTAP_PRO_TOKEN` غير موجود | أضف المتغير في `.npmrc` أو البيئة قبل التثبيت |
| مسارات الذكاء الاصطناعي تعيد خطأ | `GEMINI_API_KEY` أو `GOOGLE_GENAI_API_KEY` فارغة | أضف المفتاح في `.env` |
| تطبيق الويب لا يصل للخلفية | `NEXT_PUBLIC_API_URL` أو `NEXT_PUBLIC_BACKEND_URL` خاطئ | تحقق أن القيمة تشير إلى `http://localhost:<PORT>` المطابق لخلفيتك الفعلية |
| الطوابير لا تعمل / عمال الخلفية لا يبدؤون | Redis لا يعمل | شغّل `pnpm start:redis` أو اضبط `REDIS_ENABLED=false` لتعطيل الميزة |
| مسارات `file-extract` و`text-extract` تعيد 500 | الخلفية الرسمية غير شغالة، أو تعمل على منفذ مختلف، أو Python غير متاح لمحرك Karank | شغّل `pnpm dev` أو شغّل `pnpm dev:web` مع `pnpm dev:backend`، وتحقق أن متغيرات الويب تشير إلى `http://localhost:3001` أو إلى `NEXT_PUBLIC_BACKEND_URL` الرسمي. |
| الخلفية ترفض الطلبات من الويب | `CORS_ORIGIN` لا يتضمن `http://localhost:5000` | تحقق من قيمة `CORS_ORIGIN` في `.env` الخاصة بالخلفية |
| `JWT_SECRET` خطأ في الإنتاج | القيمة أقل من 32 حرفاً أو تحتوي على `dev-secret` | استبدل بقيمة عشوائية آمنة لا تقل عن 32 حرفاً |

---

## التوثيق

| الملف | الوصف |
|---|---|
| `docs/DIRECTIVE-PLATFORM-DOCS-WRITER.md` | الأمر التوجيهي الكامل لكتابة توثيق المنصة |
| `docs/adr/` | سجلات قرارات المعمارية (Architecture Decision Records) |
| `.env.example` | المرجع الكامل لجميع متغيرات البيئة مع شرح كل متغير |

---

## الترخيص

لا يوجد ترخيص موحد على مستوى الجذر (`package.json` الجذري يعلن `ISC`).

| الطبقة | الترخيص المعلن |
|---|---|
| `apps/web` | `UNLICENSED` |
| `apps/backend` | `MIT` |
| الجذر (`package.json`) | `ISC` |

تحقق من ملف `package.json` الخاص بكل تطبيق أو حزمة قبل أي إعادة استخدام خارجي.

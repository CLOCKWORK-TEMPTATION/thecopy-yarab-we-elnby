# دليل النشر والبنية التحتية — The Copy

<!-- markdownlint-disable MD013 MD031 MD032 MD040 -->

> آخر تحديث: 2026-04-07
> يغطي هذا الدليل جميع آليات النشر للمشروع بما يشمل: الفرونت إند، الباك إند، قاعدة البيانات، خطوط CI/CD، واستراتيجية النشر بدون توقف (Blue-Green).

---

## جدول المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [معمارية النشر](#2-معمارية-النشر)
3. [نشر الفرونت إند](#3-نشر-الفرونت-إند)
4. [نشر الباك إند](#4-نشر-الباك-إند)
5. [قاعدة البيانات والبنية التحتية](#5-قاعدة-البيانات-والبنية-التحتية)
6. [خط CI/CD — GitHub Actions](#6-خط-cicd--github-actions)
7. [Docker](#7-docker)
8. [الأسرار والمتغيرات البيئية](#8-الأسرار-والمتغيرات-البيئية)
9. [الأمان في النشر](#9-الأمان-في-النشر)
10. [المراقبة والتنبيهات](#10-المراقبة-والتنبيهات)
11. [التراجع (Rollback)](#11-التراجع-rollback)
12. [التوسع](#12-التوسع)
13. [الصيانة الدورية](#13-الصيانة-الدورية)
14. [قائمة الفحص قبل النشر](#14-قائمة-الفحص-قبل-النشر)
15. [المصطلحات](#15-المصطلحات)

---

## 1. نظرة عامة

| التطبيق | المنصة | الإطار | المنفذ |
|---------|--------|--------|--------|
| **الفرونت إند** (`apps/web`) | Blue-Green على الخادم مع بناء محقق في CI وصورة منشورة في GHCR | Next.js (standalone output) | `3000` داخل الحاوية |
| **الباك إند** (`apps/backend`) | Blue-Green على الخادم مع صورة Docker رسمية محققة في CI | Node.js 24 + Express | `3001` افتراضيًا / `PORT` في بيئة النشر |
| **طبقة المحرر الرسمية** | مضمّنة داخل صورة `apps/backend` نفسها | Editor runtime + OCR + Final Review | `3001/api/*` |
| **قاعدة البيانات** | Neon (PostgreSQL Serverless) | Drizzle ORM | — |
| **CI/CD** | GitHub Actions | — | — |
| **البنية التحتية (Blue-Green)** | VPS مخصص (`/opt/theeeecopy`) | Nginx + PM2 | `3001` / `3002` |

### البيئات والفروع

| الفرع | البيئة | الرابط | الحدث المُشغِّل |
|-------|--------|--------|----------------|
| `main` | الإنتاج (Production) | الإنتاج | `push` إلى `main` |
| `develop` | التطوير (Staging) | — | `push` إلى `develop` · `pull_request` |
| أي فرع آخر | تحقق قبل الدمج | لا يوجد نشر عام تلقائي | `pull_request` → CI + Docker preflight |
| محلية | التطوير المحلي | `http://localhost:3000` و`http://localhost:3001` | يدوي |

---

## 2. معمارية النشر

```mermaid
graph TB
    subgraph GitHub["GitHub"]
        PR[Pull Request]
        MAIN[Push → main]
    end

    subgraph CI["GitHub Actions — CI Pipeline"]
        direction TB
        DETECT[كشف التغييرات\ndorny/paths-filter]
        INSTALL[تثبيت المتطلبات\npnpm install]
        LINT[فحص الكود\nESLint]
        TYPE[فحص الأنواع\nTypeScript]
        TEST[الاختبارات\nVitest / Jest]
        BUILD[البناء\npnpm build]
        E2E[اختبارات E2E\nPlaywright]
        DETECT --> INSTALL --> LINT & TYPE & TEST --> BUILD --> E2E
    end

    subgraph SECURITY["GitHub Actions — الأمان"]
        CODEQL[CodeQL Advanced]
        TRIVY[Trivy Container Scan]
        SNYK[Snyk Container]
        BEARER[Bearer SAST]
        DEVSKIM[DevSkim]
        CODACY[Codacy Security]
        GITLEAKS[Gitleaks Secrets]
    end

    subgraph DEPLOY["النشر"]
        direction LR
        GHCR["GHCR\nصور الويب والباك إند"]
        BG["Blue-Green على VPS\nNginx + PM2\n:3001 / :3002"]
    end

    subgraph DB["قاعدة البيانات"]
        NEON_PROD["Neon — الإنتاج\nthecopy-db"]
        NEON_BRANCH["Neon Branch\nمؤقت لكل PR\n(14 يوم)"]
    end

    subgraph INFRA["البنية التحتية"]
        Browser["المتصفح"] --> Web["Next.js apps/web"]
        Web --> Backend["Express apps/backend\n/api/*"]
        Backend --> Redis["Redis / BullMQ"]
        Backend --> Postgres["PostgreSQL"]
        Backend --> Weaviate["Weaviate"]
        Backend --> Sentry["Sentry"]
        Backend --> OTEL["OpenTelemetry/Prometheus"]
    end

    PR --> CI --> SECURITY
    PR --> NEON_BRANCH

    MAIN --> CI
    CI --> GHCR
    CI --> BG
    BG --> NEON_PROD
```

---

## 3. نشر الفرونت إند

### 3.1 الآلية

يُبنى تطبيق Next.js في وضع `standalone` الذي يُولِّد مجلداً يحتوي على كل الملفات اللازمة للتشغيل بدون `node_modules` كاملة. هذا يجعل الصورة أصغر والنشر أسرع.

```
output: "standalone"   ← في next.config.ts
```

مسار البناء الناتج:
```
apps/web/.next/standalone/   ← ملفات التشغيل
apps/web/.next/static/       ← الأصول الثابتة (JS/CSS)
apps/web/public/             ← الملفات العامة
```

### 3.2 بناء صور Docker ونشرها

المنصة الحالية لا تستخدم `Firebase Hosting`. النشر الآلي للحاويات يتم عبر workflow الملف `.github/workflows/docker-build.yml`.

**ما الذي يفعله هذا الـ workflow:**
1. يبني صورتين مستقلتين من `apps/web/Dockerfile` و `apps/backend/Dockerfile`
2. يشغّل البناء على `push` و `pull_request` و `workflow_dispatch`
3. يرفع الصور إلى `GHCR` عند `push` على الفروع الرئيسية

**البناء اليدوي:**
```bash
docker build -t the-copy-web -f apps/web/Dockerfile .
docker build -t the-copy-backend -f apps/backend/Dockerfile .
```

**أوامر البناء والتشغيل المباشرة:**
```bash
pnpm --filter @the-copy/web build
pnpm --filter @the-copy/web start
pnpm --filter @the-copy/backend build
pnpm --filter @the-copy/backend start
```

### 3.3 متغيرات البيئة — الفرونت إند

تُضبط هذه المتغيرات في بيئة التشغيل أو secrets الـ CI. المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` تُحقن في الـ bundle وتظهر في المتصفح.

| المتغير | الوصف | مطلوب | القيمة الافتراضية (Dev) |
|---------|--------|--------|-------------------------|
| `NEXT_PUBLIC_API_URL` | عنوان الباك إند للمتصفح | نعم | `http://localhost:3001` |
| `NEXT_PUBLIC_BACKEND_URL` | عنوان الباك إند (بديل) | نعم | `http://localhost:3001` |
| `NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL` | عنوان مسار الاستخراج الرسمي داخل الباك إند | نعم للمحرر الكامل | `http://localhost:3001/api/file-extract` |
| `NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL` | عنوان مسار المراجعة النهائية الرسمي داخل الباك إند | — | `http://localhost:3001/api/final-review` |
| `NEXT_PUBLIC_APP_ENV` | بيئة التطبيق | — | `development` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | مفتاح Firebase للمصادقة | — | — |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | نطاق Firebase Auth | — | — |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | معرف مشروع Firebase | — | — |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | حاوية Firebase Storage | — | — |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | معرف مُرسِل Firebase | — | — |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | معرف تطبيق Firebase | — | — |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | معرف قياس Firebase (Analytics) | — | — |
| `NEXT_PUBLIC_TRACING_ENABLED` | تفعيل OpenTelemetry في المتصفح | — | `false` |
| `NEXT_PUBLIC_SERVICE_NAME` | اسم الخدمة للـ tracing | — | `thecopy-frontend` |
| `NEXT_PUBLIC_ENABLE_CDN` | تفعيل CDN للأصول الثابتة | — | `false` |
| `NEXT_PUBLIC_CDN_URL` | عنوان CDN (إذا فُعِّل) | — | — |
| `NEXT_PUBLIC_AI_DOUBT_ENABLED` | تفعيل ميزة الشك الذكي | — | `false` |

**متغيرات وقت البناء (ليست NEXT_PUBLIC):**

| المتغير | الوصف |
|---------|--------|
| `NODE_ENV` | يُضبط على `production` |
| `NEXT_TELEMETRY_DISABLED` | `1` لتعطيل إرسال إحصاءات Next.js |
| `SENTRY_ORG` | منظمة Sentry لرفع source maps |
| `SENTRY_PROJECT` | مشروع Sentry |
| `SENTRY_AUTH_TOKEN` | مفتاح رفع source maps |
| `ANALYZE` | `true` لتشغيل Bundle Analyzer |
| `TIPTAP_PRO_TOKEN` | مطلوب لتثبيت حزم @tiptap-pro |

### 3.4 ميزات الأداء والأمان في next.config.ts

- **SRI (Subresource Integrity):** `sri: { algorithm: "sha256" }` — تحقق من سلامة الأصول
- **رؤوس الأمان في الإنتاج:** HSTS، X-Frame-Options: DENY، X-Content-Type-Options، CSP-ready
- **تخزين مؤقت عدواني:** الأصول الثابتة تُخزَّن لمدة سنة (`max-age=31536000, immutable`)
- **حذف console.log تلقائياً في الإنتاج:** `compiler.removeConsole: true`
- **Turbopack:** مُفعَّل افتراضياً في Next.js الإصدار المستخدم مع alias لمجلد المحرر
- **`productionBrowserSourceMaps: false`** — لا تُرفع source maps للمتصفح

---

## 4. نشر الباك إند

### 4.1 الصورة الرسمية للباك إند

المسار الرسمي الحالي للإنتاج هو صورة `apps/backend/Dockerfile`.

هذه الصورة أصبحت تحمل:
- `dist/server.js`
- `editor-runtime`
- مسار OCR العربي
- تبعيات النظام المطلوبة وقت التشغيل مثل `antiword` و`poppler-utils` و`chromium` و`python3`

ويُتحقق منها قبل النشر عبر:
- بناء Docker من checkout نظيف
- تشغيل PostgreSQL مؤقت
- تشغيل الحاوية فعليًا
- فحص `/health`
- فحص `/api/health`
- فحص `/api/editor-runtime/health`
- فحص مسارات `file-extract` و`text-extract` و`final-review`

### 4.2 متغيرات البيئة — الباك إند

| المتغير | المصدر في النشر | مطلوب | الوصف |
|---------|-----------------|--------|--------|
| `DATABASE_URL` | secrets أو بيئة الخادم | نعم | رابط اتصال PostgreSQL |
| `REDIS_URL` | secrets أو بيئة الخادم | نعم عند تفعيل الطوابير | رابط اتصال Redis |
| `JWT_SECRET` | secrets أو بيئة الخادم | نعم | مفتاح JWT — 32 حرفًا على الأقل |
| `GEMINI_API_KEY` | secrets أو بيئة الخادم | نعم أو بديله | مفتاح Google GenAI |
| `GOOGLE_GENAI_API_KEY` | secrets أو بيئة الخادم | نعم أو بديله | الاسم البديل المدعوم للمفتاح نفسه |
| `NODE_ENV` | ثابت: `production` | — | بيئة التشغيل |
| `PORT` | بيئة الخادم | — | المنفذ الافتراضي في الكود هو `3001` |

ملاحظة تشغيلية:
في GitHub Actions يمكن استخدام secret باسم `AI_API_KEY` أيضًا كبديل لخطوات التحقق قبل النشر.
داخل الحاويات ووقت التشغيل يظل الحقن الفعلي موحّدًا إلى `GEMINI_API_KEY` و`GOOGLE_GENAI_API_KEY`.

**متغيرات إضافية للإنتاج:**

| المتغير | مطلوب | الوصف |
|---------|--------|--------|
| `CORS_ORIGIN` | نعم | قائمة النطاقات المسموحة مفصولة بفاصلة — يجب أن يساوي أصل الويب |
| `FRONTEND_URL` | — | عنوان الفرونت إند لـ CORS |
| `RATE_LIMIT_WINDOW_MS` | — | نافذة تحديد المعدل (ms) — افتراضي: `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | — | الحد الأقصى للطلبات في النافذة — افتراضي: `100` |
| `TRACING_ENABLED` | — | تفعيل OpenTelemetry — افتراضي: `false` |
| `SERVICE_NAME` | — | اسم الخدمة للـ tracing — افتراضي: `thecopy-backend` |
| `REDIS_ENABLED` | — | تفعيل Redis — افتراضي: `true` |
| `LOG_LEVEL` | — | مستوى التسجيل — افتراضي: `info` |
| `SENTRY_DSN` | لا لكنه مستحسن | عنوان Sentry لتتبع الأخطاء |
| `ANTHROPIC_API_KEY` | — | مفتاح Anthropic (اختياري) |
| `OPENAI_API_KEY` | — | مفتاح OpenAI (اختياري) |
| `MISTRAL_API_KEY` | — | مفتاح Mistral OCR (اختياري) |

### 4.3 Procfile

يبقى `Procfile` ملف توافق إضافي، لكنه ليس المسار الرسمي الحالي للنشر:

```
web: node dist/server.js
```

### 4.4 إجراء الترحيل عند بدء التشغيل

يُنفِّذ `docker-entrypoint.sh` الترحيل تلقائياً قبل تشغيل الخادم:

```sh
#!/bin/sh
set -e

echo "Running database migrations..."
if ! pnpm run db:push; then
  echo "Database migration failed!"
  exit 1
fi

echo "Migrations complete!"
echo "Starting server..."
exec "$@"   # ← يُشغِّل: node dist/server.js
```

> **تحذير:** إذا فشل الترحيل، يتوقف الحاوي ولا يبدأ الخادم. راقب سجلات الترحيل في أي نشر جديد.

---

## 5. قاعدة البيانات والبنية التحتية

### 5.1 Neon — PostgreSQL Serverless

يُستخدم Neon كقاعدة بيانات رئيسية لكونه يدعم **branching** (تفرع قاعدة البيانات) الذي يُتيح إنشاء نسخة معزولة لكل Pull Request تلقائياً.

**إعداد Neon Branching عبر GitHub Actions:**

ملف `.github/workflows/neon_workflow.yml` يُنفِّذ:

| الحدث | الإجراء |
|-------|---------|
| PR مفتوح / محدَّث / مُعاد فتحه | إنشاء فرع Neon: `preview/pr-{رقم}-{اسم-الفرع}` (صلاحية 14 يوماً) |
| PR مغلق | حذف فرع Neon تلقائياً |

**الأسرار المطلوبة:**
- `NEON_API_KEY` — مفتاح Neon API
- `NEON_PROJECT_ID` — معرف مشروع Neon

**الترحيلات:**
- تتم عبر `db:push` (Drizzle ORM)
- يُنصح باختبار الترحيل على Neon branch أولاً قبل الإنتاج

### 5.2 Redis

يُستخدم Redis للتخزين المؤقت وقوائم الانتظار. يتصل الباك إند به عبر `REDIS_URL`. يدعم الإعداد:
- اتصال مباشر عبر `REDIS_URL`
- اتصال منفصل عبر `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD`
- وضع Sentinel (متوفر عالية) عبر `REDIS_SENTINEL_ENABLED=true`

---

## 6. خط CI/CD — GitHub Actions

### 6.1 خريطة Workflows

| الملف | الحدث المُشغِّل | الغرض |
|-------|----------------|--------|
| `ci.yml` | push/PR على `main`، `develop` | التحقق الأساسي: lint + type-check + test:coverage + build |
| `blue-green-deployment.yml` | push على `main` · يدوي | نشر الباك إند بدون توقف عبر SSH و Nginx |
| `docker-build.yml` | push/PR · يدوي | بناء صور Docker ورفعها إلى GHCR |
| `neon_workflow.yml` | فتح/إغلاق PR | إنشاء/حذف فروع Neon للمعاينة |
| `security-audit.yml` | push/PR/أسبوعي · يدوي | تدقيق التبعيات والأسرار وصور الحاويات |
| `codeql.yml` | push/PR/أسبوعي (الأحد) | تحليل SAST عبر CodeQL |
| `hybrid-production-audit.yml` | pull_request | مراجعة ذكية للإنتاجية والجودة على PR |

### 6.2 خط CI الرئيسي (`ci.yml`) — مراحل التنفيذ

```
المرحلة 1: كشف التغييرات (dorny/paths-filter)
    ↓
المرحلة 2: تثبيت المتطلبات (pnpm install + تخزين مؤقت)
    ↓
المرحلة 3: جودة الكود (بالتوازي)
    ├── Lint الفرونت إند    (إذا تغيّر apps/web/**)
    ├── Lint الباك إند     (إذا تغيّر apps/backend/**)
    ├── TypeCheck الفرونت  (إذا تغيّر apps/web/**)
    └── TypeCheck الباك   (إذا تغيّر apps/backend/**)
    ↓
المرحلة 4: الاختبارات (بالتوازي)
    ├── اختبارات الفرونت إند + رفع تغطية Codecov
    └── اختبارات الباك إند  + رفع تغطية Codecov
    ↓
المرحلة 5: البناء (بالتوازي + تخزين مؤقت)
    ├── بناء الفرونت إند (.next/cache مُخزَّنة)
    └── بناء الباك إند  (dist/ + tsconfig.tsbuildinfo مُخزَّنة)
    ↓
المرحلة 6: E2E بـ Playwright (على PR فقط إذا تغيّر الفرونت)
    ↓
المرحلة 7: تقرير الحالة النهائية
```

**نقاط تحسين الأداء (الهدف: أقل من 7 دقائق):**
- التزامنية: إلغاء التشغيلات المكررة (`concurrency: cancel-in-progress: true`)
- التخزين المؤقت: pnpm store + node_modules + .next/cache + dist/
- التنفيذ الانتقائي: تشغيل مهام الفرونت فقط إذا تغيّر الفرونت والعكس

### 6.3 استراتيجية النشر Blue-Green (`blue-green-deployment.yml`)

تُنفَّذ هذه الاستراتيجية على VPS مخصص في `/opt/theeeecopy` وتضمن نشراً بدون أي انقطاع في الخدمة.

**المبدأ:**
```
الحالة الأولية:  Nginx → Blue (:3001)  [الإصدار القديم]
أثناء النشر:    يبدأ Green (:3002) ويُفحص بـ /health
بعد النجاح:    Nginx → Green (:3002) [الإصدار الجديد]
                Blue (:3001) يُوقَف
الـ Rollback:   Nginx → Blue (:3001) (إذا أخفق Green)
```

**الأسرار المطلوبة:**
- `SSH_PRIVATE_KEY` — مفتاح SSH الخاص للوصول إلى الخادم
- `SSH_HOST` — عنوان IP أو اسم نطاق الخادم
- `SSH_USER` — مستخدم SSH
- `PRODUCTION_URL` — عنوان الإنتاج للتحقق من الصحة
- `SLACK_WEBHOOK_URL` — إشعارات Slack (اختياري)

**أوامر النشر اليدوي:**
```bash
cd /opt/theeeecopy
./scripts/deploy/blue-green-deploy.sh deploy    # نشر جديد
./scripts/deploy/blue-green-deploy.sh rollback  # التراجع للإصدار السابق
./scripts/deploy/blue-green-deploy.sh status    # حالة البيئتين
```

**التحقق من الصحة بعد النشر:**
يُجري الـ workflow ثلاث عمليات تحقق متتالية:
1. `GET /health` — فحص الصحة الأساسي
2. `GET /health/ready` → يتحقق من `status: "ready"`
3. `GET /api/health` — فحص API

### 6.4 حدود تغطية الاختبارات داخل `ci.yml`

أصبح التحقق من التغطية جزءًا من وظائف `Verify Frontend` و `Verify Backend` داخل `ci.yml` عبر `test:coverage`، ثم تُرفع النتائج إلى Codecov.

الحدود الحالية:

| المقياس | الحد الأدنى |
|---------|------------|
| الأسطر (Lines) | 85% |
| الدوال (Functions) | 85% |
| الفروع (Branches) | 80% |
| العبارات (Statements) | 85% |

التقارير تُرفع إلى Codecov من نفس خط CI الأساسي، ولا يوجد workflow مستقل للتغطية أو تحديث الشارات.

---

## 7. Docker

Docker هنا مسار نشر/حاويات فقط، وليس المسار الرسمي المحلي للوكلاء أو التطوير المرجعي.

### 7.1 Dockerfile الباك إند (`apps/backend/Dockerfile`)

يعتمد على بناء متعدد المراحل (Multi-stage build):

**المرحلة 1 — Builder** (`node:24-alpine`):
- تثبيت أدوات البناء الأصلية: `python3`, `make`, `g++`
- تثبيت `pnpm@10.32.1` عبر `corepack`
- نسخ ملفات الـ workspace وتثبيت المتطلبات للباك إند فقط: `--filter @the-copy/backend`
- بناء TypeScript: `pnpm build`

**المرحلة 2 — Runner** (`node:24-alpine`):
- إنشاء مستخدم غير جذر: `backenduser` (uid: 1001)
- نسخ ملفات `dist/` و `node_modules/` فقط (بدون الكود المصدري)
- التشغيل على المنفذ `3000`
- فحص الصحة كل 30 ثانية: `wget http://localhost:3000/health`
- نقطة الدخول: `docker-entrypoint.sh` (يُنفِّذ الترحيل أولاً)

**بناء الصورة:**
```bash
# من جذر المشروع (مهم في الـ Monorepo)
docker build -t thecopy-backend:latest -f apps/backend/Dockerfile .

# تشغيل محلي
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret-here" \
  -e REDIS_URL="redis://localhost:6379" \
  thecopy-backend:latest

# أو باستخدام env file
docker run --rm -p 3000:3000 --env-file .env thecopy-backend:latest
```

### 7.2 Dockerfile الفرونت إند (`apps/web/Dockerfile`)

يعتمد على بناء متعدد المراحل:

**المرحلة 1 — Builder** (`node:22-slim`):
- تثبيت المتطلبات وبناء التطبيق
- ينتج `apps/web/.next/standalone/`

**المرحلة 2 — Runner** (`node:22-slim`):
- إنشاء مستخدم `nextjs` (uid: 1001)
- نسخ ملفات standalone + static + public فقط
- التشغيل على المنفذ `3000` من `0.0.0.0`

```bash
# البناء من مجلد apps/web
docker build -t thecopy-web:latest -f apps/web/Dockerfile .

docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://api.yourdomain.com" \
  thecopy-web:latest
```

### 7.3 Dockerfile خادم الاستيراد المحلي القديم (`apps/web/Dockerfile.file-import`)

هذا الملف لم يعد جزءًا من مسار الإنتاج الرسمي.

الاستخدام الحالي له محصور في التجارب المحلية المعزولة فقط.
أما الإنتاج وعمليات التحقق الرسمية فيعتمدان على `apps/backend/Dockerfile` لأن طبقة المحرر مضمّنة هناك فعليًا.

### 7.4 .dockerignore

الملفات المستبعدة من سياق البناء لتسريع العملية وتأمين الصورة:

```
.git · node_modules · .next · dist · build · coverage
*.log · .env* (ما عدا .env.example)
.npmrc
أدوات AI: .claude · .gemini · .opencode · .roo · ...
```

### 7.5 Docker Compose (للتطوير المحلي)

لا يوجد ملف `docker-compose.yml` في المشروع حالياً. للتطوير المحلي مع Docker:

```bash
# شبكة مشتركة
docker network create thecopy-network

# تشغيل الباك إند
docker run -d --name thecopy-backend \
  --network thecopy-network \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e REDIS_URL="$REDIS_URL" \
  thecopy-backend:latest

# تشغيل الفرونت إند
docker run -d --name thecopy-web \
  --network thecopy-network \
  -p 3001:3000 \
  -e NEXT_PUBLIC_API_URL="http://thecopy-backend:3000" \
  thecopy-web:latest
```

---

## 8. الأسرار والمتغيرات البيئية

### 8.1 GitHub Secrets المطلوبة

**للنشر Blue-Green:**

| السر | الوصف |
|------|--------|
| `SSH_PRIVATE_KEY` | مفتاح SSH الخاص (RSA/ED25519) |
| `SSH_HOST` | عنوان خادم الإنتاج |
| `SSH_USER` | مستخدم SSH |
| `PRODUCTION_URL` | عنوان الإنتاج (مثال: `https://api.yourdomain.com`) |
| `SLACK_WEBHOOK_URL` | رابط Slack Webhook للإشعارات |

**لقاعدة البيانات:**

| السر | الوصف |
|------|--------|
| `NEON_API_KEY` | مفتاح Neon API |
| `NEON_PROJECT_ID` | معرف مشروع Neon |

**للأمان:**

| السر | الوصف |
|------|--------|
| `SNYK_TOKEN` | مفتاح Snyk للفحص الأمني |
| `CODACY_PROJECT_TOKEN` | مفتاح مشروع Codacy |
| `BEARER_TOKEN` | مفتاح Bearer SAST |
| `GITLEAKS_LICENSE` | رخصة Gitleaks |

### 8.2 إعداد ملف .env للتطوير المحلي

```bash
# انسخ ملف المثال
cp .env.example .env

# انسخ للتطبيقات المحددة
cp .env.example apps/web/.env.local
cp .env.example apps/backend/.env
```

ثم عدِّل القيم الأساسية:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/the_copy
JWT_SECRET=<32 حرف عشوائياً على الأقل>
GEMINI_API_KEY=<مفتاحك>
TIPTAP_PRO_TOKEN=<مفتاحك>
```

> **تحذير أمني:** لا تلتزم أبداً بملف `.env` في git. ملف `.gitignore` يستبعده بالفعل، لكن تأكد من مراجعة `.env*` في أي commit.

### 8.3 أولوية مفاتيح مزود الذكاء وتدويرها

يدعم المشروع متغيرَيْ بيئة لمزود Google GenAI:

| الأولوية | المتغير | الملاحظة |
|----------|---------|----------|
| 1 (الأعلى) | `GOOGLE_GENAI_API_KEY` | المتغير الأساسي — يُستخدم أولًا إن وُجد |
| 2 | `GEMINI_API_KEY` | البديل التاريخي — يُستخدم إن غاب الأول |

**المصدر الوحيد للمفتاح:** أسرار بيئة التشغيل الفعلية (Railway / Vercel / `.env` محلي). لا يُخزَّن المفتاح في مكان آخر.

**خطوات تدوير المفتاح:**

1. أنشئ مفتاحًا جديدًا من Google AI Studio.
2. حدِّث السر في بيئة التشغيل الفعلية (`GOOGLE_GENAI_API_KEY`).
3. أزل أي قيمة قديمة أو مزدوجة لـ `GEMINI_API_KEY` إن لم تعد ضرورية — وجود قيمتين مختلفتين يسبب التباس الأولوية.
4. أعد تشغيل الخدمة بعد تحديث السر.
5. تحقق من صحة المفتاح الجديد:

```bash
curl http://127.0.0.1:3001/health/ready | jq '.checks.external_services'
```

6. تأكد من أن `aiTriState` يعود `"ready"` لا `"configured-failing"` ولا `"not-configured"`.

**حالات فحص الصحة ثلاثية المستوى:**

| الحالة | المعنى |
|--------|--------|
| `not-configured` | لا يوجد مفتاح مهيأ — الخدمة لن تعمل |
| `configured-failing` | المفتاح موجود لكنه فاشل (منتهٍ، شبكة، حصة) |
| `ready` | المفتاح يعمل فعليًا — فحص حي ناجح |

> **مهم:** لا تُرفع الجاهزية إلى حالة سليمة إلا بعد تحقق `ready` من نفس البيئة.

---

## 9. الأمان في النشر

### 9.1 أمان الحاوي

تُنفَّذ فحوصات الأمان التلقائية على كل push إلى `main`:

| الأداة | الجدول | الهدف |
|--------|--------|--------|
| **Trivy** | push + أسبوعي (الخميس) | ثغرات الصورة (CRITICAL, HIGH) |
| **Snyk Container** | push + أسبوعي (السبت) | ثغرات التبعيات في الصورة |
| **CodeQL** | push + أسبوعي (الأحد) | تحليل الكود الثابت (SAST) |
| **Codacy** | push + أسبوعي (الثلاثاء) | جودة الكود والأمان |
| **Bearer** | push + أسبوعي (السبت) | كشف تسرب البيانات الحساسة |
| **DevSkim** | push + أسبوعي (الأربعاء) | نمط أمان Microsoft |
| **Gitleaks** | push + PR | كشف الأسرار في السجل |
| **npm audit** | PR + push | ثغرات التبعيات |

### 9.2 ممارسات الأمان المطبقة

- **المستخدم غير الجذر في Docker:** كل حاوي يعمل بمستخدم `backenduser`/`nextjs` (uid: 1001)
- **صلاحيات GitHub Actions المحدودة:** كل workflow يحدد `permissions` بالحد الأدنى المطلوب
- **JWT_SECRET يُدار عبر secrets:** لا يُستخدم أي fallback افتراضي في الإنتاج
- **CORS محدود:** قائمة بيضاء صريحة لنطاقات الفرونت إند
- **تحديد معدل الطلبات:** مُطبَّق على مستوى الباك إند (15 دقيقة، 100 طلب)
- **رؤوس HTTP الأمنية:** مُطبَّقة على الفرونت إند عبر `next.config.ts`
- **SRI:** التحقق من سلامة الأصول عبر sha256

---

## 10. المراقبة والتنبيهات

| الخدمة | الغرض | المصدر |
|--------|--------|--------|
| **Sentry** | أخطاء الخلفية والويب | `@sentry/nextjs`, `@sentry/node` |
| **OpenTelemetry** | traces | web + backend |
| **Prometheus** | metrics | `/metrics` في الخلفية |
| **Bull Board** | مراقبة الطوابير | `/admin/queues` |

نقاط الفحص:
- `GET /health` — فحص الصحة الأساسي
- `GET /health/ready` — يُعيد `{"status": "ready"}`
- `GET /health/live` — فحص الحياة
- `GET /metrics` — مقاييس Prometheus

---

## 11. التراجع (Rollback)

**Blue-Green (تلقائي):**
إذا أخفق فحص الصحة بعد النشر، يتراجع الـ workflow تلقائياً إلى البيئة السابقة.

**التراجع اليدوي على VPS:**
```bash
cd /opt/theeeecopy
./scripts/deploy/blue-green-deploy.sh rollback
```

**تراجع Docker/Container:**
استخدم آخر image أو آخر commit ناجح.

**نقاط المراقبة بعد أي تراجع:**
1. راقب `/health`, `/health/ready`, `/metrics`
2. تحقق من Sentry لغياب أخطاء جديدة

---

## 12. التوسع

| المجال | النمط الحالي |
|--------|--------------|
| الويب | Next.js standalone قابل للتوسع أفقياً |
| الخلفية | Express + Redis + BullMQ يسمح بعزل workers والخدمة |
| البث اللحظي | Socket.IO + SSE يحتاج sticky sessions أو gateway مناسب عند التوسع |

---

## 13. الصيانة الدورية

| المهمة | التكرار | الطريقة |
|--------|---------|---------|
| تحديث التبعيات | شهري | `pnpm update -r` |
| فحص الثغرات | قبل النشر | `pnpm audit` |
| التحقق من المقاييس | مع كل release | `/metrics` وSentry |
| مراجعة مفاتيح AI وJWT | دوري | تدوير secrets على المنصة |

---

## 14. قائمة الفحص قبل النشر

### قبل كل نشر إلى الإنتاج

**الكود والاختبارات:**
- [ ] جميع اختبارات الوحدة تمر (`pnpm test`)
- [ ] اختبارات E2E تمر (`pnpm e2e`)
- [ ] تغطية الاختبارات تتجاوز الحدود (Lines ≥ 85%، Branches ≥ 80%)
- [ ] TypeScript بدون أخطاء (`pnpm typecheck`)
- [ ] ESLint بدون أخطاء (`pnpm lint`)
- [ ] البناء يكتمل بنجاح (`pnpm build`)

**قاعدة البيانات:**
- [ ] مراجعة ملفات الترحيل الجديدة للتأكد من صحتها
- [ ] اختبار الترحيل على بيئة staging أو Neon branch أولاً
- [ ] التأكد من وجود خطة تراجع (rollback) لتغييرات المخطط الكسرية

**البيئة:**
- [ ] جميع المتغيرات البيئية المطلوبة مضبوطة في المنصة المستهدفة
- [ ] `JWT_SECRET` لا يحتوي على `dev-secret` أو `CHANGE-THIS`
- [ ] `JWT_SECRET` لا يقل عن 32 حرفاً
- [ ] `CORS_ORIGIN` يشمل نطاقات الإنتاج الصحيحة فقط
- [ ] مفاتيح AI (Gemini وغيره) مضبوطة وصالحة

**الأمان:**
- [ ] فحوصات Trivy و Snyk لا تُظهر ثغرات حرجة
- [ ] Gitleaks لا يكشف أسراراً في السجل
- [ ] CodeQL لا يُبلِّغ عن مشكلات أمنية جديدة

**البنية التحتية (للنشر Blue-Green):**
- [ ] الخادم يستجيب عبر SSH
- [ ] Nginx مثبَّت ويعمل
- [ ] PM2 مثبَّت (`pm2 --version`)
- [ ] متغيرات البيئة مضبوطة على الخادم

**بعد النشر:**
- [ ] `GET /health` يُعيد `200 OK`
- [ ] `GET /health/ready` يُعيد `{"status": "ready"}`
- [ ] `GET /api/health` يُعيد `200 OK`
- [ ] الفرونت إند يُحمَّل بدون أخطاء في وحدة تحكم المتصفح
- [ ] المصادقة تعمل (تسجيل دخول / خروج)
- [ ] مراقبة Sentry لا تُظهر أخطاء جديدة خلال أول 15 دقيقة

---

## ملحق أ — هيكل المشروع المتعلق بالنشر

```
the-copy/
├── apps/
│   ├── backend/
│   │   ├── Dockerfile              ← صورة الباك إند (Node 24-alpine)
│   │   ├── docker-entrypoint.sh   ← ترحيل DB + تشغيل الخادم
│   │   ├── render.yaml            ← ملف توافق قديم غير معتمد في مسار الإنتاج الرسمي الحالي
│   │   └── Procfile               ← أمر التشغيل (Heroku-compatible)
│   └── web/
│       ├── Dockerfile             ← صورة الفرونت إند (Node 22-slim, standalone)
│       ├── Dockerfile.file-import ← أداة محلية قديمة غير معتمدة في الإنتاج
│       └── next.config.ts         ← إعداد Next.js (standalone output, SRI, security headers)
├── scripts/
│   └── deploy/
│       └── blue-green-deploy.sh  ← سكريبت النشر الأزرق-الأخضر
├── .github/
│   └── workflows/
│       ├── ci.yml                      ← خط CI الرئيسي
│       ├── blue-green-deployment.yml   ← النشر بدون توقف
│       ├── docker-build.yml            ← بناء ورفع صور Docker
│       ├── neon_workflow.yml           ← إدارة فروع DB
│       ├── security-audit.yml          ← تدقيق التبعيات والأسرار والحاويات
│       ├── codeql.yml                  ← فحص SAST
│       └── hybrid-production-audit.yml ← مراجعة PR الذكية
├── .dockerignore
└── .env.example
```

## ملحق ب — أوامر مفيدة

```bash
# فحص صحة الباك إند
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/health/ready

# حالة Blue-Green على الخادم
ssh user@host "cd /opt/theeeecopy && ./scripts/deploy/blue-green-deploy.sh status"

# عرض سجلات PM2
ssh user@host "pm2 logs theeeecopy-blue"
ssh user@host "pm2 logs theeeecopy-green"

# إعادة تشغيل يدوية
ssh user@host "pm2 restart theeeecopy-green"

# فحص الصورة محلياً
docker build -t thecopy-backend:test -f apps/backend/Dockerfile .
docker run --rm thecopy-backend:test node -e "console.log('OK')"
```

---

## 15. المصطلحات

| المصطلح | المعنى في سياق هذا المشروع |
|---------|---------------------------|
| standalone | إخراج Next.js جاهز للنشر كسيرفر مستقل |
| Bull Board | لوحة مراقبة للطوابير (`/admin/queues`) |
| Blue-Green | استراتيجية نشر بدون توقف باستخدام بيئتين متوازيتين |
| Neon Branch | نسخة معزولة من قاعدة البيانات لكل PR |
| Staging | بيئة ما قبل الإنتاج تستخدم فرع `develop` |

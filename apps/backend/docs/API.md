# مرجع API الكامل — الباك اند

> آخر تحديث: 2026-03-30
> الإصدار: 1.0.0
> الإطار: Express.js 5.1.0 + TypeScript

---

## جدول المحتويات

1. [نظرة عامة](#-نظرة-عامة)
2. [Middleware العامة](#-middleware-العامة)
3. [بنية الاستجابة الموحدة](#-بنية-الاستجابة-الموحدة)
4. [المصادقة (Auth)](#-مجموعة-المصادقة-auth)
5. [مصادقة Zero-Knowledge (ZK)](#-مصادقة-zero-knowledge-zk)
6. [المشاريع (Projects)](#-مجموعة-المشاريع-projects)
7. [المشاهد (Scenes)](#-مجموعة-المشاهد-scenes)
8. [الشخصيات (Characters)](#-مجموعة-الشخصيات-characters)
9. [اللقطات (Shots)](#-مجموعة-اللقطات-shots)
10. [المستندات المشفرة (Encrypted Docs)](#-المستندات-المشفرة-encrypted-docs)
11. [الذكاء الاصطناعي (AI)](#-مجموعة-الذكاء-الاصطناعي-ai)
12. [التحليل (Analysis)](#-مجموعة-التحليل-analysis)
13. [النقد الذاتي (Critique)](#-مجموعة-النقد-الذاتي-critique)
14. [Breakdown](#-مجموعة-breakdown)
15. [قوائم الانتظار (Queue)](#-مجموعة-قوائم-الانتظار-queue)
16. [المقاييس (Metrics)](#-مجموعة-المقاييس-metrics)
17. [جدار الحماية (WAF)](#-مجموعة-جدار-الحماية-waf)
18. [نظام الذاكرة (Memory)](#-نظام-الذاكرة-memory)
19. [الصحة (Health)](#-نقاط-نهاية-الصحة-health)
20. [Prometheus Metrics](#-prometheus-metrics)
21. [Gemini Cost](#-gemini-cost)
22. [لوحة Bull Board](#-لوحة-bull-board)
23. [MCP Server](#-mcp-server)
24. [أحداث Socket.io (WebSocket)](#-أحداث-socketio-websocket)
25. [أحداث SSE](#-أحداث-sse-server-sent-events)
26. [قوائم BullMQ](#-قوائم-bullmq)

---

## نظرة عامة

| الخاصية | القيمة |
|---|---|
| الإطار | Express.js 5.1.0 + TypeScript |
| المنفذ الافتراضي | `3001` (مع fallback تلقائي للمنفذ التالي) |
| Base URL | `http://localhost:3001` |
| تنسيق البيانات | `application/json` |
| الترميز | `UTF-8` |
| المصادقة | JWT عبر Cookie HttpOnly (`accessToken`) أو Bearer Token |
| حد الطلبات — عام | 100 طلب / 15 دقيقة لكل مسار `/api/` |
| حد الطلبات — مصادقة | 5 طلبات / 15 دقيقة على `/api/auth/login` و `/api/auth/signup` |
| حد الطلبات — AI | 20 طلب / ساعة على `/api/analysis/` و `/api/projects/:id/analyze` |
| حجم الجسم الأقصى | 10 MB |
| الـ WebSocket | Socket.io على نفس المنفذ |
| SSE | Server-Sent Events عبر خدمة SSE الداخلية |
| MCP Server | منفذ منفصل (افتراضي: `3000`) عبر `MCP_PORT` |

---

## Middleware العامة

تُطبَّق هذه الـ middleware على كل الطلبات بالترتيب التالي:

| الترتيب | الـ Middleware | الملف | الوظيفة |
|---|---|---|---|
| 1 | `trackError` / `trackPerformance` | `middleware/sentry.middleware.ts` | تتبع الأخطاء والأداء عبر Sentry |
| 2 | `metricsMiddleware` | `middleware/metrics.middleware.ts` | تجميع مقاييس Prometheus |
| 3 | `sloMetricsMiddleware` | `middleware/slo-metrics.middleware.ts` | قياس SLO (الإتاحة، الكمون، الميزانية) |
| 4 | `wafMiddleware` | `middleware/waf.middleware.ts` | جدار الحماية (WAF) — يمنع الهجمات المعروفة |
| 5 | `logAuthAttempts` | `middleware/security-logger.middleware.ts` | تسجيل محاولات المصادقة |
| 6 | `logRateLimitViolations` | `middleware/security-logger.middleware.ts` | تسجيل تجاوزات حد الطلبات |
| 7 | `cookieParser` | (مكتبة خارجية) | تحليل الكوكيز — ضروري قبل CSRF |
| 8 | `csrfProtection` | `middleware/csrf.middleware.ts` | حماية CSRF بنمط Double Submit Cookie |
| 9 | CSRF Origin/Referer Check | `server.ts` (مدمج) | تحقق إضافي من Origin/Referer |
| 10 | CORS | `middleware/index.ts` | سياسة Origin مع whitelist صارمة |
| 11 | Helmet | `middleware/index.ts` | ترويسات أمان HTTP (CSP، HSTS، إلخ) |
| 12 | `compression` | (مكتبة خارجية) | ضغط gzip للاستجابات |
| 13 | `express.json` | (مدمج) | تحليل JSON (حد 10 MB) |
| 14 | `express.urlencoded` | (مدمج) | تحليل البيانات المشفرة (حد 10 MB) |
| 15 | `sanitizeRequestLogs` | `middleware/log-sanitization.middleware.ts` | تعقيم السجلات من البيانات الحساسة (PII) |
| 16 | Rate Limiters | `middleware/index.ts` | حدود الطلبات حسب النوع |
| 17 | `authMiddleware` | `middleware/auth.middleware.ts` | التحقق من JWT على المسارات المحمية |

### ملاحظات الأمان

- **CSRF**: جميع طلبات `POST` / `PUT` / `DELETE` / `PATCH` تستلزم رمز CSRF صالح (ما عدا `/health` و `/api/health` و `/metrics`).
- **الكوكيز**: `accessToken` (15 دقيقة) و `refreshToken` (7 أيام) — كلاهما `httpOnly: true`, `sameSite: strict`.
- **المصادقة**: يقبل `authMiddleware` الرمز من ترويسة `Authorization: Bearer <token>` أو كوكي `accessToken`.

---

## بنية الاستجابة الموحدة

### استجابة ناجحة

```json
{
  "success": true,
  "message": "رسالة نصية اختيارية",
  "data": { ... }
}
```

### استجابة ناجحة مع عدد

```json
{
  "success": true,
  "count": 42,
  "data": [ ... ]
}
```

### استجابة خطأ

```json
{
  "success": false,
  "error": "وصف الخطأ",
  "details": [ ... ],
  "code": "رمز_الخطأ"
}
```

### رموز HTTP المستخدمة

| الرمز | المعنى |
|---|---|
| 200 | نجاح |
| 201 | تم الإنشاء |
| 400 | بيانات غير صالحة |
| 401 | غير مصرح (يجب تسجيل الدخول) |
| 403 | محظور (غير مصرح بالوصول) |
| 404 | غير موجود |
| 409 | تعارض (مثلاً: البريد مستخدم) |
| 429 | تجاوز حد الطلبات |
| 500 | خطأ داخلي |
| 503 | الخدمة غير متاحة |

---

## مجموعة المصادقة (Auth)

### `POST /api/auth/signup`

**الوصف:** تسجيل مستخدم جديد بالمصادقة التقليدية. يضبط كوكيز `accessToken` و `refreshToken` تلقائياً عند النجاح.
**الملف:** `controllers/auth.controller.ts`
**المصادقة:** عامة (لا تحتاج رمز)
**حد الطلبات:** 5 طلبات / 15 دقيقة

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `email` | `string` | نعم | بريد إلكتروني صالح |
| `password` | `string` | نعم | 12 حرفاً على الأقل، حرف كبير + حرف صغير + رقم + رمز خاص |
| `firstName` | `string` | لا | الاسم الأول |
| `lastName` | `string` | لا | الاسم الأخير |

**المخرجات (201):**

```json
{
  "success": true,
  "message": "تم إنشاء الحساب بنجاح",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "أحمد",
      "lastName": "محمد"
    },
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**الكوكيز المضبوطة:** `accessToken` (15 دقيقة), `refreshToken` (7 أيام)

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MySecure@Pass1",
    "firstName": "أحمد",
    "lastName": "محمد"
  }'
```

---

### `POST /api/auth/login`

**الوصف:** تسجيل دخول المستخدم. يضبط كوكيز المصادقة عند النجاح.
**الملف:** `controllers/auth.controller.ts`
**المصادقة:** عامة
**حد الطلبات:** 5 طلبات / 15 دقيقة

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `email` | `string` | نعم |
| `password` | `string` | نعم |

**المخرجات (200):**

```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"MySecure@Pass1"}'
```

---

### `POST /api/auth/logout`

**الوصف:** تسجيل خروج المستخدم، إلغاء الـ refreshToken، وحذف الكوكيز.
**الملف:** `controllers/auth.controller.ts`
**المصادقة:** عامة (يحتاج رمز CSRF)

**المخرجات (200):**

```json
{ "success": true, "message": "تم تسجيل الخروج بنجاح" }
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `POST /api/auth/refresh`

**الوصف:** تجديد الـ accessToken باستخدام الـ refreshToken الموجود في الكوكيز.
**الملف:** `controllers/auth.controller.ts`
**المصادقة:** يقرأ `refreshToken` من الكوكيز (يحتاج رمز CSRF)

**المخرجات (200):**

```json
{
  "success": true,
  "data": { "token": "eyJhbGciOiJIUzI1NiJ9..." }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `GET /api/auth/me`

**الوصف:** جلب بيانات المستخدم الحالي المسجّل دخوله.
**الملف:** `controllers/auth.controller.ts`
**المصادقة:** مطلوبة (authMiddleware)

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "أحمد",
      "lastName": "محمد",
      "accountStatus": "active"
    }
  }
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/auth/me \
  -b cookies.txt
```

---

## مصادقة Zero-Knowledge (ZK)

> نظام مصادقة يعتمد على مبدأ Zero-Knowledge: الخادم لا يرى كلمة المرور الأصلية أبداً، بل يستقبل فقط `authVerifier` (مشتق من كلمة المرور على جانب العميل). مفتاح التشفير (KEK) لا يغادر المتصفح.

### `POST /api/auth/zk-signup`

**الوصف:** تسجيل مستخدم جديد بمصادقة Zero-Knowledge.
**الملف:** `controllers/zkAuth.controller.ts`
**المصادقة:** عامة

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `email` | `string` | نعم | البريد الإلكتروني |
| `authVerifier` | `string` | نعم | المُحقِّق المشتق من كلمة المرور (لا ترسل كلمة المرور الأصلية) |
| `kdfSalt` | `string` | نعم | ملح اشتقاق المفتاح (يُخزَّن على الخادم ويُعاد للعميل) |
| `recoveryArtifact` | `string` | لا | مادة الاسترداد المشفرة |
| `recoveryIv` | `string` | لا | IV الخاص بمادة الاسترداد |

**المخرجات (201):**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "kdfSalt": "hex_salt_value"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/zk-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "authVerifier": "derived_verifier_hex",
    "kdfSalt": "random_salt_hex"
  }'
```

---

### `POST /api/auth/zk-login-init`

**الوصف:** المرحلة الأولى من تسجيل دخول ZK — جلب الـ `kdfSalt` المخصص للمستخدم لاشتقاق المفتاح على جانب العميل.
**الملف:** `controllers/zkAuth.controller.ts`
**المصادقة:** عامة

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `email` | `string` | نعم |

**المخرجات (200):**

```json
{
  "success": true,
  "data": { "kdfSalt": "hex_salt_value" }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/zk-login-init \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

---

### `POST /api/auth/zk-login-verify`

**الوصف:** المرحلة الثانية من تسجيل دخول ZK — التحقق من الـ `authVerifier` وإصدار الرمز.
**الملف:** `controllers/zkAuth.controller.ts`
**المصادقة:** عامة

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `email` | `string` | نعم |
| `authVerifier` | `string` | نعم |

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "kdfSalt": "hex_salt_value"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/zk-login-verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "authVerifier": "derived_verifier_hex"
  }'
```

---

### `POST /api/auth/recovery`

**الوصف:** جلب أو تحديث مادة الاسترداد المشفرة (Recovery Artifact).
**الملف:** `controllers/zkAuth.controller.ts`
**المصادقة:** مطلوبة (authMiddleware + CSRF)

**المدخلات (body) — جلب:**

```json
{ "action": "get" }
```

**المدخلات (body) — تحديث:**

```json
{
  "action": "update",
  "recoveryArtifact": "encrypted_blob_base64",
  "iv": "iv_base64"
}
```

**المخرجات (200) — جلب:**

```json
{
  "success": true,
  "data": {
    "encryptedRecoveryArtifact": "encrypted_blob",
    "iv": "iv_value",
    "createdAt": "2026-03-30T12:00:00.000Z"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/auth/recovery \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"action":"get"}'
```

---

## مجموعة المشاريع (Projects)

> جميع المسارات محمية بـ `authMiddleware`. المستخدم يرى مشاريعه فقط.

### `GET /api/projects`

**الوصف:** جلب جميع مشاريع المستخدم الحالي مرتبة حسب آخر تحديث.
**الملف:** `controllers/projects.controller.ts`

**المخرجات (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "فيلم الغروب",
      "scriptContent": "...",
      "userId": "uuid",
      "createdAt": "2026-03-30T12:00:00.000Z",
      "updatedAt": "2026-03-30T12:00:00.000Z"
    }
  ]
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/projects \
  -b cookies.txt
```

---

### `GET /api/projects/:id`

**الوصف:** جلب مشروع محدد بمعرّفه. يتحقق من ملكية المستخدم.
**الملف:** `controllers/projects.controller.ts`

**المعاملات:**

| المعامل | النوع | الوصف |
|---|---|---|
| `id` | `string` (UUID) | معرّف المشروع |

**مثال curl:**

```bash
curl http://localhost:3001/api/projects/550e8400-e29b-41d4-a716-446655440000 \
  -b cookies.txt
```

---

### `POST /api/projects`

**الوصف:** إنشاء مشروع جديد.
**الملف:** `controllers/projects.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | التحقق |
|---|---|---|---|
| `title` | `string` | نعم | يجب ألا يكون فارغاً |
| `scriptContent` | `string` | لا | نص السيناريو |

**المخرجات (201):**

```json
{
  "success": true,
  "message": "تم إنشاء المشروع بنجاح",
  "data": {
    "id": "uuid",
    "title": "فيلم الغروب",
    "scriptContent": null,
    "userId": "uuid",
    "createdAt": "2026-03-30T12:00:00.000Z",
    "updatedAt": "2026-03-30T12:00:00.000Z"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/projects \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"title":"فيلم الغروب","scriptContent":"فاد. داخلي. غرفة المعيشة - نهار"}'
```

---

### `PUT /api/projects/:id`

**الوصف:** تحديث عنوان أو محتوى مشروع موجود.
**الملف:** `controllers/projects.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `title` | `string` | لا |
| `scriptContent` | `string` | لا |

**مثال curl:**

```bash
curl -X PUT http://localhost:3001/api/projects/550e8400-e29b-41d4-a716-446655440000 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"title":"فيلم الغروب المحدّث"}'
```

---

### `DELETE /api/projects/:id`

**الوصف:** حذف مشروع. يتحقق من الملكية قبل الحذف.
**الملف:** `controllers/projects.controller.ts`
**CSRF:** مطلوب

**المخرجات (200):**

```json
{ "success": true, "message": "تم حذف المشروع بنجاح" }
```

**مثال curl:**

```bash
curl -X DELETE http://localhost:3001/api/projects/550e8400-e29b-41d4-a716-446655440000 \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `POST /api/projects/:id/analyze`

**الوصف:** تحليل نص السيناريو للمشروع باستخدام خط أنابيب المحطات السبع (AI). يستلزم وجود `scriptContent` في المشروع.
**الملف:** `controllers/projects.controller.ts`
**CSRF:** مطلوب
**حد الطلبات:** 20 طلب / ساعة

**المخرجات (200):**

```json
{
  "success": true,
  "message": "تم تحليل السيناريو بنجاح",
  "data": {
    "analysis": {
      "stationOutputs": { ... },
      "pipelineMetadata": { ... }
    },
    "projectId": "uuid"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/projects/550e8400-e29b-41d4-a716-446655440000/analyze \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

## مجموعة المشاهد (Scenes)

### `GET /api/projects/:projectId/scenes`

**الوصف:** جلب جميع مشاهد مشروع معين مرتبة حسب رقم المشهد.
**الملف:** `controllers/scenes.controller.ts`

**المعاملات:**

| المعامل | النوع | الوصف |
|---|---|---|
| `projectId` | `string` (UUID) | معرّف المشروع |

**مثال curl:**

```bash
curl http://localhost:3001/api/projects/550e8400-e29b-41d4-a716-446655440000/scenes \
  -b cookies.txt
```

---

### `GET /api/scenes/:id`

**الوصف:** جلب مشهد محدد بمعرّفه. يتحقق من ملكية المستخدم عبر المشروع المرتبط.
**الملف:** `controllers/scenes.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/scenes/scene-uuid \
  -b cookies.txt
```

---

### `POST /api/scenes`

**الوصف:** إنشاء مشهد جديد. يتحقق من ملكية المشروع المرتبط.
**الملف:** `controllers/scenes.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | التحقق |
|---|---|---|---|
| `projectId` | `string` | نعم | معرّف مشروع موجود |
| `sceneNumber` | `number` (int) | نعم | عدد صحيح موجب |
| `title` | `string` | نعم | غير فارغ |
| `location` | `string` | نعم | الموقع (داخلي/خارجي) |
| `timeOfDay` | `string` | نعم | وقت اليوم (نهار/ليل...) |
| `characters` | `string[]` | نعم | مصفوفة شخصيات (واحدة على الأقل) |
| `description` | `string` | لا | وصف المشهد |
| `shotCount` | `number` | لا | افتراضي: `0` |
| `status` | `string` | لا | افتراضي: `"planned"` |

**المخرجات (201):**

```json
{
  "success": true,
  "message": "تم إنشاء المشهد بنجاح",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "sceneNumber": 1,
    "title": "الافتتاحية",
    "location": "داخلي - الغرفة",
    "timeOfDay": "نهار",
    "characters": ["أحمد", "سارة"],
    "description": "...",
    "shotCount": 0,
    "status": "planned"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/scenes \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "sceneNumber": 1,
    "title": "الافتتاحية",
    "location": "داخلي - الغرفة",
    "timeOfDay": "نهار",
    "characters": ["أحمد", "سارة"]
  }'
```

---

### `PUT /api/scenes/:id`

**الوصف:** تحديث مشهد موجود.
**الملف:** `controllers/scenes.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):** نفس حقول `POST` (جميعها اختيارية عند التحديث).

**مثال curl:**

```bash
curl -X PUT http://localhost:3001/api/scenes/scene-uuid \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"title":"الافتتاحية المحدّثة","status":"completed"}'
```

---

### `DELETE /api/scenes/:id`

**الوصف:** حذف مشهد.
**الملف:** `controllers/scenes.controller.ts`
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X DELETE http://localhost:3001/api/scenes/scene-uuid \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

## مجموعة الشخصيات (Characters)

### `GET /api/projects/:projectId/characters`

**الوصف:** جلب جميع شخصيات مشروع معين.
**الملف:** `controllers/characters.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/projects/550e8400-e29b-41d4-a716-446655440000/characters \
  -b cookies.txt
```

---

### `GET /api/characters/:id`

**الوصف:** جلب شخصية محددة. يتحقق من ملكية المستخدم للمشروع المرتبط.
**الملف:** `controllers/characters.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/characters/char-uuid \
  -b cookies.txt
```

---

### `POST /api/characters`

**الوصف:** إنشاء شخصية جديدة في مشروع.
**الملف:** `controllers/characters.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | التحقق |
|---|---|---|---|
| `projectId` | `string` | نعم | معرّف مشروع موجود |
| `name` | `string` | نعم | غير فارغ |
| `appearances` | `number` (int) | لا | عدد غير سالب، افتراضي: `0` |
| `consistencyStatus` | `string` | لا | افتراضي: `"good"` |
| `lastSeen` | `string` | لا | آخر ظهور (نص حر) |
| `notes` | `string` | لا | ملاحظات |

**المخرجات (201):**

```json
{
  "success": true,
  "message": "تم إنشاء الشخصية بنجاح",
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "أحمد",
    "appearances": 0,
    "consistencyStatus": "good",
    "lastSeen": null,
    "notes": null
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/characters \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "أحمد",
    "appearances": 5
  }'
```

---

### `PUT /api/characters/:id`

**الوصف:** تحديث شخصية موجودة.
**الملف:** `controllers/characters.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):** نفس حقول `POST` (جميعها اختيارية، عدا `projectId`).

**مثال curl:**

```bash
curl -X PUT http://localhost:3001/api/characters/char-uuid \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"appearances":10,"consistencyStatus":"review"}'
```

---

### `DELETE /api/characters/:id`

**الوصف:** حذف شخصية.
**الملف:** `controllers/characters.controller.ts`
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X DELETE http://localhost:3001/api/characters/char-uuid \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

## مجموعة اللقطات (Shots)

### `GET /api/scenes/:sceneId/shots`

**الوصف:** جلب جميع لقطات مشهد معين مرتبة حسب رقم اللقطة. يتحقق من ملكية المستخدم.
**الملف:** `controllers/shots.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/scenes/scene-uuid/shots \
  -b cookies.txt
```

---

### `GET /api/shots/:id`

**الوصف:** جلب لقطة محددة بمعرّفها (JOIN على ثلاثة جداول للتحقق من الملكية).
**الملف:** `controllers/shots.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/shots/shot-uuid \
  -b cookies.txt
```

---

### `POST /api/shots`

**الوصف:** إنشاء لقطة جديدة في مشهد. يُحدِّث عداد اللقطات في المشهد تلقائياً.
**الملف:** `controllers/shots.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | التحقق |
|---|---|---|---|
| `sceneId` | `string` | نعم | معرّف مشهد موجود |
| `shotNumber` | `number` (int) | نعم | عدد صحيح موجب |
| `shotType` | `string` | نعم | نوع اللقطة (مثال: `"close-up"`) |
| `cameraAngle` | `string` | نعم | زاوية الكاميرا |
| `cameraMovement` | `string` | نعم | حركة الكاميرا |
| `lighting` | `string` | نعم | الإضاءة |
| `aiSuggestion` | `string` | لا | اقتراح الذكاء الاصطناعي |

**المخرجات (201):**

```json
{
  "success": true,
  "message": "تم إنشاء اللقطة بنجاح",
  "data": {
    "id": "uuid",
    "sceneId": "uuid",
    "shotNumber": 1,
    "shotType": "close-up",
    "cameraAngle": "eye-level",
    "cameraMovement": "static",
    "lighting": "natural",
    "aiSuggestion": null
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/shots \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "sceneId": "scene-uuid",
    "shotNumber": 1,
    "shotType": "close-up",
    "cameraAngle": "eye-level",
    "cameraMovement": "static",
    "lighting": "natural"
  }'
```

---

### `PUT /api/shots/:id`

**الوصف:** تحديث لقطة موجودة.
**الملف:** `controllers/shots.controller.ts`
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X PUT http://localhost:3001/api/shots/shot-uuid \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"shotType":"wide","lighting":"dramatic"}'
```

---

### `DELETE /api/shots/:id`

**الوصف:** حذف لقطة. يُحدِّث عداد اللقطات في المشهد تلقائياً (الحد الأدنى صفر).
**الملف:** `controllers/shots.controller.ts`
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X DELETE http://localhost:3001/api/shots/shot-uuid \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `POST /api/shots/suggestion`

**الوصف:** توليد اقتراح لقطة باستخدام Gemini AI بناءً على وصف المشهد ونوع اللقطة.
**الملف:** `controllers/shots.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `sceneDescription` | `string` | نعم |
| `shotType` | `string` | نعم |

**المخرجات (200):**

```json
{
  "success": true,
  "message": "تم توليد اقتراحات اللقطة بنجاح",
  "data": {
    "suggestion": "اقتراح الذكاء الاصطناعي هنا...",
    "sceneDescription": "...",
    "shotType": "close-up"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/shots/suggestion \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "sceneDescription": "مشهد درامي في الغرفة المظلمة",
    "shotType": "close-up"
  }'
```

---

## المستندات المشفرة (Encrypted Docs)

> نظام تخزين Zero-Knowledge: الخادم يخزّن فقط blob مشفرة ولا يفك تشفير أي محتوى. جميع المسارات محمية بـ `authMiddleware`.

### `POST /api/docs`

**الوصف:** إنشاء مستند مشفر جديد.
**الملف:** `controllers/encryptedDocs.controller.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `ciphertext` | `string` (base64) | نعم | النص المشفر |
| `iv` | `string` | نعم | Initialization Vector |
| `authTag` | `string` | نعم | وسم المصادقة (AES-GCM) |
| `wrappedDEK` | `string` | نعم | مفتاح تشفير البيانات الملفوف |
| `wrappedDEKiv` | `string` | نعم | IV الخاص بـ wrappedDEK |
| `version` | `number` | نعم | رقم إصدار التشفير |

**المخرجات (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "version": 1,
    "ciphertextSize": 2048,
    "createdAt": "2026-03-30T12:00:00.000Z",
    "lastModified": "2026-03-30T12:00:00.000Z"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/docs \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "ciphertext": "base64encodedciphertext==",
    "iv": "base64iv==",
    "authTag": "base64tag==",
    "wrappedDEK": "base64dek==",
    "wrappedDEKiv": "base64dekiv==",
    "version": 1
  }'
```

---

### `GET /api/docs`

**الوصف:** جلب قائمة المستندات المشفرة للمستخدم (metadata فقط — بدون محتوى).
**الملف:** `controllers/encryptedDocs.controller.ts`

**المخرجات (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "version": 1,
      "ciphertextSize": 2048,
      "createdAt": "2026-03-30T12:00:00.000Z",
      "lastModified": "2026-03-30T12:00:00.000Z"
    }
  ]
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/docs \
  -b cookies.txt
```

---

### `GET /api/docs/:id`

**الوصف:** جلب مستند مشفر كامل (ciphertext + مفاتيح).
**الملف:** `controllers/encryptedDocs.controller.ts`

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ciphertext": "base64encodedciphertext==",
    "iv": "base64iv==",
    "wrappedDEK": "base64dek==",
    "wrappedDEKiv": "base64dekiv==",
    "version": 1,
    "ciphertextSize": 2048,
    "createdAt": "2026-03-30T12:00:00.000Z",
    "lastModified": "2026-03-30T12:00:00.000Z"
  }
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/docs/doc-uuid \
  -b cookies.txt
```

---

### `PUT /api/docs/:id`

**الوصف:** تحديث مستند مشفر.
**الملف:** `controllers/encryptedDocs.controller.ts`
**CSRF:** مطلوب

**المدخلات:** نفس حقول `POST /api/docs`.

**مثال curl:**

```bash
curl -X PUT http://localhost:3001/api/docs/doc-uuid \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "ciphertext": "newbase64ciphertext==",
    "iv": "newiv==",
    "authTag": "newtag==",
    "wrappedDEK": "newdek==",
    "wrappedDEKiv": "newdekiv==",
    "version": 2
  }'
```

---

### `DELETE /api/docs/:id`

**الوصف:** حذف مستند مشفر.
**الملف:** `controllers/encryptedDocs.controller.ts`
**CSRF:** مطلوب

**المخرجات (200):**

```json
{ "success": true, "data": { "id": "uuid" } }
```

**مثال curl:**

```bash
curl -X DELETE http://localhost:3001/api/docs/doc-uuid \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

## مجموعة الذكاء الاصطناعي (AI)

### `POST /api/ai/chat`

**الوصف:** محادثة مع نموذج Gemini AI.
**الملف:** `controllers/ai.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | التحقق |
|---|---|---|---|
| `message` | `string` | نعم | غير فارغ |
| `context` | `any` | لا | سياق إضافي للمحادثة |

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "response": "رد الذكاء الاصطناعي هنا...",
    "timestamp": "2026-03-30T12:00:00.000Z"
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/ai/chat \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"message":"ساعدني في تحليل مشهد الغروب"}'
```

---

### `POST /api/ai/shot-suggestion`

**الوصف:** توليد اقتراح تصويري من Gemini AI.
**الملف:** `controllers/ai.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `sceneDescription` | `string` | نعم |
| `shotType` | `string` | نعم |

**المخرجات (200):**

```json
{
  "success": true,
  "data": { "suggestion": "..." }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/ai/shot-suggestion \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"sceneDescription":"مشهد هادئ في الطبيعة","shotType":"wide"}'
```

---

## مجموعة التحليل (Analysis)

### `POST /api/analysis/seven-stations`

**الوصف:** تشغيل خط أنابيب المحطات السبع لتحليل نص سيناريو. يدعم التنفيذ المتزامن أو غير المتزامن (عبر BullMQ).
**الملف:** `controllers/analysis.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب
**حد الطلبات:** 20 طلب / ساعة

**المحطات السبع:**

| المحطة | الاسم | الوظيفة |
|---|---|---|
| S1 | التحليل التأسيسي | تحليل البنية الأساسية للنص |
| S2 | التحليل المفاهيمي | استخراج الثيمات والمفاهيم |
| S3 | شبكة الصراعات | تحليل العلاقات والصراعات |
| S4 | مقاييس الفعالية | قياس فعالية النص الدرامي |
| S5 | الديناميكية والرمزية | تحليل الرموز والديناميكية |
| S6 | الفريق الأحمر | التحليل النقدي متعدد الوكلاء |
| S7 | التقرير النهائي | إنشاء التقرير الشامل |

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `text` | `string` | نعم | النص المراد تحليله |
| `async` | `boolean` | لا | إذا `true` يُضيف المهمة لقائمة الانتظار ويُرجع `jobId` |

**المخرجات المتزامنة (200):**

```json
{
  "success": true,
  "report": "التقرير النهائي...",
  "confidence": 0.85,
  "executionTime": 12500,
  "timestamp": "2026-03-30T12:00:00.000Z",
  "stationsCount": 7,
  "detailedResults": { "station1": {}, "station7": {} },
  "metadata": {}
}
```

**المخرجات غير المتزامنة (200):**

```json
{
  "success": true,
  "jobId": "job-id-123",
  "message": "تم إضافة التحليل إلى قائمة الانتظار",
  "checkStatus": "/api/queue/jobs/job-id-123",
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl (متزامن):**

```bash
curl -X POST http://localhost:3001/api/analysis/seven-stations \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"text":"نص السيناريو كاملاً هنا..."}'
```

**مثال curl (غير متزامن):**

```bash
curl -X POST http://localhost:3001/api/analysis/seven-stations \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"text":"نص السيناريو...","async":true}'
```

---

### `GET /api/analysis/stations-info`

**الوصف:** جلب معلومات المحطات السبع (الأسماء، الأوصاف، ترتيب التنفيذ).
**الملف:** `controllers/analysis.controller.ts`
**المصادقة:** مطلوبة

**المخرجات (200):**

```json
{
  "stations": [
    { "id": "S1", "name": "التحليل التأسيسي", "description": "تحليل البنية الأساسية للنص" },
    { "id": "S7", "name": "التقرير النهائي", "description": "إنشاء التقرير الشامل" }
  ],
  "totalStations": 7,
  "executionOrder": "تسلسلي (1→7)",
  "outputFormat": "نص عربي منسق"
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/analysis/stations-info \
  -b cookies.txt
```

---

## مجموعة النقد الذاتي (Critique)

### `GET /api/critique/config`

**الوصف:** جلب جميع تكوينات النقد الذاتي المتاحة.
**الملف:** `controllers/critique.controller.ts`
**المصادقة:** مطلوبة

**المخرجات (200):**

```json
{
  "success": true,
  "data": [ { "taskType": "...", "dimensions": [], "thresholds": {} } ],
  "count": 5,
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/critique/config \
  -b cookies.txt
```

---

### `GET /api/critique/config/:taskType`

**الوصف:** جلب تكوين النقد لنوع مهمة محدد.
**الملف:** `controllers/critique.controller.ts`
**المصادقة:** مطلوبة

**المعاملات:**

| المعامل | النوع | الوصف |
|---|---|---|
| `taskType` | `string` (TaskType enum) | نوع المهمة |

**مثال curl:**

```bash
curl http://localhost:3001/api/critique/config/SCENE_ANALYSIS \
  -b cookies.txt
```

---

### `GET /api/critique/dimensions/:taskType`

**الوصف:** جلب تفاصيل أبعاد النقد لنوع مهمة محدد.
**الملف:** `controllers/critique.controller.ts`
**المصادقة:** مطلوبة

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "dimensions": [],
    "thresholds": {},
    "maxIterations": 3,
    "enableAutoCorrection": true
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/critique/dimensions/SCENE_ANALYSIS \
  -b cookies.txt
```

---

### `POST /api/critique/summary`

**الوصف:** تطبيق النقد الذاتي المحسّن على مخرج محدد وإرجاع التقييم والاقتراحات.
**الملف:** `controllers/critique.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `output` | `string` | نعم | المخرج المراد نقده |
| `task` | `string` | نعم | وصف المهمة |
| `context` | `object` | نعم | سياق النقد |
| `context.taskType` | `string` (TaskType) | نعم | نوع المهمة |
| `context.originalText` | `string` | نعم | النص الأصلي |
| `customConfig` | `object` | لا | تكوين مخصص اختياري |

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "overallScore": 0.85,
    "overallLevel": "excellent",
    "improved": true,
    "iterations": 2,
    "dimensions": {}
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/critique/summary \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "output": "نتيجة التحليل...",
    "task": "تحليل مشهد درامي",
    "context": {
      "taskType": "SCENE_ANALYSIS",
      "originalText": "النص الأصلي للمشهد"
    }
  }'
```

---

## مجموعة Breakdown

### `GET /api/breakdown/health`

**الوصف:** فحص صحة خدمة Breakdown.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** عامة

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "service": "breakdown",
    "status": "ok",
    "timestamp": "2026-03-30T12:00:00.000Z"
  }
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/breakdown/health
```

---

### `POST /api/breakdown/projects/bootstrap`

**الوصف:** إنشاء مشروع جديد وتحليل السيناريو في خطوة واحدة (Bootstrap).
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب | التحقق |
|---|---|---|---|
| `scriptContent` | `string` | نعم | نص السيناريو (غير فارغ) |
| `title` | `string` | لا | عنوان المشروع |

**المخرجات (201):**

```json
{
  "success": true,
  "data": {
    "project": { "id": "uuid", "title": "..." },
    "scenes": [],
    "characters": []
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/breakdown/projects/bootstrap \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"scriptContent":"INT. المنزل - نهار\nأحمد يدخل...","title":"مشروعي الجديد"}'
```

---

### `POST /api/breakdown/projects/:projectId/parse`

**الوصف:** تحليل نص السيناريو لمشروع موجود وتقسيمه إلى مشاهد.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**المعاملات:**

| المعامل | النوع | الوصف |
|---|---|---|
| `projectId` | `string` | معرّف المشروع |

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `scriptContent` | `string` | لا (يستخدم محتوى المشروع الموجود) |
| `title` | `string` | لا |

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/breakdown/projects/proj-uuid/parse \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{}'
```

---

### `POST /api/breakdown/projects/:projectId/analyze`

**الوصف:** تحليل مشروع Breakdown كامل وإنشاء التقرير.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/breakdown/projects/proj-uuid/analyze \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `GET /api/breakdown/projects/:projectId/report`

**الوصف:** جلب تقرير Breakdown لمشروع.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة

**مثال curl:**

```bash
curl http://localhost:3001/api/breakdown/projects/proj-uuid/report \
  -b cookies.txt
```

---

### `GET /api/breakdown/projects/:projectId/schedule`

**الوصف:** جلب جدول تصوير المشروع.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة

**مثال curl:**

```bash
curl http://localhost:3001/api/breakdown/projects/proj-uuid/schedule \
  -b cookies.txt
```

---

### `GET /api/breakdown/scenes/:sceneId`

**الوصف:** جلب تفكيك مشهد محدد.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة

**مثال curl:**

```bash
curl http://localhost:3001/api/breakdown/scenes/scene-uuid \
  -b cookies.txt
```

---

### `POST /api/breakdown/scenes/:sceneId/reanalyze`

**الوصف:** إعادة تحليل مشهد محدد.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/breakdown/scenes/scene-uuid/reanalyze \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `GET /api/breakdown/reports/:reportId/export`

**الوصف:** تصدير تقرير Breakdown بتنسيق JSON أو CSV.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة

**معاملات الاستعلام:**

| المعامل | النوع | القيم | الافتراضي |
|---|---|---|---|
| `format` | `string` | `json` \| `csv` | `json` |

**مثال curl:**

```bash
curl "http://localhost:3001/api/breakdown/reports/report-uuid/export?format=json" \
  -b cookies.txt
```

---

### `POST /api/breakdown/chat`

**الوصف:** محادثة ذكاء اصطناعي في سياق Breakdown.
**الملف:** `controllers/breakdown.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `message` | `string` | نعم |
| `context` | `object` | لا |

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/breakdown/chat \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"message":"كم عدد المشاهد الليلية في المشروع؟"}'
```

---

## مجموعة قوائم الانتظار (Queue)

### `GET /api/queue/jobs/:jobId`

**الوصف:** الحصول على حالة مهمة محددة في قائمة الانتظار.
**الملف:** `controllers/queue.controller.ts`
**المصادقة:** مطلوبة

**المعاملات:**

| المعامل | النوع | الوصف |
|---|---|---|
| `jobId` | `string` | معرّف المهمة |

**معاملات الاستعلام:**

| المعامل | النوع | الافتراضي | الوصف |
|---|---|---|---|
| `queue` | `string` | `ai-analysis` | اسم الطابور (`ai-analysis`, `document-processing`, `notifications`, `export`, `cache-warming`) |

**المخرجات (200):**

```json
{
  "success": true,
  "job": {
    "id": "job-id",
    "name": "ai-analysis",
    "state": "completed",
    "progress": 100,
    "result": { "entityId": "...", "analysis": {} },
    "error": null,
    "data": { "type": "scene", "entityId": "..." },
    "timestamp": 1711800000000,
    "processedOn": 1711800001000,
    "finishedOn": 1711800013000,
    "attemptsMade": 1
  }
}
```

**مثال curl:**

```bash
curl "http://localhost:3001/api/queue/jobs/job-id-123?queue=ai-analysis" \
  -b cookies.txt
```

---

### `GET /api/queue/stats`

**الوصف:** جلب إحصائيات جميع قوائم الانتظار.
**الملف:** `controllers/queue.controller.ts`
**المصادقة:** مطلوبة

**المخرجات (200):**

```json
{
  "success": true,
  "stats": [
    {
      "name": "ai-analysis",
      "waiting": 5,
      "active": 2,
      "completed": 100,
      "failed": 3,
      "delayed": 0,
      "total": 110
    }
  ],
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/queue/stats \
  -b cookies.txt
```

---

### `GET /api/queue/:queueName/stats`

**الوصف:** جلب إحصائيات طابور محدد.
**الملف:** `controllers/queue.controller.ts`
**المصادقة:** مطلوبة

**المعاملات:**

| المعامل | القيم المقبولة |
|---|---|
| `queueName` | `ai-analysis` \| `document-processing` \| `notifications` \| `export` \| `cache-warming` |

**مثال curl:**

```bash
curl http://localhost:3001/api/queue/ai-analysis/stats \
  -b cookies.txt
```

---

### `POST /api/queue/jobs/:jobId/retry`

**الوصف:** إعادة محاولة تنفيذ مهمة فاشلة.
**الملف:** `controllers/queue.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**معاملات الاستعلام:** نفس `GET /api/queue/jobs/:jobId`

**المخرجات (200):**

```json
{
  "success": true,
  "message": "تم إعادة محاولة المهمة",
  "jobId": "job-id"
}
```

**مثال curl:**

```bash
curl -X POST "http://localhost:3001/api/queue/jobs/job-id-123/retry?queue=ai-analysis" \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `POST /api/queue/:queueName/clean`

**الوصف:** تنظيف المهام المكتملة أو الفاشلة القديمة من طابور.
**الملف:** `controllers/queue.controller.ts`
**المصادقة:** مطلوبة
**CSRF:** مطلوب

**معاملات الاستعلام:**

| المعامل | النوع | الافتراضي | الوصف |
|---|---|---|---|
| `grace` | `number` | `86400000` (24 ساعة) | فترة الاحتفاظ بالمهام (ms) |

**مثال curl:**

```bash
curl -X POST "http://localhost:3001/api/queue/ai-analysis/clean?grace=3600000" \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

## مجموعة المقاييس (Metrics)

> جميع المسارات محمية بـ `authMiddleware`.

### `GET /api/metrics/snapshot`

**الوصف:** أخذ لقطة شاملة من مقاييس النظام الحالية.
**الملف:** `controllers/metrics.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/metrics/snapshot \
  -b cookies.txt
```

---

### `GET /api/metrics/latest`

**الوصف:** جلب آخر لقطة مقاييس (أو أخذ لقطة جديدة إن لم تكن موجودة).
**الملف:** `controllers/metrics.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/metrics/latest \
  -b cookies.txt
```

---

### `GET /api/metrics/range`

**الوصف:** جلب مقاييس لنطاق زمني محدد.
**الملف:** `controllers/metrics.controller.ts`

**معاملات الاستعلام:**

| المعامل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `start` | `string` (ISO 8601) | نعم | بداية النطاق |
| `end` | `string` (ISO 8601) | نعم | نهاية النطاق |

**مثال curl:**

```bash
curl "http://localhost:3001/api/metrics/range?start=2026-03-30T00:00:00Z&end=2026-03-30T23:59:59Z" \
  -b cookies.txt
```

---

### `GET /api/metrics/database`

**الوصف:** جلب مقاييس قاعدة البيانات (عدد الاستعلامات، المتوسط، الاستعلامات البطيئة).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/redis`

**الوصف:** جلب مقاييس Redis (hit ratio، الضغطات، الأخطاء، الذاكرة).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/queue`

**الوصف:** جلب مقاييس قوائم الانتظار (المهام النشطة، المكتملة، الفاشلة).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/api`

**الوصف:** جلب مقاييس API (إجمالي الطلبات، متوسط وقت الاستجابة، معدل الخطأ).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/resources`

**الوصف:** جلب مقاييس موارد النظام (CPU، الذاكرة، الطلبات المتزامنة).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/gemini`

**الوصف:** جلب مقاييس Gemini API (الطلبات، المدة، cache hit ratio، معدل الخطأ).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/report`

**الوصف:** توليد تقرير أداء شامل لنطاق زمني.
**الملف:** `controllers/metrics.controller.ts`

**معاملات الاستعلام:** `start` و `end` (اختياريان، الافتراضي: آخر ساعة).

**مثال curl:**

```bash
curl "http://localhost:3001/api/metrics/report?start=2026-03-30T10:00:00Z&end=2026-03-30T11:00:00Z" \
  -b cookies.txt
```

---

### `GET /api/metrics/health`

**الوصف:** حالة صحة النظام من منظور المقاييس (healthy / degraded / critical).
**الملف:** `controllers/metrics.controller.ts`

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "isUnderPressure": false,
    "timestamp": "2026-03-30T12:00:00.000Z",
    "resources": { "cpu": {}, "memory": {}, "concurrentRequests": 5 },
    "metrics": {
      "errorRate": 0.001,
      "avgResponseTime": 120,
      "cacheHitRatio": 0.85,
      "activeJobs": 3
    }
  }
}
```

---

### `GET /api/metrics/dashboard`

**الوصف:** جلب ملخص لوحة التحكم الشاملة (overview، database، redis، queue، resources، gemini).
**الملف:** `controllers/metrics.controller.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/metrics/dashboard \
  -b cookies.txt
```

---

### `GET /api/metrics/cache/snapshot`

**الوصف:** لقطة من مقاييس Cache.
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/cache/realtime`

**الوصف:** إحصائيات Cache الفورية (real-time).
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/cache/health`

**الوصف:** حالة صحة Cache.
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/cache/report`

**الوصف:** تقرير أداء Cache لنطاق زمني.
**الملف:** `controllers/metrics.controller.ts`

**معاملات الاستعلام:** `start` و `end` (الافتراضي: آخر ساعة).

---

### `GET /api/metrics/apm/dashboard`

**الوصف:** لوحة APM (Application Performance Monitoring) — P50/P95/P99 للكمون، Throughput، معدلات الخطأ، التنبيهات.
**الملف:** `controllers/metrics.controller.ts`

---

### `GET /api/metrics/apm/config`

**الوصف:** جلب إعدادات APM (الحدود الحرجة، معدلات أخذ العينات).
**الملف:** `controllers/metrics.controller.ts`

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "thresholds": {
      "apiResponse": 2000,
      "geminiCall": 10000,
      "dbQuery": 500,
      "redisOperation": 100
    },
    "errorRateThreshold": 0.05,
    "sampleRates": { "traces": 0.1, "profiles": 0.01 }
  }
}
```

---

### `POST /api/metrics/apm/reset`

**الوصف:** إعادة تعيين عدادات مقاييس APM.
**الملف:** `controllers/metrics.controller.ts`
**CSRF:** مطلوب

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/metrics/apm/reset \
  -b cookies.txt \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

---

### `GET /api/metrics/apm/alerts`

**الوصف:** جلب تنبيهات APM الحالية بناءً على الحدود المُعرَّفة.
**الملف:** `controllers/metrics.controller.ts`

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "current": { "p95AboveThreshold": false, "errorRateAboveThreshold": false },
    "thresholds": { "p95Latency": 2000, "errorRate": 0.05 },
    "metrics": { "p95Latency": 150, "errorRate": 0.001 },
    "status": "ok"
  }
}
```

---

## مجموعة جدار الحماية (WAF)

> جميع المسارات محمية بـ `authMiddleware` ومخصصة للمسؤول.

### `GET /api/waf/stats`

**الوصف:** جلب إحصائيات WAF (الطلبات المحجوبة، الهجمات المكتشفة).
**الملف:** `server.ts` (مُعرَّف مباشرة)

**مثال curl:**

```bash
curl http://localhost:3001/api/waf/stats \
  -b cookies.txt
```

---

### `GET /api/waf/events`

**الوصف:** جلب سجل أحداث WAF.
**الملف:** `server.ts`

**معاملات الاستعلام:**

| المعامل | النوع | الافتراضي |
|---|---|---|
| `limit` | `number` | `100` |

**مثال curl:**

```bash
curl "http://localhost:3001/api/waf/events?limit=50" \
  -b cookies.txt
```

---

### `GET /api/waf/config`

**الوصف:** جلب إعدادات WAF الحالية.
**الملف:** `server.ts`

---

### `PUT /api/waf/config`

**الوصف:** تحديث إعدادات WAF.
**الملف:** `server.ts`
**CSRF:** مطلوب

**المدخلات (body):** كائن إعدادات WAF (يعتمد على `waf.middleware.ts`).

**مثال curl:**

```bash
curl -X PUT http://localhost:3001/api/waf/config \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"enabled":true,"blockSQLi":true}'
```

---

### `GET /api/waf/blocked-ips`

**الوصف:** جلب قائمة عناوين IP المحجوبة.
**الملف:** `server.ts`

**مثال curl:**

```bash
curl http://localhost:3001/api/waf/blocked-ips \
  -b cookies.txt
```

---

### `POST /api/waf/block-ip`

**الوصف:** حجب عنوان IP محدد.
**الملف:** `server.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `ip` | `string` | نعم |
| `reason` | `string` | لا |

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/waf/block-ip \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"ip":"192.168.1.100","reason":"نشاط مشبوه"}'
```

---

### `POST /api/waf/unblock-ip`

**الوصف:** رفع الحجب عن عنوان IP.
**الملف:** `server.ts`
**CSRF:** مطلوب

**المدخلات (body):**

| الحقل | النوع | مطلوب |
|---|---|---|
| `ip` | `string` | نعم |

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/waf/unblock-ip \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"ip":"192.168.1.100"}'
```

---

## نظام الذاكرة (Memory)

> جميع المسارات محمية بـ `authMiddleware`. تعتمد على Weaviate (قاعدة بيانات متجهات) وGemini AI للتضمينات.

### `GET /api/memory/health`

**الوصف:** التحقق من صحة نظام الذاكرة (اتصال Weaviate، تكوين Gemini).
**الملف:** `memory/api/routes.ts`

**المخرجات (200):**

```json
{
  "status": "healthy",
  "weaviate": "connected",
  "gemini": "configured",
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/memory/health \
  -b cookies.txt
```

---

### `POST /api/memory/context`

**الوصف:** بناء سياق ذكي للوكيل بناءً على استعلام دلالي (النقطة الرئيسية لنظام الذاكرة).
**الملف:** `memory/api/routes.ts`

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `query` | `string` | نعم | استعلام البحث |
| `agentId` | `string` | نعم | معرّف الوكيل الطالب |
| `maxResults` | `number` | لا | أقصى عدد نتائج |
| `collections` | `string[]` | لا | مجموعات البحث |

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "context": "سياق مبني للوكيل...",
    "sources": []
  }
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/memory/context \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"query":"كيف يعمل نظام المصادقة؟","agentId":"agent-001"}'
```

---

### `POST /api/memory/search`

**الوصف:** بحث دلالي مباشر في قاعدة بيانات المتجهات.
**الملف:** `memory/api/routes.ts`

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `query` | `string` | نعم | نص البحث |
| `collection` | `string` | لا | المجموعة (`CodeChunks` \| `Documentation` \| `Decisions` \| `Architecture`) |
| `topK` | `number` | لا | عدد النتائج، افتراضي: `10` |

**المخرجات (200):**

```json
{
  "success": true,
  "count": 5,
  "results": [
    {
      "content": "محتوى (أول 500 حرف)...",
      "source": "src/services/auth.service.ts",
      "type": "code",
      "relevance": 0.92,
      "metadata": {}
    }
  ]
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/memory/search \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"query":"JWT authentication","collection":"CodeChunks","topK":5}'
```

---

### `POST /api/memory/index`

**الوصف:** فهرسة المستودع أو ملفات محددة في قاعدة بيانات المتجهات.
**الملف:** `memory/api/routes.ts`

**المدخلات (body):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `repoPath` | `string` | لا | مسار المستودع (افتراضي: `process.cwd()`) |
| `specificFiles` | `string[]` | لا | ملفات محددة للفهرسة |
| `reset` | `boolean` | لا | حذف المجموعات الموجودة أولاً |
| `dimensionality` | `number` | لا | أبعاد التضمين: `768` \| `1536` \| `3072` (افتراضي: `1536`) |

**المخرجات (200):**

```json
{
  "success": true,
  "message": "Queued 250 files for indexing",
  "filesCount": 250,
  "collections": ["CodeChunks", "Documentation", "Decisions", "Architecture"],
  "dimensionality": 1536
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/memory/index \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"reset":false,"dimensionality":1536}'
```

---

### `GET /api/memory/stats`

**الوصف:** إحصائيات نظام الذاكرة (عدد الوثائق في كل مجموعة).
**الملف:** `memory/api/routes.ts`

**المخرجات (200):**

```json
{
  "collections": {
    "CodeChunks": 1500,
    "Documentation": 200,
    "Decisions": 45,
    "Architecture": 30
  },
  "totalDocuments": 1775,
  "storage": { "weaviate": "http://localhost:8080" }
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/memory/stats \
  -b cookies.txt
```

---

### `POST /api/memory/remember`

**الوصف:** تخزين معلومة جديدة (قرار، توثيق) في قاعدة بيانات المتجهات.
**الملف:** `memory/api/routes.ts`

**المدخلات (body):**

| الحقل | النوع | مطلوب | القيم |
|---|---|---|---|
| `type` | `string` | نعم | `decision` \| `documentation` |
| `content` | `string` | نعم | المحتوى |
| `metadata` | `object` | لا | بيانات وصفية إضافية |
| `tags` | `string[]` | لا | وسوم |

**للنوع `decision` — metadata:**

| الحقل | الوصف |
|---|---|
| `decisionId` | معرّف ADR (افتراضي: `ADR-{timestamp}`) |
| `title` | عنوان القرار |
| `status` | الحالة (`proposed`, `accepted`, `deprecated`) |
| `context` | سياق القرار |
| `decision` | نص القرار |
| `consequences` | العواقب |

**مثال curl:**

```bash
curl -X POST http://localhost:3001/api/memory/remember \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "decision",
    "content": "تم اختيار PostgreSQL كقاعدة البيانات الرئيسية",
    "metadata": {
      "title": "اختيار قاعدة البيانات",
      "status": "accepted"
    },
    "tags": ["database", "architecture"]
  }'
```

---

### `GET /api/memory/mrl/recommend`

**الوصف:** توصية بأفضل بُعد MRL (Matryoshka Representation Learning) لتضمينات المتجهات.
**الملف:** `memory/api/routes.ts`

**معاملات الاستعلام:**

| المعامل | النوع | الافتراضي | الوصف |
|---|---|---|---|
| `documentCount` | `number` | `1000` | العدد المتوقع للمستندات |
| `queryFrequency` | `string` | `medium` | تكرار الاستعلامات (`high` \| `medium` \| `low`) |
| `precisionRequirement` | `string` | `standard` | متطلبات الدقة (`critical` \| `standard` \| `flexible`) |
| `storageBudgetMB` | `number` | - | ميزانية التخزين |

**المخرجات (200):**

```json
{
  "recommendedDimension": 1536,
  "alternatives": { "precision": 3072, "balanced": 1536, "storage": 768 },
  "storageComparison": {}
}
```

**مثال curl:**

```bash
curl "http://localhost:3001/api/memory/mrl/recommend?documentCount=5000&queryFrequency=high&precisionRequirement=standard" \
  -b cookies.txt
```

---

## نقاط نهاية الصحة (Health)

> هذه النقاط عامة (لا تحتاج مصادقة) وتستخدم لـ Blue-Green Deployment وفحوصات Kubernetes.

### `GET /health` و `GET /api/health`

**الوصف:** فحص صحة شامل (Database + Redis + Memory).
**الملف:** `controllers/health.controller.ts`

**المخرجات (200 أو 503):**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400000,
  "checks": {
    "database": { "status": "healthy", "responseTime": 5 },
    "redis": { "status": "healthy", "responseTime": 2 },
    "memory": { "status": "healthy", "responseTime": 45 }
  }
}
```

**مثال curl:**

```bash
curl http://localhost:3001/health
```

---

### `GET /health/live`

**الوصف:** Liveness probe — هل الخادم حي ويستجيب؟

**المخرجات (200):**

```json
{
  "status": "alive",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "uptime": 86400000
}
```

---

### `GET /health/ready`

**الوصف:** Readiness probe — هل الخادم جاهز لاستقبال الحركة؟ (Database + Redis + External Services)

**المخرجات (200 أو 503):**

```json
{
  "status": "ready",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "external_services": { "status": "healthy" }
  }
}
```

---

### `GET /health/startup`

**الوصف:** Startup probe — هل انتهى تشغيل الخادم؟ (يُعتبر ناجحاً بعد 30 ثانية من بدء التشغيل)

**المخرجات (200 أو 503):**

```json
{
  "status": "started",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "uptime": 45000,
  "startTime": "2026-03-30T11:59:15.000Z"
}
```

---

### `GET /health/detailed`

**الوصف:** فحص صحة تفصيلي (Database + Redis + Memory + Disk + External Services + Environment Variables).

**المخرجات (200 أو 503):**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400000,
  "environment": "production",
  "checks": {
    "database": { "status": "healthy", "responseTime": 5 },
    "redis": { "status": "healthy", "responseTime": 2 },
    "memory": { "status": "healthy", "responseTime": 45 },
    "disk": { "status": "healthy", "responseTime": 75 },
    "external_services": { "status": "healthy", "responseTime": 100 },
    "environment": { "status": "healthy", "responseTime": 0 }
  }
}
```

---

## Prometheus Metrics

### `GET /metrics`

**الوصف:** نقطة نهاية Prometheus لجمع المقاييس. تُرجع بيانات بتنسيق Prometheus النصي.
**الملف:** `middleware/metrics.middleware.ts`
**المصادقة:** عامة
**Content-Type الاستجابة:** `text/plain; version=0.0.4`

**مثال curl:**

```bash
curl http://localhost:3001/metrics
```

---

## Gemini Cost

### `GET /api/gemini/cost-summary`

**الوصف:** ملخص تكلفة استخدام Gemini API (للمسؤول فقط).
**الملف:** `server.ts` (مُعرَّف مباشرة)
**المصادقة:** مطلوبة (authMiddleware)

**المخرجات (200):**

```json
{
  "success": true,
  "data": {
    "totalCost": 0.45,
    "requestCount": 150,
    "tokenCount": 250000,
    "period": "..."
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**مثال curl:**

```bash
curl http://localhost:3001/api/gemini/cost-summary \
  -b cookies.txt
```

---

## لوحة Bull Board

### `GET /admin/queues`

**الوصف:** لوحة مراقبة BullMQ بواجهة مرئية. تُعرض قوائم الانتظار، المهام، والإحصائيات.
**الملف:** `middleware/bull-board.middleware.ts`
**المصادقة:** مطلوبة (Basic Auth أو JWT حسب الإعدادات)

**الوصول:** `http://localhost:3001/admin/queues`

---

## MCP Server

> يعمل على منفذ منفصل يُحدَّد بمتغير البيئة `MCP_PORT` (افتراضي: `3000`). يستخدم بروتوكول MCP (Model Context Protocol) مع نقل HTTP قابل للبث.

**الملف:** `src/mcp-server.ts`
**البروتوكول:** HTTP + JSON (Streamable HTTP Transport)

### `POST /mcp`

**الوصف:** نقطة الدخول الوحيدة لخادم MCP. يستقبل طلبات MCP ويوجهها للأداة المناسبة.

**أدوات MCP المسجّلة:**

#### أداة `add`

| الخاصية | القيمة |
|---|---|
| الاسم | `add` |
| الوصف | جمع عددين (Addition Tool) |
| المدخلات | `a: number`, `b: number` |
| المخرجات | `{ result: number }` (نص + بيانات منظمة) |

**مثال طلب MCP:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "add",
    "arguments": { "a": 5, "b": 3 }
  },
  "id": 1
}
```

**مثال curl:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {"name": "add", "arguments": {"a": 5, "b": 3}},
    "id": 1
  }'
```

**موارد MCP المسجّلة:**

#### مورد `greeting`

| الخاصية | القيمة |
|---|---|
| الاسم | `greeting` |
| القالب | `greeting://{name}` |
| الوصف | مولّد تحية ديناميكي |
| الإرجاع | `Hello, {name}!` |

---

## أحداث Socket.io (WebSocket)

> الاتصال على نفس منفذ HTTP (3001) عبر Socket.io. المصادقة تعتمد على رمز JWT في `handshake.auth.token` أو كوكي `accessToken`.

### الغرف (Rooms)

| الغرفة | النمط | الوصف |
|---|---|---|
| غرفة المستخدم | `user:{userId}` | أحداث خاصة بالمستخدم |
| غرفة المشروع | `project:{projectId}` | أحداث خاصة بالمشروع |
| غرفة الطابور | `queue:{queueName}` | أحداث خاصة بطابور انتظار |

### الأحداث الصادرة (Server → Client)

| الحدث | الوصف | بيانات الحدث |
|---|---|---|
| `connected` | تأكيد الاتصال | `{ socketId, message, timestamp }` |
| `authenticated` | تأكيد المصادقة | `{ message, userId, timestamp }` |
| `unauthorized` | فشل المصادقة / انقضاء المهلة | `{ message }` |
| `disconnected` | انقطاع الاتصال | `{ message, timestamp }` |
| `job:progress` | تقدم مهمة | `{ jobId, queueName, progress, userId?, timestamp, eventType }` |
| `job:started` | بدء مهمة | `{ jobId, queueName, userId?, timestamp, eventType }` |
| `job:completed` | اكتمال مهمة | `{ jobId, queueName, result, userId?, timestamp, eventType }` |
| `job:failed` | فشل مهمة | `{ jobId, queueName, error, userId?, timestamp, eventType }` |
| `system:info` | رسالة معلومات | `{ message, timestamp }` |
| `system:error` | رسالة خطأ | `{ message }` |

### الأحداث الواردة (Client → Server)

| الحدث | الوصف | البيانات المطلوبة |
|---|---|---|
| `authenticate` | مصادقة العميل | `{ token?: string, userId?: string }` |
| `subscribe` | الاشتراك في غرفة | `{ room: string }` |
| `unsubscribe` | إلغاء الاشتراك من غرفة | `{ room: string }` |
| `disconnect` | قطع الاتصال | — |
| `error` | خطأ من العميل | — |

### مثال اتصال JavaScript

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' },
  withCredentials: true,
});

socket.on('connected', (data) => {
  console.log('متصل:', data.socketId);
});

socket.on('job:progress', (data) => {
  console.log(`تقدم المهمة ${data.jobId}: ${data.progress}%`);
});

socket.emit('subscribe', { room: 'queue:ai-analysis' });
```

---

## أحداث SSE (Server-Sent Events)

> خدمة SSE للبث الفوري من الخادم إلى العميل. تُستخدم للعمليات طويلة الأمد.

### تنسيق رسالة SSE

```
id: <event-id>
event: <event-type>
data: <json-payload>

```

### أنواع الأحداث

| نوع الحدث | الوصف | بيانات الحمولة |
|---|---|---|
| `connected` | تأكيد اتصال SSE | `{ timestamp, eventType, message }` |
| `disconnected` | قطع الاتصال | `{ timestamp, eventType, message }` |
| `job:progress` | تقدم مهمة | `{ jobId, progress, timestamp, eventType }` |
| `job:started` | بدء مهمة | `{ jobId, timestamp, eventType }` |
| `job:completed` | اكتمال مهمة | `{ jobId, result, timestamp, eventType }` |
| `job:failed` | فشل مهمة | `{ jobId, error, timestamp, eventType }` |
| `system:info` | رسالة معلومات | `{ message, timestamp, level: 'info' }` |
| `system:error` | رسالة خطأ | `{ message, timestamp }` |

### Keep-Alive

يُرسَل تعليق keep-alive كل 30 ثانية لإبقاء الاتصال مفتوحاً:

```
: keep-alive

```

### مثال اتصال JavaScript

```javascript
const eventSource = new EventSource('http://localhost:3001/api/events', {
  withCredentials: true,
});

eventSource.addEventListener('job:completed', (event) => {
  const data = JSON.parse(event.data);
  console.log('اكتملت المهمة:', data.jobId);
});

eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('SSE متصل:', data.message);
});
```

---

## قوائم BullMQ

> تعمل على Redis. تُهيَّأ العمال تلقائياً عند بدء الخادم إذا كان Redis متوافقاً.

### إعدادات قوائم الانتظار العامة

| الإعداد | القيمة |
|---|---|
| عدد المحاولات | 3 محاولات |
| استراتيجية الإعادة | Exponential Backoff (2 ثانية) |
| الاحتفاظ بالمكتملة | 24 ساعة (أو 1000 مهمة) |
| الاحتفاظ بالفاشلة | 7 أيام (أو 5000 مهمة) |
| التشغيل التلقائي | نعم (`autorun: true`) |

### الطوابير المتاحة

#### 1. طابور `ai-analysis`

| الخاصية | القيمة |
|---|---|
| الاسم | `ai-analysis` |
| الملف | `queues/jobs/ai-analysis.job.ts` |
| الوظيفة | تحليل المشاهد والشخصيات واللقطات والمشاريع باستخدام Gemini AI |
| التزامن | 3 مهام متزامنة |
| الحد | 5 مهام / ثانية |

**بيانات المهمة (AIAnalysisJobData):**

```typescript
{
  type: 'scene' | 'character' | 'shot' | 'project';
  entityId: string;
  userId: string;
  analysisType: 'full' | 'quick' | 'detailed';
  options?: Record<string, unknown>;
}
```

**نتيجة المهمة (AIAnalysisResult):**

```typescript
{
  entityId: string;
  entityType: string;
  analysis: { raw: string; analyzedAt: string; analysisType: string };
  generatedAt: Date;
  processingTime: number; // ms
}
```

**الأولوية:** `quick` = 1 (أعلى)، `full`/`detailed` = 2

---

#### 2. طابور `document-processing`

| الخاصية | القيمة |
|---|---|
| الاسم | `document-processing` |
| الملف | `queues/jobs/document-processing.job.ts` |
| الوظيفة | استخراج النصوص وتحليل ملفات PDF / DOCX / TXT |
| التزامن | 2 مهام متزامنة |
| الحد | 3 مهام / ثانية |

**بيانات المهمة (DocumentProcessingJobData):**

```typescript
{
  documentId: string;
  filePath: string;
  fileType: 'pdf' | 'docx' | 'txt';
  userId: string;
  projectId?: string;
  options?: {
    extractScenes?: boolean;
    extractCharacters?: boolean;
    extractDialogue?: boolean;
    generateSummary?: boolean;
  };
}
```

**نتيجة المهمة:**

```typescript
{
  documentId: string;
  extractedText: string;
  metadata: { wordCount: number; characterCount: number; pageCount?: number };
  scenes?: Array<{ number: number; heading: string; description: string }>;
  characters?: Array<{ name: string; firstAppearance: number; totalLines: number }>;
  dialogue?: Array<{ character: string; line: string; sceneNumber: number }>;
  summary?: string;
  processingTime: number;
}
```

---

#### 3. طابور `cache-warming`

| الخاصية | القيمة |
|---|---|
| الاسم | `cache-warming` |
| الملف | `queues/jobs/cache-warming.job.ts` |
| الوظيفة | تسخين cache Gemini مسبقاً للكيانات المتكررة |
| التزامن | 1 مهمة (لتجنب تجاوز حد Gemini API) |
| الحد | 1 مهمة / 5 ثوانٍ |
| المحاولات | 2 فقط |

**بيانات المهمة (CacheWarmingJobData):**

```typescript
{
  entities: Array<{
    type: 'scene' | 'character' | 'shot' | 'project';
    id: string;
    analysisType: string;
  }>;
  priority?: number;
}
```

**نتيجة المهمة:**

```typescript
{
  warmedCount: number;
  skippedCount: number;
  failedCount: number;
  processingTime: number;
}
```

---

#### 4. طابور `notifications`

| الخاصية | القيمة |
|---|---|
| الاسم | `notifications` |
| الملف | `queues/queue.config.ts` (مُعرَّف، Worker غير مُسجَّل بعد) |
| الوظيفة | إرسال إشعارات (مخطط للمستقبل) |

---

#### 5. طابور `export`

| الخاصية | القيمة |
|---|---|
| الاسم | `export` |
| الملف | `queues/queue.config.ts` (مُعرَّف، Worker غير مُسجَّل بعد) |
| الوظيفة | تصدير التقارير والمستندات (مخطط للمستقبل) |

---

## ملاحق

### متغيرات البيئة الضرورية

| المتغير | الوصف | مطلوب |
|---|---|---|
| `PORT` | منفذ الخادم (افتراضي: 3001) | لا |
| `NODE_ENV` | البيئة (`development`, `production`) | نعم |
| `DATABASE_URL` | رابط قاعدة البيانات (PostgreSQL) | نعم |
| `REDIS_URL` | رابط Redis (أو `REDIS_HOST`/`PORT`/`PASSWORD`) | نعم |
| `JWT_SECRET` | سر توقيع JWT | نعم |
| `GEMINI_API_KEY` / `GOOGLE_GENAI_API_KEY` | مفتاح Gemini API | نعم |
| `CORS_ORIGIN` | Origins المسموح بها (مفصولة بفواصل) | نعم |
| `MCP_PORT` | منفذ MCP Server (افتراضي: 3000) | لا |
| `WEAVIATE_URL` | رابط Weaviate (افتراضي: `http://localhost:8080`) | لا |
| `RATE_LIMIT_WINDOW_MS` | نافذة حد الطلبات (افتراضي: 900000 ms) | لا |
| `RATE_LIMIT_MAX_REQUESTS` | أقصى طلبات (افتراضي: 100) | لا |

### رموز خطأ CSRF

| الرمز | السبب |
|---|---|
| `CSRF_MISSING_ORIGIN` | طلب متصفح بدون Origin/Referer |
| `CSRF_ORIGIN_MISMATCH` | Origin غير مسموح به |
| `CSRF_REFERER_MISMATCH` | Referer غير مسموح به |
| `CSRF_INVALID_REFERER` | Referer URL غير صالح |

### حالات مهام BullMQ

| الحالة | الوصف |
|---|---|
| `waiting` | في انتظار التنفيذ |
| `active` | قيد التنفيذ |
| `completed` | اكتملت بنجاح |
| `failed` | فشلت |
| `delayed` | مؤجلة |
| `paused` | موقوفة |

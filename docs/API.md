# مرجع API

## نظرة عامة

| الخاصية | القيمة |
|---|---|
| **المسار الأساسي في الويب** | `/api` داخل `apps/web` |
| **المسار الأساسي في الخلفية** | `/api` داخل `apps/backend/src/server.ts` |
| **المصادقة الافتراضية في الخلفية** | JWT Bearer أو Cookie `accessToken` |
| **حماية الكتابة** | `csrfProtection` على أغلب عمليات `POST/PUT/DELETE` في الخلفية |
| **تنسيق الاستجابة** | JSON |

---

> **ملاحظة تشغيلية مهمة بتاريخ 2026-04-02:** المسار `POST /api/editor` أُلغي من الويب، وتخزين `app-state` لم يعد محليًا داخل `apps/web`، ومسارات `projects` في الويب صارت جزءًا من الربط الرسمي مع الباك إند. إذا تعارض أي مقطع قديم أدناه مع هذه الملاحظة، فالعقد التشغيلي الحالي هو ما تم التحقق منه حيًا لا ما بقي من وصف تاريخي.

## بنية الاستجابة الموحدة

لا توجد بنية واحدة على مستوى المشروع كله. الأنماط الفعلية:

### نمط الخلفية الشائع

```json
{
  "success": true,
  "data": {}
}
```

### نمط أخطاء الخلفية الشائع

```json
{
  "success": false,
  "error": "message"
}
```

### نمط بعض مسارات الويب المحلية

```json
{
  "status": "ok"
}
```

---

## مسارات الويب ضمن النطاق

### مسارات الويب الرسمية ضمن النطاق

| الطريقة | المسار | المصادقة | الوصف | الملف |
|---|---|---|---|---|
| `GET` | `/api/health` | غير مطلوبة | فحص صحة سريع | `apps/web/src/app/api/health/route.ts` |
| `GET` | `/api/app-state/[app]` | غير مطلوبة | قراءة حالة تطبيق عبر الباك إند الرسمي | `apps/web/src/app/api/app-state/[app]/route.ts` |
| `PUT` | `/api/app-state/[app]` | غير مطلوبة | تحديث الحالة عبر الباك إند الرسمي | نفس الملف |
| `DELETE` | `/api/app-state/[app]` | غير مطلوبة | حذف حالة التطبيق | نفس الملف |

### مسارات الويب التي تعمل كـ proxy إلى الخلفية

| الطريقة | المسار | الهدف الخلفي | الملف |
|---|---|---|---|
| `GET,POST` | `/api/breakdown/[...path]` | `/api/breakdown/*` | `apps/web/src/app/api/breakdown/[...path]/route.ts` |
| `GET,POST` | `/api/breakdown/analyze` | Breakdown backend | `apps/web/src/app/api/breakdown/analyze/route.ts` |
| `GET,POST` | `/api/analysis/seven-stations` | `/api/analysis/seven-stations` | `apps/web/src/app/api/analysis/seven-stations/route.ts` |
| `POST` | `/api/ai/chat` | `/api/ai/chat` | `apps/web/src/app/api/ai/chat/route.ts` |
| `GET` | `/api/critique/config` | `/api/critique/config` | `apps/web/src/app/api/critique/config/route.ts` |
| `GET` | `/api/critique/config/[taskType]` | `/api/critique/config/:taskType` | ملف مماثل |
| `GET` | `/api/critique/dimensions/[taskType]` | `/api/critique/dimensions/:taskType` | ملف مماثل |
| `POST` | `/api/critique/summary` | `/api/critique/summary` | ملف مماثل |

### مسارات الويب الخاصة بـ directors-studio

هذه المسارات ضمن الربط الرسمي الحالي وتُستخدم كواجهة الويب فوق الباك إند الرئيسي.

| الطريقة | المسار |
|---|---|
| `GET,POST` | `/api/projects` |
| `GET,PUT,DELETE` | `/api/projects/[id]` |
| `GET,POST` | `/api/projects/[id]/scenes` |
| `GET,POST` | `/api/projects/[id]/characters` |
| `GET,PUT,DELETE` | `/api/scenes/[id]` |
| `GET,POST` | `/api/scenes/[id]/shots` |
| `GET,PUT,DELETE` | `/api/characters/[id]` |
| `GET,PUT,DELETE` | `/api/shots/[id]` |

---

## طبقة المحرر الرسمية داخل الباك إند

المسار الرسمي الحالي لهذه النقاط يُسجَّل داخل:

- `apps/backend/src/editor/runtime.ts`
- `apps/backend/editor-runtime/routes/index.mjs`

يوجد ملف محلي قديم في `apps/web/src/app/(main)/editor/server/file-import-server.mjs` لكنه لم يعد جزءًا من topology الإنتاجية الرسمية.

| الطريقة | المسار | الوصف |
|---|---|---|
| `GET` | `/health` | فحص صحة |
| `POST` | `/api/file-extract` | استخراج ملف واحد |
| `POST` | `/api/files/extract` | استخراج عدة ملفات |
| `POST` | `/api/text-extract` | تحليل نص مباشر |
| `POST` | `/api/final-review` | مراجعة نهائية للنص |
| `POST` | `/api/ai/context-enhance` | تحسين سياقي |
| `POST` | `/api/export/pdfa` | تصدير PDF/A |

مثال:

```bash
curl -X GET http://127.0.0.1:3001/api/editor-runtime/health
```

---

## مسارات الخلفية

### المصادقة

| الطريقة | المسار | الحماية | الوصف |
|---|---|---|---|
| `POST` | `/api/auth/signup` | عام | إنشاء مستخدم |
| `POST` | `/api/auth/login` | عام | تسجيل الدخول |
| `POST` | `/api/auth/logout` | مصادق | إنهاء الجلسة |
| `POST` | `/api/auth/refresh` | عام | تجديد الجلسة |
| `GET` | `/api/auth/me` | مصادق | قراءة المستخدم الحالي |
| `POST` | `/api/auth/zk-signup` | عام | تسجيل ZK |
| `POST` | `/api/auth/zk-login-init` | عام | بدء ZK login |
| `POST` | `/api/auth/zk-login-verify` | عام | التحقق النهائي |
| `POST` | `/api/auth/recovery` | مصادق + CSRF | إدارة recovery artifact |

#### `POST /api/auth/login`

| الخاصية | القيمة |
|---|---|
| **المدخلات** | بريد/اسم مستخدم + كلمة مرور حسب `auth.controller.ts` |
| **المخرجات** | cookies `accessToken` و`refreshToken` + payload نجاح |
| **الأخطاء الشائعة** | `401` بيانات غير صحيحة |

### التحليل والنقد

| الطريقة | المسار | الحماية |
|---|---|---|
| `POST` | `/api/analysis/seven-stations` | مصادق + CSRF |
| `GET` | `/api/analysis/stations-info` | مصادق |
| `GET` | `/api/critique/config` | مصادق |
| `GET` | `/api/critique/config/:taskType` | مصادق |
| `GET` | `/api/critique/dimensions/:taskType` | مصادق |
| `POST` | `/api/critique/summary` | مصادق + CSRF |

#### `POST /api/analysis/seven-stations`

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `text` | `string` | نعم | النص المراد تحليله |
| `async` | `boolean` | لا | تشغيل التحليل كوظيفة طابور |

الاستجابات الفعلية:

| الحالة | الوصف |
|---|---|
| `200` | تقرير متزامن مع `report`, `confidence`, `metadata` |
| `202` | في الوضع غير المتزامن مع `jobId` |
| `401` | غير مصادق |
| `500` | فشل في التحليل |

### المشاريع والمشاهد والشخصيات واللقطات

| الطريقة | المسار | الحماية |
|---|---|---|
| `GET` | `/api/projects` | مصادق |
| `GET` | `/api/projects/:id` | مصادق |
| `POST` | `/api/projects` | مصادق + CSRF |
| `PUT` | `/api/projects/:id` | مصادق + CSRF |
| `DELETE` | `/api/projects/:id` | مصادق + CSRF |
| `POST` | `/api/projects/:id/analyze` | مصادق + CSRF |
| `GET` | `/api/projects/:projectId/scenes` | مصادق |
| `GET` | `/api/scenes/:id` | مصادق |
| `POST` | `/api/scenes` | مصادق + CSRF |
| `PUT` | `/api/scenes/:id` | مصادق + CSRF |
| `DELETE` | `/api/scenes/:id` | مصادق + CSRF |
| `GET` | `/api/projects/:projectId/characters` | مصادق |
| `GET` | `/api/characters/:id` | مصادق |
| `POST` | `/api/characters` | مصادق + CSRF |
| `PUT` | `/api/characters/:id` | مصادق + CSRF |
| `DELETE` | `/api/characters/:id` | مصادق + CSRF |
| `GET` | `/api/scenes/:sceneId/shots` | مصادق |
| `GET` | `/api/shots/:id` | مصادق |
| `POST` | `/api/shots` | مصادق + CSRF |
| `PUT` | `/api/shots/:id` | مصادق + CSRF |
| `DELETE` | `/api/shots/:id` | مصادق + CSRF |
| `POST` | `/api/shots/suggestion` | مصادق + CSRF |

### الوثائق المشفرة

| الطريقة | المسار |
|---|---|
| `POST` | `/api/docs` |
| `GET` | `/api/docs` |
| `GET` | `/api/docs/:id` |
| `PUT` | `/api/docs/:id` |
| `DELETE` | `/api/docs/:id` |

### AI والمحادثة

| الطريقة | المسار |
|---|---|
| `POST` | `/api/ai/chat` |
| `POST` | `/api/ai/shot-suggestion` |
| `GET` | `/api/gemini/cost-summary` |

### breakdown

| الطريقة | المسار |
|---|---|
| `GET` | `/api/breakdown/health` |
| `POST` | `/api/breakdown/projects/bootstrap` |
| `POST` | `/api/breakdown/projects/:projectId/parse` |
| `POST` | `/api/breakdown/projects/:projectId/analyze` |
| `GET` | `/api/breakdown/projects/:projectId/report` |
| `GET` | `/api/breakdown/projects/:projectId/schedule` |
| `GET` | `/api/breakdown/scenes/:sceneId` |
| `POST` | `/api/breakdown/scenes/:sceneId/reanalyze` |
| `GET` | `/api/breakdown/reports/:reportId/export` |
| `POST` | `/api/breakdown/chat` |

### الطوابير والمقاييس وWAF

| الطريقة | المسار |
|---|---|
| `GET` | `/api/queue/jobs/:jobId` |
| `GET` | `/api/queue/stats` |
| `GET` | `/api/queue/:queueName/stats` |
| `POST` | `/api/queue/jobs/:jobId/retry` |
| `POST` | `/api/queue/:queueName/clean` |
| `GET` | `/api/metrics/*` |
| `GET,PUT,POST` | `/api/waf/*` |

### الصحة والذاكرة والبث

| الطريقة | المسار | ملاحظة |
|---|---|---|
| `GET` | `/health` | عام |
| `GET` | `/api/health` | عام |
| `GET` | `/health/live` | عام |
| `GET` | `/health/ready` | عام |
| `GET` | `/health/startup` | عام |
| `GET` | `/health/detailed` | عام |
| `GET` | `/metrics` | عام |
| `ALL` | `/api/memory/*` | مصادق عبر `app.use('/api/memory', authMiddleware, memoryRoutes)` |

---

## أمثلة curl

### تسجيل الدخول

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongPassword123!"}'
```

### تحليل seven-stations

```bash
curl -X POST http://localhost:3001/api/analysis/seven-stations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-XSRF-TOKEN: <csrf-token>" \
  -d '{"text":"INT. ROOM - NIGHT","async":false}'
```

### حالة طابور

```bash
curl -X GET http://localhost:3001/api/queue/stats \
  -H "Authorization: Bearer <token>"
```

## المصطلحات

| المصطلح | المعنى في سياق هذا المشروع |
|---|---|
| proxy route | route داخل الويب يمرر الطلب إلى الخلفية |
| local route | route داخل الويب يعمل بدون backend |
| CSRF | تحقق header + cookie على طلبات الكتابة في الخلفية |

# دليل الطوابير

## نظرة عامة

الخلفية تستخدم `BullMQ` مع Redis. التهيئة الأساسية في:

- `apps/backend/src/queues/queue.config.ts`
- `apps/backend/src/queues/index.ts`

ولوحة المراقبة في:

- `apps/backend/src/middleware/bull-board.middleware.ts`

---

## الطوابير المعرفة

| الاسم | الغرض |
|---|---|
| `ai-analysis` | مهام التحليل غير المتزامنة |
| `document-processing` | معالجة المستندات |
| `notifications` | الإشعارات والبريد |
| `export` | عمليات التصدير |
| `cache-warming` | تمهيد التخزين المؤقت |

---

## الإعداد

| المتغير | الغرض |
|---|---|
| `REDIS_URL` | الاتصال المفضل |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | بديل اتصال مفصل |

---

## المراقبة

- `/admin/queues` محمي عبر `authMiddleware`
- `/api/queue/*` يوفر stats وإعادة المحاولة والتنظيف

## المصطلحات

| المصطلح | المعنى في سياق هذا المشروع |
|---|---|
| retry | إعادة تشغيل job فاشلة |
| clean | تنظيف jobs من طابور محدد |

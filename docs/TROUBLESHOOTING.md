# دليل حل المشاكل — The Copy

## مشاكل الإقلاع

### "DATABASE_URL is required and database is not reachable"
قاعدة البيانات PostgreSQL غير متاحة.
```bash
pnpm run infra:status   # تحقق من حالة الخدمات
pnpm run infra:up       # أعد تشغيل الخدمات
```
تأكد من أن `DATABASE_URL` في `.env` يشير إلى `localhost:5433`.

### "Redis is required but not reachable"
Redis مفعّل لكن غير متاح.
- **الحل 1**: شغّل Redis: `pnpm run infra:up`
- **الحل 2**: عطّل Redis: أضف `REDIS_ENABLED=false` في `.env`

### "Weaviate is required but not available"
`WEAVIATE_REQUIRED=true` لكن Weaviate غير متاح.
- **الحل 1**: شغّل Weaviate: `pnpm run infra:up`
- **الحل 2**: اجعله اختيارياً: `WEAVIATE_REQUIRED=false`

## مشاكل الويب

### تحذير MODULE_TYPELESS_PACKAGE_JSON
تم حله بإضافة `"type": "module"` في `apps/web/package.json`.

### تحذير "middleware file convention is deprecated"
تم ترحيل `middleware.ts` إلى `proxy.ts` وفق Next.js 16.

### تحذير "Could not find onRequestError hook"
تم إضافة `onRequestError` في `apps/web/src/instrumentation.ts`.

## مشاكل الخدمات

### Redis flood logs عند التعطيل
إذا `REDIS_ENABLED=false`، لن يحاول أي جزء الاتصال بـ Redis.
الكاش يعمل بوضع L1 فقط (ذاكرة).

### Health endpoint يعيد 503
```bash
curl http://localhost:3001/health/detailed
```
سيُظهر أي خدمة مطلوبة وغير متاحة. أصلح الخدمة المعنية.

### المنفذ مشغول
```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001 | Stop-Process -Force
# أو
.\scripts\kill-ports.ps1
```

## مشاكل Docker

### الخدمات لا تبدأ
```bash
pnpm run infra:reset    # إعادة تعيين كامل
docker system prune -f  # تنظيف Docker
pnpm run infra:up       # إعادة التشغيل
```

### مشكلة في volumes
```bash
pnpm run infra:down
docker volume rm thecopy-infra_pgdata thecopy-infra_redisdata thecopy-infra_weaviatedata
pnpm run infra:up
```

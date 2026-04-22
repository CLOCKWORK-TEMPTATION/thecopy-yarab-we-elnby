# Backend — The Copy

## 1) نظرة عامة
الـ`backend/` ده خادم Express (TypeScript) مسؤول عن:
- مصادقة المستخدمين + جلسات/توكن
- حماية (CORS/Helmet/CSRF/WAF/Rate Limiting)
- تشغيل مهام خلفية (BullMQ + Redis)
- Real-time (WebSocket + SSE)
- تشغيل نظام وكلاء التحليل الدرامي (Multi-Agent Orchestrator)
- قياسات ومراقبة (Prometheus Metrics + Sentry + OpenTelemetry)

## 2) نقطة الدخول (Entry Point)
- `src/server.ts`

## 3) سكربتات التشغيل
من `backend/package.json`:
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm test`
- `pnpm lint`
- `pnpm type-check`

## 4) متغيرات البيئة
القالب الأساسي موجود في:
- `.env.example`

أهم المتغيرات (الأكثر تأثيرًا على التشغيل):
- `PORT` (الافتراضي: 3001)
- `GOOGLE_GENAI_API_KEY` (مطلوب عشان خدمات Gemini)
- `JWT_SECRET` (لازم يبقى قوي في production)
- `CORS_ORIGIN` (قائمة origins مفصولة بـ`,`, مثال: `http://localhost:5000`)
- `DATABASE_URL` (PostgreSQL)
- Redis:
  - `REDIS_URL` أو `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD`

ملف التحقق والقراءة:
- `src/config/env.ts`

## 5) أهم المسارات (Routes)
المسارات بتتسجل في `src/server.ts` عبر controllers.
أمثلة مهمة:
- Health:
  - `GET /health` و`GET /api/health` و`GET /health/ready` … إلخ
- Auth:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
- Analysis:
  - `POST /api/analysis/seven-stations`
- AI:
  - `POST /api/ai/chat`
  - `POST /api/shots/suggestion`
- Projects/Scenes/Characters/Shots:
  - مسارات CRUD تحت `/api/projects` و`/api/scenes` و`/api/characters` و`/api/shots`

## 6) نظام الوكلاء (Agent System)
- Registry:
  - `src/services/agents/registry.ts` (مذكور فيه 27 وكيل)
- Orchestrator:
  - `src/services/agents/orchestrator.ts`

الـ`AnalysisService` بيستخدم الـorchestrator علشان ينفذ شوية task types بالتوازي:
- `src/services/analysis.service.ts`

## 7) Queues (BullMQ)
تهيئة العمال:
- `src/queues/index.ts`

مهم: النظام بيعمل check لإصدار Redis قبل ما يفعّل الـworkers.

## 8) MCP Server (اختياري)
فيه MCP server بسيط للتجارب:
- `src/mcp-server.ts`

## 9) Troubleshooting سريع
- لو Gemini مش شغال:
  - اتأكد إن `GOOGLE_GENAI_API_KEY` متعيّن.
- لو الـqueues مش شغالة:
  - اتأكد Redis شغال وبإصدار متوافق.
- لو CORS بيفشل:
  - عدّل `CORS_ORIGIN` وخليه يشمل URL بتاع الـfrontend.

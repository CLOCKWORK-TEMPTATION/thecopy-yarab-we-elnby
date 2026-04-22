# ADR-0002: خادوم Express.js منفصل عن Next.js

## الحالة

مقبول

## السياق

في المشاريع التي تستخدم Next.js، يمكن تشغيل منطق الخادوم داخل Route Handlers أو Server Actions بدلًا من خادوم مستقل. غير أن "النسخة" تضم متطلبات لا تناسب بيئة Next.js الخادومية: طوابير مهام طويلة الأمد (BullMQ)، اتصالات WebSocket دائمة (Socket.io)، Server-Sent Events، مراقبة Prometheus، لوحة Bull Board، Zero-Knowledge Authentication، وخط تحليل درامي متعدد المراحل ("Seven Stations Pipeline").

وصف `package.json` الجذري يُفصّل هذا الاختيار صراحةً: "تطبيق الويب يعمل كطبقة العرض والتجميع، بينما يركّز الخادوم الخلفي على المسارات المؤمّنة والحالة الطويلة والطوابير والعمليات التي تحتاج بنية تحتية مستقلة."

## القرار

اعتمدنا **Express.js 5.1.0** كخادوم مستقل (`apps/backend`) يعمل على منفذ مختلف عن تطبيق Next.js (`apps/web` على المنفذ 5000). التواصل بين الجانبين يتم عبر HTTP API.

الدليل من الكود:
- `apps/backend/src/server.ts` يُنشئ `http.createServer(app)` مستقلًا لدعم WebSocket، مع تهيئة OpenTelemetry وSentry وBullMQ workers وSocket.io في نقطة بدء واحدة.
- `apps/web/package.json` يُشغّل `"dev": "next dev --webpack -p 5000"` بينما يعمل الخادوم على المنفذ الافتراضي 3000.
- `apps/backend/package.json` يحدد `"engines": { "node": "24.x" }` ووصفًا مستقلًا: "Backend API for The Copy - Drama Analysis Platform".
- البنية تسمح بنشر الخادوم في بيئة منفصلة (Docker مثلًا) دون أي ارتباط بدورة بناء Next.js.

## البدائل المدروسة

| البديل | المزايا | العيوب |
|---|---|---|
| **Next.js Route Handlers فقط** | بنية موحدة، نشر أبسط على Vercel | لا دعم حقيقي لـ WebSocket، بيئة Edge/Serverless لا تدعم BullMQ وprocesses طويلة |
| **Next.js مع custom server** | بنية موحدة مع إمكانية WebSocket | Next.js لا تُشجع هذا النمط، يكسر بعض مزايا الأداء (Middleware, ISR) |
| **Fastify بدل Express** | أسرع في المعيارات، TypeScript-native | مجتمع أصغر، عدد المكتبات المتوافقة أقل، تكلفة التعلم |
| **NestJS** | هيكل MVC منظم، DI نظيف | Overhead ضخم لمشروع يعتمد بالأساس على AI pipelines وليس CRUD كلاسيكي |

## النتائج

### إيجابية
- **حرية الحالة الطويلة**: BullMQ workers وSocket.io يحتاجان process دائمة؛ Express يوفر ذلك بلا قيود.
- **استقلالية النشر**: يمكن نشر الخادوم على خادوم مُخصص أو container بينما يُنشر تطبيق الويب على Vercel.
- **أمان معزول**: طبقات الحماية (WAF، CSRF، Rate Limiting، ZK Auth) مُطبّقة على الخادوم فقط دون التأثير على طبقة عرض Next.js.
- **مراقبة مستقلة**: `/metrics` (Prometheus) و`/admin/queues` (Bull Board) محمية بمصادقة مستقلة.
- **MCP Server منفصل**: `apps/backend/src/mcp-server.ts` يعمل كعملية مستقلة على منفذ `MCP_PORT` دون التداخل مع الخادوم الرئيسي.

### سلبية
- **تعقيد CORS**: كل طلب من الويب إلى الخادوم يمر عبر CORS، مما يتطلب إعدادًا دقيقًا للأصول المسموح بها.
- **استدعاءات شبكية إضافية**: بدلًا من استدعاء وظيفة داخلية، كل تواصل بين الطرفين يمر عبر HTTP.
- **مزامنة أنواع البيانات**: يجب الحفاظ على توافق الأنواع يدويًا أو عبر `@the-copy/shared`، لا يوجد اشتراك تلقائي.

## الملفات المتأثرة

- `/apps/backend/src/server.ts`
- `/apps/backend/src/mcp-server.ts`
- `/apps/backend/package.json`
- `/apps/web/package.json` (إعدادات CORS وعناوين API)
- `/package.json` (سكريبت `dev` يُشغّل كلا التطبيقين)

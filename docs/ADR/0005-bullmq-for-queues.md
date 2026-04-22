# ADR-0005: BullMQ لإدارة طوابير المهام الخلفية

## الحالة

مقبول

## السياق

"النسخة" تُنفّذ عمليات تستغرق عشرات الثواني أو دقائق كاملة: تحليل AI للسكريبتات الدرامية عبر "Seven Stations Pipeline"، معالجة ملفات PDF وWord، توليد تقارير، تدفئة الكاش، وإرسال إشعارات. تنفيذ هذه العمليات في سياق طلب HTTP المباشر سيؤدي إلى timeout وتجربة مستخدم سيئة.

يتطلب الحل: تأخير المهام، ضمان تنفيذها مرة واحدة على الأقل، إعادة المحاولة عند الفشل، ومراقبة حالة كل مهمة.

## القرار

اعتمدنا **BullMQ 5.66.4** مع **Redis** كمخزن مؤقت للطوابير، مع **Bull Board** (`@bull-board/express 6.16.2`) للوحة مراقبة بصرية محمية بمصادقة.

الدليل من الكود:
- `apps/backend/src/queues/queue.config.ts` يُعرّف `QueueName` enum بخمسة طوابير: `ai-analysis`, `document-processing`, `notifications`, `export`, `cache-warming`.
- إعدادات retry: `attempts: 3` مع backoff أسّي (ضعف كل مرة، بدءًا من 2000ms).
- إعداد الاحتفاظ: المهام المكتملة تُحذف بعد 24 ساعة أو بعد تجاوز 1000 مهمة؛ الفاشلة بعد 7 أيام.
- `concurrency: 5` و`limiter: { max: 10, duration: 1000 }` للتحكم في الحِمل على نماذج AI.
- `apps/backend/src/server.ts` يُهيّئ `initializeWorkers()` عند بدء التشغيل، و`setupBullBoard()` يُوفر `/admin/queues` محميًا بمصادقة.

## البدائل المدروسة

| البديل | المزايا | العيوب |
|---|---|---|
| **node-cron / setTimeout** | بسيط جدًا، لا تبعية إضافية | يضيع عند إعادة تشغيل الخادوم، لا retry، لا مراقبة، لا توزيع |
| **Agenda.js (MongoDB-based)** | يستخدم MongoDB الموجود، لا Redis إضافي | أبطأ من BullMQ، مجتمع أصغر، لا دعم rate limiting متقدم |
| **AWS SQS / Google Cloud Tasks** | موثوقية cloud، لا إدارة بنية تحتية | تكلفة إضافية، latency شبكي، تعقيد تكامل |
| **Redis Streams (يدوي)** | يستخدم Redis الموجود، مرونة كاملة | يتطلب بناء consumer logic من الصفر، لا retry تلقائي، لا dashboard |

## النتائج

### إيجابية
- **موثوقية**: Redis يحتفظ بحالة الطوابير حتى عند إعادة تشغيل الخادوم؛ المهام لا تضيع.
- **retry ذكي**: Exponential backoff يمنع إغراق نماذج AI عند الفشل المتكرر.
- **Bull Board**: لوحة بصرية على `/admin/queues` تُظهر حالة كل مهمة (waiting/active/completed/failed) بدون أدوات خارجية.
- **Rate Limiting مدمج**: `limiter: { max: 10, duration: 1000 }` يمنع تجاوز حصص API لمزودي AI.
- **تشغيل متوازٍ**: `concurrency: 5` يُعالج خمس مهام في آن واحد دون تعقيد.
- **مراقبة API**: `/api/queue/*` endpoints لاستعلام حالة المهام وإحصاءات الطوابير.

### سلبية
- **اعتماد إضافي على Redis**: BullMQ يتطلب Redis مخصصًا؛ إذا توقف Redis توقفت الطوابير. المشروع يُشغّل Redis محليًا عبر `redis-server.exe`.
- **`maxRetriesPerRequest: null`**: مطلوب لـ BullMQ لكنه يُعطّل ميزة الـ timeout التلقائي في مكتبة `redis`.
- **تزامن الإيقاف**: `server.ts` يحتوي على كودَي SIGTERM وSIGINT متطابقَين تقريبًا، مما يزيد تعقيد الصيانة.

## الملفات المتأثرة

- `/apps/backend/src/queues/queue.config.ts`
- `/apps/backend/src/queues/index.ts`
- `/apps/backend/src/queues/jobs/ai-analysis.job.ts`
- `/apps/backend/src/queues/jobs/document-processing.job.ts`
- `/apps/backend/src/queues/jobs/cache-warming.job.ts`
- `/apps/backend/src/middleware/bull-board.middleware.ts`
- `/apps/backend/src/controllers/queue.controller.ts`
- `/apps/backend/src/server.ts` (تهيئة workers ولوحة Bull Board)

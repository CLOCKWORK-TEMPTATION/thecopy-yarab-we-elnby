# ADR-0003: Drizzle ORM بدلًا من Prisma

## الحالة

مقبول

## السياق

المشروع يحتاج إلى طبقة للوصول إلى PostgreSQL (Neon Serverless) في كل من الخادوم الخلفي (`apps/backend`) وتطبيق الويب (`apps/web`). كلا التطبيقين يتضمنان `drizzle-orm` في تبعياتهما. الخادوم يُدير Migration عبر `drizzle-kit` ويعرّف مخططات متعددة (`schema.ts` و`zkSchema.ts`).

المعيار الحاسم هو التوافق مع بيئات Serverless وEdge حيث لا يمكن الاعتماد على عمليات binary مولّدة (كـ Prisma Client Engine).

## القرار

اعتمدنا **Drizzle ORM 0.45.1** مع **drizzle-kit 0.31.7** للمخططات والمايغريشن، و**`@neondatabase/serverless`** كـ driver للاتصال بـ Neon PostgreSQL.

الدليل من الكود:
- `apps/backend/drizzle.config.ts` يُعرّف مخططين منفصلين: `src/db/schema.ts` (هياكل التطبيق) و`src/db/zkSchema.ts` (Zero-Knowledge Auth).
- `apps/backend/package.json` يتضمن `"drizzle-orm": "^0.45.1"` و`"drizzle-kit": "^0.31.7"` ضمن التبعيات التشغيلية.
- `apps/web/package.json` يتضمن `"drizzle-orm": "^0.44.7"` و`"drizzle-zod": "^0.8.3"` لمزامنة التحقق من صحة البيانات مع Zod.
- `packages/shared/package.json` يتضمن `"drizzle-orm"` لمشاركة الأنواع والاستعلامات بين التطبيقين.
- السكريبتات `db:generate` و`db:push` و`db:studio` تُنفَّذ مباشرة عبر `drizzle-kit`.

## البدائل المدروسة

| البديل | المزايا | العيوب |
|---|---|---|
| **Prisma** | شائع جدًا، واجهة مريحة، Prisma Studio ممتاز | يولّد binary engine لا يتوافق مع Neon Serverless/Edge، حجم الحزمة أكبر |
| **TypeORM** | ناضج، يدعم OOP وDecorators | ثقيل، أبطأ في وقت التشغيل، لا يدعم Edge Runtime |
| **Kysely** | type-safe كامل، SQL-first | لا code generation، لا migration tool مدمجة، يتطلب كتابة SQL يدوية |
| **SQL خام (pg/postgres.js)** | أداء أقصى، لا abstraction | لا أنواع مُستنتجة، كل استعلام يحتاج تحقق يدوي، صيانة أصعب |

## النتائج

### إيجابية
- **توافق Serverless**: Drizzle يعمل مع `@neondatabase/serverless` مباشرة دون binary engine، مما يتيح استخدامه في Server Components ووظائف Edge.
- **أنواع مُستنتجة**: `typeof users.$inferSelect` و`typeof users.$inferInsert` تُولّد أنواع TypeScript تلقائيًا من تعريف المخطط دون خطوة code generation منفصلة.
- **مخططات متعددة**: دعم `drizzleSchemaPaths` (مصفوفة) في `drizzle.config.ts` يُتيح فصل مخطط ZK Auth عن بقية الجداول.
- **حجم صغير**: لا يضيف Drizzle runtime ثقيلًا؛ مناسب للنشر في بيئات ذات حدود حجم.
- **drizzle-zod**: تكامل مباشر مع Zod لاشتقاق مخططات التحقق من مخططات قاعدة البيانات، مما يمنع التكرار.

### سلبية
- **مجتمع أصغر**: أقل أمثلة وحلول Stack Overflow مقارنة بـ Prisma حتى تاريخ هذا القرار.
- **`drizzle-kit` ليس في devDependencies**: يظهر في `dependencies` بدلًا من `devDependencies` في `apps/backend/package.json`، مما يزيد حجم صورة الإنتاج قليلًا.
- **تعريف الفهارس يدوي**: المطور مسؤول عن تعريف الفهارس صراحةً (كما يظهر في `schema.ts` بفهارس مركّبة متعددة)، لا يوجد تحليل تلقائي للأداء.

## الملفات المتأثرة

- `/apps/backend/drizzle.config.ts`
- `/apps/backend/src/db/schema.ts`
- `/apps/backend/src/db/zkSchema.ts`
- `/apps/backend/src/db/index.ts`
- `/apps/backend/src/db/client.ts`
- `/apps/web/package.json`
- `/packages/shared/src/db/index.ts`

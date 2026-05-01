---
name: zod-controller-boundary-enforcer
description: يفرض وجود Zod schema validation عند كل نقطة دخول في apps/backend/src/controllers و apps/backend/src/modules/**/routes.ts قبل أي وصول إلى req.body أو req.query أو req.params، ويربط الـ schemas بـ packages/copyproj-schema. فعّل عند أي تعديل على controller أو route handler أو endpoint جديد، أو عند رؤية كلمات "validate body", "parse request", "schema", "zod", "تحقق من المدخلات", "validate endpoint", أو عند فتح PR على apps/backend يضيف controller جديد. لا تفعّل لتصميم schemas من الصفر للنماذج (استخدم spec-developer)، ولا لمراجعة كود عامة.
---

# Zod Controller Boundary Enforcer

## الأدلة المؤسِّسة من سجل المستودع

```text
e9bd95f fix: use Zod for req.body parsing in BreakdownSessionsController.createSession
16dd8c2 fix: correct Zod .nonneg() and global crypto in copyproj-schema validate.ts
b8022ce fix(schema): type-safe access to Web Crypto for UUID generation
```

النمط الواضح:

حزمة مخصصة موجودة فعلاً:

```text
@the-copy/copyproj-schema
```

ومع ذلك يُكتشف غياب الـ schema عند controller جديد بعد المراجعة، لا قبلها. كما أن الـ schema نفسه يحتوي أخطاء صامتة مثل nonneg vs nonnegative.

## النطاق

ملفات مشمولة:

```text
apps/backend/src/controllers/**/*.ts
apps/backend/src/modules/**/routes.ts
apps/backend/src/server/route-registrars.ts
```

## السلوك المرفوض

أي وصول مباشر إلى:

```text
req.body
req.query
req.params
```

بدون عبور schema من copyproj-schema. كذلك:

استخدام any على request shape، استخدام as cast لتمرير TypeScript بدون validation فعلية، إنشاء schema محلي ad-hoc داخل الـ controller بدلاً من توحيده في الحزمة المخصصة، استخدام z.unknown ثم cast، تجاهل نتيجة safeParse و الوصول للبيانات الأصلية.

## السلوك المقبول

كل handler يبدأ بـ:

```text
const parsed = SomeRequestSchema.safeParse(req.body);
if (!parsed.success) { return next(new BadRequestError(parsed.error)); }
const { ... } = parsed.data;
```

أو ما يكافئها عبر middleware موحّد. والـ schema نفسه يقيم في:

```text
packages/copyproj-schema/src
```

## فحوصات إلزامية

### Z1 — لا وصول لـ req.body بدون safeParse مسبق

البحث:

```text
ripgrep -nP "req\.body" apps/backend/src/controllers apps/backend/src/modules
```

كل ظهور يجب أن يسبقه في نفس الـ block استدعاء safeParse أو parse.

### Z2 — كل schema تأتي من copyproj-schema لا inline

البحث:

```text
ripgrep -nP "z\.object\(" apps/backend/src/controllers apps/backend/src/modules
```

أي z.object داخل controller يجب نقله إلى packages/copyproj-schema، إلا في حالات استثنائية مبررة كتابياً.

### Z3 — استخدام صحيح لـ Zod API

البحث عن أخطاء API الموثّقة:

```text
ripgrep -nP "\.nonneg\b|\.minlength\b|\.maxlength\b" packages/copyproj-schema apps/backend
```

السلوك المرفوض:

استخدام nonneg بدل nonnegative كما رصد commit:

```text
fix: correct Zod .nonneg() and global crypto in copyproj-schema validate.ts
```

استخدام أي API موقوف في إصدار Zod الحالي، استخدام refine بدون رسالة خطأ.

### Z4 — error handling موحّد لـ ZodError

البحث:

```text
ripgrep -nP "ZodError|safeParse" apps/backend/src
```

كل ZodError يجب أن يُحوّل إلى استجابة:

```text
status: 400
body: { error: "VALIDATION_ERROR", details: ... }
```

عبر error handler مركزي. لا تتسرّب رسالة Zod الخام إلى العميل.

### Z5 — invariants من الـ schema تتبع crypto-safe pattern

البحث:

```text
ripgrep -nP "z\.string\(\)\.uuid\(\)" packages/copyproj-schema apps/backend
```

أي حقل uuid يجب أن يُولَّد عبر:

```text
crypto.randomUUID
crypto.randomBytes
```

لا عبر Math.random أو timestamp pattern. هذا الفحص يتقاطع مع F2 من security-pre-merge-auditor عمداً ليبقى فحصاً مزدوجاً.

## مخرجات المهارة

تقرير في:

```text
output/round-notes.md
```

تحت قسم:

```text
### Zod Controller Boundary — جولة <رقم>
```

يحتوي:

قائمة controllers بدون schema، schemas inline تحتاج نقل إلى الحزمة، استخدامات API خاطئ، خطة الإصلاح بترتيب أولوية.

## معيار الإغلاق

لا controller يصل إلى req.body بدون safeParse، كل schema جديد ضمن packages/copyproj-schema، تشغيل فعلي لـ:

```text
pnpm --filter @the-copy/backend lint
pnpm --filter @the-copy/copyproj-schema test
pnpm --filter @the-copy/backend test
```

نجح بعد الإصلاح.

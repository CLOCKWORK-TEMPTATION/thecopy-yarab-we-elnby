# دليل المساهمة في مشروع "النسخة"

> منصة عربية للإبداع والإنتاج السينمائي — monorepo يجمع `apps/web` و`apps/backend` وحزم `packages/*`

---

## الفهرس

1. [بنية الفروع](#1-بنية-الفروع-branch-strategy)
2. [اصطلاحات Commits](#2-اصطلاحات-commits-conventional-commits)
3. [سير العمل](#3-سير-العمل-workflow)
4. [أين أضع الكود؟](#4-أين-أضع-الكود)
5. [معايير الكود](#5-معايير-الكود)
6. [معايير Pull Request](#6-معايير-pull-request)
7. [إعداد بيئة التطوير](#7-إعداد-بيئة-التطوير)
8. [التواصل](#8-التواصل)

---

## 1. بنية الفروع (Branch Strategy)

### الفروع الرئيسية

| الفرع | الغرض | الحماية |
|-------|--------|---------|
| `main` | بيئة الإنتاج — كل ما يُدمج هنا يُنشر مباشرة | محمي، يتطلب PR + مراجعة |
| `develop` | فرع التطوير الرئيسي — نقطة انطلاق جميع الميزات | محمي، يتطلب PR |

### أنواع الفروع العاملة

```
feature/اسم-الميزة        — ميزة جديدة
fix/اسم-الخطأ            — إصلاح خطأ
chore/المهمة             — مهام صيانة وتنظيم
refactor/اسم-التحسين     — إعادة هيكلة بدون تغيير سلوك
docs/اسم-الصفحة         — تحديث توثيق
test/اسم-الاختبار        — إضافة أو تحديث اختبارات
perf/اسم-التحسين         — تحسين الأداء
ci/اسم-التغيير           — تغييرات في pipeline
```

### قواعد التسمية

- استخدم **الأحرف الصغيرة** فقط
- افصل الكلمات بـ `-` (شرطة عادية)
- كن مختصراً ووصفياً: `feature/breakdown-export-pdf` لا `feature/add-the-new-export-pdf-feature-for-breakdown`
- يُسمح بالعربية في الأسماء: `feature/تحليل-الشخصيات`
- تجنب الأرقام العشوائية أو التواريخ في أسماء الفروع

```bash
# صحيح
git checkout -b feature/zk-auth-signup
git checkout -b fix/csrf-cookie-samesite
git checkout -b chore/upgrade-drizzle-orm

# خاطئ
git checkout -b Feature_NewStuff
git checkout -b my-branch-2024
git checkout -b fix
```

---

## 2. اصطلاحات Commits (Conventional Commits)

يتبع المشروع معيار [Conventional Commits](https://www.conventionalcommits.org/).

### النمط الأساسي

```
type(scope): وصف موجز بالعربية أو الإنجليزية

[نص تفصيلي اختياري]

[BREAKING CHANGE: وصف التغيير الجذري]
[Closes #رقم-الـ-issue]
```

### أنواع الـ type المقبولة

| النوع | متى تستخدمه |
|-------|-------------|
| `feat` | إضافة ميزة جديدة للمستخدم |
| `fix` | إصلاح خطأ |
| `chore` | تحديث dependencies، أدوات، إعدادات |
| `docs` | تغييرات في التوثيق فقط |
| `refactor` | إعادة هيكلة كود دون تغيير السلوك |
| `test` | إضافة أو تعديل اختبارات |
| `perf` | تحسينات الأداء |
| `ci` | تغييرات في CI/CD pipeline |
| `style` | تنسيق كود (مسافات، فواصل) بدون تغيير منطق |
| `revert` | التراجع عن commit سابق |

### النطاقات (Scopes)

```
web         — تطبيق Next.js (apps/web)
backend     — الخادم Express (apps/backend)
shared      — الحزمة المشتركة (packages/shared)
ui          — مكونات واجهة المستخدم (packages/ui)
auth        — منظومة المصادقة
db          — قاعدة البيانات والـ migrations
queue       — BullMQ وطوابير المهام
ci          — إعدادات CI/CD
deps        — تحديث الاعتماديات
```

### أمثلة عملية

```bash
# ميزة جديدة في الواجهة
feat(web): إضافة تصدير السيناريو بصيغة PDF

# إصلاح خطأ في الـ backend
fix(backend): تصحيح خطأ CSRF في مسار المصادقة

# تحديث اعتمادية
chore(deps): ترقية drizzle-orm إلى 0.45.1

# إضافة اختبارات
test(backend): إضافة integration tests لـ database connection

# تحسين أداء
perf(web): تحسين تحميل مكون breakdown باستخدام React.lazy

# تغيير جذري (Breaking Change)
feat(shared)!: تغيير واجهة ScriptAnalysis type

BREAKING CHANGE: حقل `scenes` أصبح `sceneList` في ScriptAnalysis

# ربط بـ Issue
fix(auth): إصلاح انتهاء صلاحية JWT في الـ cookies

Closes #142

# commit متعدد النطاقات
refactor(web,shared): استخراج منطق تحليل الشخصيات لحزمة shared
```

### قواعد صارمة

- **لا تتجاوز 72 حرفاً** في السطر الأول
- استخدم **الفعل المضارع**: "إضافة" لا "أضفت"
- **لا نقطة** في نهاية السطر الأول
- إذا كان التغيير يكسر التوافق، أضف `!` بعد النوع/النطاق

---

## 3. سير العمل (Workflow)

### المخطط العام

```mermaid
flowchart TD
    A([ابدأ]) --> B[Fork المستودع\nأو checkout فرع جديد]
    B --> C[git checkout -b feature/اسم-الميزة\nمن develop]
    C --> D[اكتب الكود]
    D --> E{هل الكود جاهز؟}
    E -- لا --> D
    E -- نعم --> F[pnpm validate\nformat + lint + type-check + test]
    F --> G{هل النتيجة نظيفة؟}
    G -- لا --> H[أصلح الأخطاء]
    H --> D
    G -- نعم --> I[git add الملفات المحددة]
    I --> J[git commit -m 'type scope: وصف']
    J --> K[Pre-commit hooks\nhusky + lint-staged]
    K --> L{hooks نجحت؟}
    L -- لا --> H
    L -- نعم --> M[git push origin feature/اسم-الميزة]
    M --> N[افتح Pull Request\nنحو develop]
    N --> O[مراجعة الكود\nCode Review]
    O --> P{مقبول؟}
    P -- تعديلات مطلوبة --> D
    P -- نعم --> Q[Merge إلى develop]
    Q --> R([انتهى])
```

### خطوات تفصيلية

#### 1. ابدأ دائماً من develop محدّث

```bash
git checkout develop
git pull origin develop
git checkout -b feature/اسم-الميزة
```

#### 2. Pre-commit Hooks (husky + lint-staged)

المشروع يستخدم **husky** و**lint-staged** لتشغيل الفحوصات تلقائياً عند كل commit.

ما يحدث عند `git commit`:

```
lint-staged ──► prettier --write على ملفات .ts/.tsx/.js/.jsx/.json/.css/.md
```

إذا فشل الـ hook، لن ينجح الـ commit. أصلح الأخطاء وأعد المحاولة.

#### 3. تشغيل الاختبارات يدوياً قبل الرفع

```bash
# التحقق الشامل (الموصى به قبل أي push)
pnpm validate

# أو بالتفصيل:
pnpm format:check          # فحص التنسيق
pnpm lint                  # ESLint على كل الحزم
pnpm type-check            # TypeScript strict check
pnpm test                  # تشغيل جميع الاختبارات

# اختبارات الـ backend فقط
pnpm --filter @the-copy/backend test

# اختبارات الـ web فقط
pnpm --filter @the-copy/web test:config
pnpm --filter @the-copy/web test:smoke

# فحص pre-push الكامل (نفس ما يشغله CI)
pnpm prepush:verify
```

#### 4. Push وفتح PR

```bash
git push origin feature/اسم-الميزة
# ثم افتح Pull Request على GitHub نحو فرع develop
```

---

## 4. أين أضع الكود؟

### خريطة المشروع

```
the-copy-monorepo/
├── apps/
│   ├── web/                    — تطبيق Next.js 16 (واجهة المستخدم)
│   │   └── src/
│   │       ├── app/
│   │       │   └── (main)/     — صفحات التطبيق الرئيسية
│   │       ├── components/     — مكونات مشتركة داخل web
│   │       ├── hooks/          — React hooks مخصصة
│   │       ├── lib/            — utilities داخلية
│   │       └── config/         — إعدادات التطبيق
│   │
│   └── backend/                — خادم Express 5 (API)
│       └── src/
│           ├── routes/         — تعريف مسارات API
│           ├── controllers/    — معالجة الطلبات
│           ├── services/       — منطق الأعمال (Business Logic)
│           ├── middleware/     — Express middlewares
│           ├── db/             — Drizzle ORM schemas وconnections
│           ├── queues/         — BullMQ workers وجobs
│           └── config/         — إعدادات البيئة
│
└── packages/                   — حزم مشتركة (workspace packages)
    ├── shared/                 — types وutilities مشتركة
    ├── ui/                     — مكونات واجهة المستخدم (Radix + Tailwind)
    ├── tsconfig/               — إعدادات TypeScript المشتركة
    ├── core-memory/            — ذاكرة النظام والاسترجاع المشترك
    ├── breakapp/               — إدارة الإنتاج الميداني وQR
    ├── cinematography/         — أدوات التصوير السينمائي
    ├── prompt-engineering/     — أدوات هندسة التوجيهات
    └── [أي حزمة مشتركة جديدة]/
```

### قاعدة القرار: أين يذهب الكود؟

```mermaid
flowchart LR
    A{هل يُستخدم في\nأكثر من مكان؟} -- نعم --> B[packages/shared\nأو packages/ui]
    A -- لا --> C{أين يُستخدم؟}
    C --> D[في web فقط] --> E[apps/web/src/]
    C --> F[في backend فقط] --> G[apps/backend/src/]
    C --> H[ميزة مستقلة كاملة] --> I[packages/اسم-الميزة/]
```

#### `apps/web/src/app/(main)/`

صفحات Next.js App Router. كل مجلد = route segment.

```
app/(main)/
├── breakdown/          — صفحة تقسيم المشاهد
├── editor/             — محرر السيناريو
├── directors-studio/   — استوديو المخرجين
└── [صفحة-جديدة]/
    ├── page.tsx        — الصفحة (Server Component افتراضياً)
    ├── layout.tsx      — Layout اختياري
    └── components/     — مكونات خاصة بهذه الصفحة فقط
```

#### `apps/web/src/components/`

مكونات React مشتركة داخل تطبيق web (ليست في packages).

```
components/
├── auth/               — مكونات المصادقة
├── ui/                 — مكونات UI بسيطة (re-exports من packages/ui)
└── layout/             — مكونات الهيكل العام
```

#### `apps/backend/src/routes/`

تعريف مسارات API. كل ملف = مجموعة routes مترابطة.

```typescript
// مثال: apps/backend/src/routes/projects.routes.ts
router.get('/', authMiddleware, projectsController.list);
router.post('/', authMiddleware, projectsController.create);
```

#### `apps/backend/src/services/`

منطق الأعمال (Business Logic). لا يجب أن يحتوي على HTTP logic.

```typescript
// صحيح — service نظيف
export class ProjectService {
  async createProject(data: CreateProjectDto): Promise<Project> { ... }
}

// خاطئ — HTTP منطق داخل service
export class ProjectService {
  async createProject(req: Request, res: Response) { ... }
}
```

#### `packages/shared/src/`

Types وutilities تُستخدم في كل من web وbackend.

```typescript
// packages/shared/src/types/project.ts
export interface Project { ... }
export type CreateProjectDto = Omit<Project, 'id' | 'createdAt'>;
```

#### `packages/ui/src/`

مكونات واجهة المستخدم المستندة إلى Radix UI + Tailwind CSS.

```typescript
// packages/ui/src/components/Button.tsx
// مكونات قابلة لإعادة الاستخدام عبر جميع تطبيقات web
```

---

## 5. معايير الكود

### TypeScript — صارم بلا استثناء

```typescript
// tsconfig يطبق strict mode — هذه الإعدادات مفعّلة:
// strict: true
// noImplicitAny: true
// strictNullChecks: true
// noUnusedLocals: true
// noUnusedParameters: true

// خاطئ — محظور تماماً
const data: any = fetchData();
function process(input: any) { ... }

// صحيح
const data: ScriptAnalysis = fetchData();
function process(input: ProjectInput): ProcessedResult { ... }
```

### قواعد التسمية

| العنصر | النمط | مثال |
|--------|-------|------|
| المتغيرات والدوال | `camelCase` | `getUserById`, `projectData` |
| الأنواع والواجهات | `PascalCase` | `ScriptAnalysis`, `UserProfile` |
| الثوابت | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| ملفات React components | `PascalCase.tsx` | `BreakdownCard.tsx` |
| ملفات utilities/hooks | `camelCase.ts` | `useProjectStore.ts` |
| ملفات الاختبار | `*.test.ts` أو `*.test.tsx` | `project.test.ts` |
| متغيرات البيئة | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |

### ESLint + Prettier

```bash
# فحص
pnpm lint                  # ESLint بدون تحذيرات (max-warnings=0)
pnpm format:check          # Prettier check

# إصلاح تلقائي
pnpm --filter @the-copy/backend lint:fix
pnpm format                # Prettier write على كل الملفات
```

**قواعد صارمة:**

- `no-any` — لا استخدام لـ `any`، استخدم `unknown` ثم ضيّق النوع
- `no-unused-imports` — لا imports غير مستخدمة
- `react-hooks/rules-of-hooks` — قواعد React Hooks
- `@typescript-eslint/no-floating-promises` — كل Promise يجب أن يُعالَج

### أنماط مستحسنة

```typescript
// استخدم Zod للتحقق من المدخلات
import { z } from 'zod';
const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['screenplay', 'treatment', 'outline']),
});

// استخدم Result pattern للأخطاء بدل throw/catch العشوائي
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// استخدم const assertions للثوابت
const PROJECT_TYPES = ['screenplay', 'treatment', 'outline'] as const;
type ProjectType = (typeof PROJECT_TYPES)[number];
```

---

## 6. معايير Pull Request

### قالب PR

عند فتح PR، امأ هذه الأقسام:

```markdown
## ملخص التغييرات
<!-- ماذا تغير ولماذا؟ -->

## نوع التغيير
- [ ] ميزة جديدة (feat)
- [ ] إصلاح خطأ (fix)
- [ ] تحسين أداء (perf)
- [ ] إعادة هيكلة (refactor)
- [ ] توثيق (docs)
- [ ] تغيير جذري (breaking change)

## كيف تم الاختبار؟
- [ ] اختبارات وحدة (unit tests)
- [ ] اختبارات تكامل (integration tests)
- [ ] اختبار يدوي

## الـ Issues المرتبطة
Closes #___

## قائمة التحقق
- [ ] الكود يتبع معايير المشروع
- [ ] تم تشغيل `pnpm validate` بنجاح
- [ ] الاختبارات الجديدة تغطي الكود المضاف
- [ ] لا secrets أو .env files في الـ commit
- [ ] تم تحديث التوثيق إن لزم
```

### مراحل مراجعة الـ PR

```mermaid
flowchart TD
    A[PR مفتوح] --> B{هل CI يمر؟}
    B -- لا --> C[أبلغ المؤلف بالأخطاء]
    C --> D[المؤلف يصلح ويعيد push]
    D --> B
    B -- نعم --> E{هل الكود يتبع المعايير؟}
    E -- لا --> F[اترك تعليقات محددة]
    F --> D
    E -- نعم --> G{هل هناك اختبارات كافية؟}
    G -- لا --> H[اطلب اختبارات]
    H --> D
    G -- نعم --> I[Approve]
    I --> J[Merge إلى develop]
```

### قواعد صارمة للـ PR

1. **لا PR بدون اختبارات** لأي ميزة جديدة
2. **لا commits مكسورة** — كل commit يجب أن يكون المشروع قابلاً للبناء بعده
3. **PR صغير ومركّز** — تغيير واحد لكل PR، لا تجمع ميزات متعددة
4. **لا تدمج بنفسك** — يتطلب مراجعة من مساهم آخر على الأقل
5. **اربط بـ Issue** — لا PR بدون issue مرتبط (إلا للتغييرات الطارئة)
6. **لا force push** على فروع مشتركة (`main`, `develop`)

---

## 7. إعداد بيئة التطوير

### المتطلبات الأساسية

| الأداة | الإصدار المطلوب | كيفية التحقق |
|--------|----------------|--------------|
| Node.js | `>= 24.x` | `node --version` |
| pnpm | `>= 10.x` (المُستخدم: `10.32.1`) | `pnpm --version` |
| Git | أي إصدار حديث | `git --version` |

```bash
# تثبيت pnpm إن لم يكن موجوداً
npm install -g pnpm@10

# تأكد من الإصدار
node --version   # v24.x.x
pnpm --version   # 10.x.x
```

### خطوات الإعداد

```bash
# 1. استنساخ المستودع
git clone https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy.git
cd yarab-we-elnby-thecopy

# 2. تثبيت جميع الاعتماديات (كل الحزم دفعة واحدة بفضل pnpm workspaces)
pnpm install

# 3. نسخ ملفات البيئة
cp apps/web/.env.example apps/web/.env.local
cp apps/backend/.env.example apps/backend/.env

# 4. عدّل القيم في الملفين حسب بيئتك المحلية
```

### متغيرات البيئة المطلوبة (الحد الأدنى)

**`apps/backend/.env`:**

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/the_copy
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-local-secret-change-this
NODE_ENV=development
PORT=3001
```

**`apps/web/.env.local`:**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

> **تنبيه أمني:** لا ترفع أي ملف `.env` إلى Git أبداً. ملفات `.env*` مستثناة في `.gitignore` باستثناء `.env.example`.

### تشغيل المشروع

```bash
# تشغيل web وbackend معاً (الأكثر شيوعاً)
pnpm dev
# web على: http://localhost:5000
# backend على: http://localhost:3001

# تشغيل web فقط
pnpm dev:web

# تشغيل backend فقط
pnpm dev:backend

# تشغيل backend مع MCP server
pnpm --filter @the-copy/backend dev:mcp
```

### أوامر مفيدة

```bash
# بناء المشروع كاملاً (Turbo يبني الحزم بالترتيب الصحيح)
pnpm build

# التحقق الشامل قبل الـ push
pnpm validate                           # format + lint + type-check + test

# تشغيل الاختبارات
pnpm test                               # كل الاختبارات
pnpm --filter @the-copy/web test        # web فقط
pnpm --filter @the-copy/backend test    # backend فقط

# قاعدة البيانات
pnpm --filter @the-copy/backend db:generate   # توليد migration جديد
pnpm --filter @the-copy/backend db:push       # تطبيق migrations
pnpm --filter @the-copy/backend db:studio     # Drizzle Studio (واجهة بيانات)

# تنظيف كامل وإعادة تثبيت
pnpm clean && pnpm install
```

### كيف يعمل Turbo في هذا المشروع

```mermaid
flowchart LR
    subgraph "مرحلة البناء"
        A["packages/*\nbuild"] --> B["apps/backend\nbuild"]
        A --> C["apps/web\nbuild"]
    end
    subgraph "مرحلة الفحص (تعتمد على build)"
        B --> D[lint]
        C --> D
        B --> E[type-check]
        C --> E
        B --> F[test]
        C --> F
    end
```

Turbo يخزن نتائج كل مهمة (caching) — إذا لم يتغير الكود، تُعاد النتيجة من الـ cache فوراً دون إعادة تشغيل.

---

## 8. التواصل

### الإبلاغ عن خطأ (Bug Report)

افتح [Issue جديد](https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy/issues/new) وأدرج:

```markdown
**وصف الخطأ**
وصف واضح وموجز لما حدث.

**خطوات إعادة الإنتاج**
1. اذهب إلى '...'
2. اضغط على '...'
3. انظر الخطأ

**السلوك المتوقع**
ماذا كان يجب أن يحدث؟

**بيئة التشغيل**
- OS: [مثل: Windows 11]
- Node: [مثل: 20.15.0]
- المتصفح: [مثل: Chrome 120]
- الفرع/الإصدار: [مثل: main أو develop]

**logs أو screenshots**
أضف أي معلومات إضافية مفيدة.
```

### اقتراح ميزة جديدة

افتح [Issue](https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy/issues) من نوع **Feature Request** مع وسم `enhancement`، واشرح:

- ما المشكلة التي تحلها هذه الميزة؟
- كيف تتصور أن تعمل؟
- هل هناك بدائل أخرى جربتها؟

### الأسئلة والنقاشات

استخدم [GitHub Discussions](https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy/discussions) للأسئلة العامة والنقاشات التقنية — لا تفتح Issue لمجرد سؤال.

### قواعد التعامل

- كن محترماً ومهنياً في جميع التعليقات
- التعليقات على الكود تكون على **الكود**، لا على الشخص
- في المراجعات، اشرح **لماذا** وليس **ماذا** فقط
- إذا لم تكن متأكداً، اسأل قبل أن تفترض

---

## ملاحق

### جدول حزم workspace

| الحزمة | المسار | الاستخدام |
|--------|--------|-----------|
| `@the-copy/shared` | `packages/shared` | Types وutils مشتركة |
| `@the-copy/ui` | `packages/ui` | مكونات Radix UI + Tailwind |
| `@the-copy/cinematography` | `packages/cinematography` | التصوير السينمائي |
| `@the-copy/prompt-engineering` | `packages/prompt-engineering` | هندسة الـ prompts |
| `@the-copy/breakapp` | `packages/breakapp` | أداة تفكيك السيناريو |
| `@the-copy/core-memory` | `packages/core-memory` | ذاكرة النظام الأساسية |

### الملفات التي لا يجب الـ commit عليها أبداً

```
.env*                  (عدا .env.example)
*.pem / *.key / *.p12  — مفاتيح التشفير والشهادات
node_modules/          — الاعتماديات
.next/ / dist/         — ملفات البناء
*.log                  — ملفات السجلات
mcp.json               — إعدادات MCP تحتوي على tokens
service-account*.json  — بيانات اعتماد Google/Firebase
```

---

*آخر تحديث: مارس 2026 — للاقتراحات على هذا الدليل، افتح PR مع نطاق `docs(contributing)`.*

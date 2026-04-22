# دليل الاختبارات — The Copy Monorepo

## نظرة عامة

يعتمد المشروع على بنية اختبارات متعددة الطبقات تغطي وحدة الكود (unit)، والتكامل (integration)، والدخان (smoke)، واختبارات النهاية إلى النهاية (E2E). يُستخدم Vitest إطاراً أساسياً لكلا التطبيقين، فيما يتولى Playwright اختبارات المتصفح الشاملة، ويحضر Cypress في التبعيات الجذرية للمشروع.




| الطبقة | التطبيق | إطار الاختبار | مكتبة المحاكاة | مكتبة التأكيدات |
|---|---|---|---|---|
| وحدة + تكامل (Frontend) | `apps/web` | Vitest v2 + jsdom | `vi` (Vitest built-in) | `@testing-library/jest-dom` |
| مكونات React | `apps/web` | Vitest + `@testing-library/react` | `vi.mock` | `@testing-library/jest-dom` |
| E2E متصفح | `apps/web` | Playwright v1.49 | harness داخلي | Playwright assertions |
| وحدة + تكامل (Backend) | `apps/backend` | Vitest v4 + Node | `vi` (Vitest built-in) | Vitest built-in |
| HTTP integration | `apps/backend` | Vitest + Supertest | `vi.mock` | Supertest + Vitest |
| دخان (Smoke) | `apps/backend` | Vitest | بدون محاكاة | Vitest built-in |
| E2E متصفح (مستوى المشروع) | الجذر | Cypress v15 | — | Cypress assertions |

---

## أوامر تشغيل الاختبارات

### من الجذر (Turborepo)

```bash
# تشغيل جميع الاختبارات في كل التطبيقات عبر Turborepo
pnpm test

# التحقق السريع قبل الـ push (config + smoke لكلا التطبيقين)
pnpm prepush:verify

# التحقق الكامل: format + lint + type-check + test
pnpm validate

# دورة CI الكاملة
pnpm ci

# أوامر إضافية على مستوى الجذر
pnpm lint
pnpm type-check
pnpm build
```

### Frontend — `apps/web`

```bash
# تشغيل ملف اختبار محدد (الاختبار الافتراضي)
pnpm --filter @the-copy/web test

# اختبارات الإعداد والبيئة فقط
pnpm --filter @the-copy/web test:config

# اختبار الدخان البسيط للبيئة
pnpm --filter @the-copy/web test:smoke

# تشغيل جميع الاختبارات مع تقرير التغطية
pnpm --filter @the-copy/web test:coverage

# وضع المراقبة التفاعلي أثناء التطوير
pnpm --filter @the-copy/web test:watch

# واجهة Vitest المرئية (browser UI)
pnpm --filter @the-copy/web test:ui

# اختبارات E2E مع Playwright (headless)
pnpm --filter @the-copy/web e2e

# E2E مع واجهة Playwright المرئية
pnpm --filter @the-copy/web e2e:ui

# E2E مع فتح المتصفح (headed)
pnpm --filter @the-copy/web e2e:headed

# E2E في وضع التصحيح
pnpm --filter @the-copy/web e2e:debug

# اختبارات إمكانية الوصول فقط (a11y)
pnpm --filter @the-copy/web a11y:ci

# اختبارات الأداء فقط
pnpm --filter @the-copy/web perf:ci

# تغطية + E2E معاً
pnpm --filter @the-copy/web test:all
```

### Backend — `apps/backend`

```bash
# تشغيل جميع اختبارات الباك اند
pnpm --filter @the-copy/backend test

# اختبار ملف الإعداد فقط
pnpm --filter @the-copy/backend test:config

# تشغيل جميع الاختبارات مع تقرير التغطية
pnpm --filter @the-copy/backend test:coverage
```

---

## هيكل ملفات الاختبارات

```
apps/
├── web/
│   ├── tests/
│   │   ├── setup.ts                      # إعداد Vitest العام (jsdom + matchers)
│   │   └── e2e/                          # اختبارات Playwright (مستوى التطبيق)
│   ├── src/
│   │   ├── app/
│   │   │   ├── __smoke__/                # اختبارات الدخان
│   │   │   │   ├── simple.test.ts        # اختبار البيئة الأساسي
│   │   │   │   └── routes.smoke.test.tsx # اختبار المسارات
│   │   │   └── (main)/
│   │   │       ├── editor/
│   │   │       │   └── tests/
│   │   │       │       ├── unit/         # اختبارات الوحدة لمحرر النصوص
│   │   │       │       ├── integration/  # اختبارات التكامل للـ pipeline
│   │   │       │       ├── e2e/          # اختبارات E2E للمحرر
│   │   │       │       └── harness/      # أدوات مساعدة للاختبارات
│   │   │       ├── directors-studio/
│   │   │       │   ├── components/*.test.tsx
│   │   │       │   └── helpers/__tests__/
│   │   │       └── arabic-creative-writing-studio/
│   │   │           └── components/*.test.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   └── button.test.tsx       # اختبارات مكونات UI
│   │   │   └── shared/
│   │   │       └── *.test.tsx
│   │   └── lib/
│   │       ├── crypto/__tests__/         # اختبارات التشفير
│   │       └── drama-analyst/
│   │           ├── agents/**/*.test.ts   # اختبارات وكلاء التحليل
│   │           ├── orchestration/*.test.ts
│   │           └── services/*.test.ts
│   └── playwright.config.ts             # إعداد Playwright
│
└── backend/
    ├── src/
    │   ├── test/
    │   │   ├── setup.ts                  # إعداد Vitest العام (env mocks)
    │   │   └── integration/
    │   │       ├── api.integration.test.ts
    │   │       └── database.integration.test.ts
    │   ├── __tests__/
    │   │   ├── integration/              # اختبارات تكامل الـ controllers
    │   │   ├── services/                 # اختبارات الخدمات
    │   │   └── smoke/                   # اختبارات الدخان لـ API والـ queues
    │   ├── controllers/
    │   │   └── *.test.ts                # اختبارات الـ controllers
    │   ├── middleware/
    │   │   └── *.test.ts                # اختبارات الـ middleware
    │   ├── services/
    │   │   ├── *.test.ts                # اختبارات الخدمات
    │   │   ├── agents/**/*.test.ts      # اختبارات وكلاء الذكاء الاصطناعي
    │   │   └── rag/__tests__/           # اختبارات نظام RAG
    │   ├── queues/
    │   │   ├── *.test.ts
    │   │   └── jobs/*.test.ts
    │   ├── db/
    │   │   └── *.test.ts
    │   └── config/
    │       └── env.test.ts
    └── vitest.config.ts                 # إعداد Vitest للباك اند
```

---

## اصطلاحات التسمية

### تسمية الملفات

| النمط | الاستخدام | مثال |
|---|---|---|
| `*.test.ts` | اختبارات وحدة أو تكامل (TypeScript) | `auth.service.test.ts` |
| `*.test.tsx` | اختبارات مكونات React | `button.test.tsx` |
| `*.spec.ts` | ملفات المواصفات (نادر الاستخدام في هذا المشروع) | — |
| `*.integration.test.ts` | اختبارات التكامل الصريحة | `api.integration.test.ts` |
| `*.smoke.test.ts` | اختبارات الدخان | `api-endpoints.smoke.test.ts` |
| `*.e2e.test.ts` | اختبارات E2E داخل `src/` | `full-import-classify-flow.e2e.test.ts` |
| `__tests__/` | مجلد اختبارات مجمّعة | `__tests__/integration/` |
| `__smoke__/` | مجلد اختبارات الدخان | `__smoke__/simple.test.ts` |

### تسمية وحدات الاختبار

النمط الأساسي: `describe` يعكس اسم الوحدة، `it` يصف السلوك المتوقع:

```typescript
describe('AuthController', () => {
  describe('signup', () => {
    it('should successfully create a new user', async () => { ... });
    it('should handle validation errors', async () => { ... });
    it('should handle duplicate email error', async () => { ... });
  });
});

// الاختبارات بالعربية مقبولة للسياق العربي
describe('اختبار بسيط للبيئة', () => {
  it('يجب أن تعمل مكتبة الاختبار', () => { ... });
});
```

**القواعد:**
- `describe` يحمل اسم الكلاس أو الوحدة أو الـ feature المختبرة.
- `it` يبدأ دائماً بـ `should` (بالإنجليزية) أو `يجب أن` (بالعربية).
- اختبارات الـ controllers تُجمّع بـ `describe` داخلية لكل method.
- أسماء الاختبارات تصف السلوك المتوقع وليس التنفيذ.

**أمثلة من المشروع:**

- `apps/web/src/config/apps.config.test.ts`
- `apps/web/src/middleware.test.ts`
- `apps/backend/src/services/realtime.service.test.ts`
- `apps/backend/src/middleware/auth.middleware.test.ts`

---

## المحاكاة (Mocking)

### محاكاة قاعدة البيانات (DB)

يُحاكي الباك اند وحدة قاعدة البيانات باستخدام `vi.mock` مع Drizzle ORM:

```typescript
// apps/backend/src/services/auth.service.test.ts
import { vi } from 'vitest';

vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// داخل الاختبار: سلسلة Drizzle تُحاكى بالكامل
mockDb.select.mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),  // مستخدم غير موجود
    }),
  }),
});

mockDb.insert.mockReturnValue({
  values: vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: 'user-123', email: 'test@example.com' }]),
  }),
});
```

لاختبارات التكامل مع قاعدة البيانات يُستخدم نمط mock على مستوى الـ client:

```typescript
// apps/backend/src/test/integration/database.integration.test.ts
vi.mock('@/db/client', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
    exec: vi.fn(),
  },
}));

// محاكاة transaction مع rollback
mockDb.transaction.mockRejectedValueOnce(new Error('Transaction failed'));
```

### محاكاة الـ API والـ Logger

```typescript
// apps/backend/src/test/setup.ts — يُطبّق على جميع اختبارات الباك اند
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// محاكاة إعداد البيئة في اختبارات التكامل
vi.mock('@/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-key-min-32-chars-length!',
    CORS_ORIGIN: 'http://localhost:5000',
    REDIS_URL: 'redis://localhost:6379/0',
  },
}));
```

**أمثلة إضافية من المشروع:**

- `apps/backend/src/services/metrics-aggregator.service.test.ts`
- `apps/backend/src/services/websocket.service.test.ts`

### محاكاة Auth والـ JWT

```typescript
// apps/backend/src/services/auth.service.test.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

vi.mock('bcrypt');
vi.mock('jsonwebtoken');

// داخل الاختبار
vi.mocked(bcrypt.hash).mockResolvedValue('mock-hashed-password' as never);
vi.mocked(jwt.sign).mockReturnValue('mock-jwt-token' as never);
```

محاكاة Response لاختبارات الـ controllers:

```typescript
// apps/backend/src/controllers/auth.controller.test.ts
let mockResponse: Partial<Response>;

beforeEach(() => {
  mockResponse = {
    status: vi.fn().mockReturnThis(),   // chainable
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
});
```

### محاكاة Browser APIs (Frontend)

ملف `apps/web/tests/setup.ts` يُعرّف محاكاة تلقائية لـ Browser APIs لكل الاختبارات:

```typescript
// matchMedia — للمكونات التي تستخدم media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  constructor(_callback: ResizeObserverCallback) {}
}
Object.defineProperty(window, 'ResizeObserver', { value: MockResizeObserver });

// IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  constructor(_callback: IntersectionObserverCallback) {}
}
Object.defineProperty(window, 'IntersectionObserver', { value: MockIntersectionObserver });
```

**أمثلة من الويب:**

- `apps/web/src/env.test.ts`
- `apps/web/src/config/pages.manifest.test.ts`

### محاكاة مكونات React

```typescript
// apps/web/src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

---

## اختبارات التكامل مع Supertest

يُستخدم Supertest في الباك اند لاختبار نقاط API الفعلية دون رفع خادم حقيقي:

```typescript
// apps/backend/src/test/integration/api.integration.test.ts
import request from 'supertest';
import express from 'express';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
  });

  app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    if (email === 'test@example.com' && password === 'test123') {
      return res.status(200).json({ token: 'mock-jwt-token' });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  });
});

it('should return 200 for health check', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('healthy');
});

it('should return 401 for invalid credentials', async () => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'wrong@example.com', password: 'wrong' });
  expect(response.status).toBe(401);
});
```

---

## اختبارات E2E (Playwright)

### الإعداد والتهيئة

ملف الإعداد: `apps/web/playwright.config.ts`

| الخاصية | القيمة |
|---|---|
| مجلد الاختبارات | `./tests/e2e` |
| التشغيل المتوازي | مفعّل (`fullyParallel: true`) |
| إعادة المحاولة | `2` في CI، `0` محلياً |
| العمال | `1` في CI، تلقائي محلياً |
| URL الأساسي | `http://localhost:5000` |
| التتبع | عند أول إعادة محاولة |
| لقطة الشاشة | عند الفشل فقط |
| الفيديو | يُحتفظ به عند الفشل |

**ملاحظة:** Next.js يعمل على port **5000** في هذا المشروع، لذا يجب التأكد من أن `baseURL` في إعداد Playwright يستخدم `http://localhost:5000`.

### المتصفحات المدعومة

```
chromium    → Desktop Chrome
firefox     → Desktop Firefox
webkit      → Desktop Safari
Mobile Chrome → Pixel 5
Mobile Safari → iPhone 12
```

### تشغيل الخادم قبل الاختبارات

```typescript
// playwright.config.ts
webServer: {
  command: 'npm run build && npm run start',
  url: 'http://localhost:5000',
  reuseExistingServer: !process.env.CI,  // يُعيد استخدام الخادم محلياً
  timeout: 120_000,
}
```

### نمط كتابة اختبار E2E

```typescript
// apps/web/src/app/(main)/editor/tests/e2e/full-import-classify-flow.e2e.test.ts
import { test, expect } from '@playwright/test';
import { startBackendServerHarness } from '../harness/backend-server-harness';

test.describe('full import classify flow', () => {
  test('imports txt file from UI and classifies content', async ({ page }) => {
    // تجميع أخطاء الـ console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // رفع harness خادم الباك اند
    const harness = await startBackendServerHarness(18987, {
      env: { AGENT_REVIEW_MOCK_MODE: 'success' },
    });

    try {
      await page.goto('/');

      // فتح قائمة الملف
      await page.getByTestId('menu-section-ملف').click();

      // اختيار ملف وانتظار استجابة API
      const chooserPromise = page.waitForEvent('filechooser');
      await page.getByTestId('menu-action-open-file').click();
      const chooser = await chooserPromise;

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/api/file-extract') && res.request().method() === 'POST',
          { timeout: 30_000 }
        ),
        chooser.setFiles(fixturePath),
      ]);

      expect(response.ok()).toBe(true);

      // التحقق من ظهور المحتوى في المحرر
      const editor = page.locator('.app-editor-host .ProseMirror').first();
      await expect(editor).toContainText(/مشهد\s*1\s*داخلي/u, { timeout: 30_000 });

      // لا أخطاء في الـ console
      expect(consoleErrors.length).toBe(0);
    } finally {
      await harness.stop();
    }
  });
});
```

### أوامر E2E التفصيلية

```bash
# تشغيل E2E على متصفح محدد
pnpm --filter @the-copy/web e2e --project=chromium
pnpm --filter @the-copy/web e2e --project=firefox

# تشغيل اختبار واحد
pnpm --filter @the-copy/web e2e --grep "full import classify flow"

# اختبارات a11y فقط (موسومة بـ @a11y)
pnpm --filter @the-copy/web a11y:ci

# اختبارات الأداء فقط (موسومة بـ @performance)
pnpm --filter @the-copy/web perf:ci

# تقارير E2E (HTML + JSON + JUnit)
# توجد في: apps/web/reports/e2e/
```

### كتابة اختبار جديد

ضع الاختبار في:

```text
apps/web/tests/e2e/<name>.spec.ts
```

واستخدم `baseURL` الموحّد (`http://localhost:5000`) المُعرَّف في `playwright.config.ts`.

---

## إعداد ملفات Setup

### Frontend — `apps/web/tests/setup.ts`

يُشغَّل تلقائياً قبل كل ملف اختبار عبر `setupFiles` في `vitest.config.ts`:

- يستورد ويُفعّل `@testing-library/jest-dom/matchers` للتأكيدات المتقدمة
- يُنظّف الـ DOM بعد كل اختبار (`cleanup()`)
- يُفرّغ `localStorage` و `sessionStorage` بعد كل اختبار
- يُعرّف محاكاة `matchMedia`، `scrollTo`، `ResizeObserver`، `IntersectionObserver`

### Backend — `apps/backend/src/test/setup.ts`

يُشغَّل تلقائياً قبل كل ملف اختبار عبر `setupFiles` في `vitest.config.ts`:

- يُحاكي `@/utils/logger` لمنع تسرب السجلات في الاختبارات
- يُهيّئ متغيرات البيئة لبيئة الاختبار:
  ```
  NODE_ENV=test
  DATABASE_URL=postgresql://test:test@localhost:5432/test
  JWT_SECRET=test-secret-key
  GOOGLE_GENAI_API_KEY=test-api-key
  CORS_ORIGIN=http://localhost:5000
  PORT=3001
  ```

---

## تقارير التغطية

### Frontend

```bash
# توليد تقرير التغطية
pnpm --filter @the-copy/web test:coverage

# موقع التقارير: apps/web/reports/coverage/
# الصيغ المتاحة: text (terminal), json, html, lcov, json-summary
```

**عتبات التغطية المطلوبة:**

| المستوى | Lines | Functions | Branches | Statements |
|---|---|---|---|---|
| Global (الكل) | 85% | 85% | 80% | 85% |
| Per File (كل ملف) | 80% | 80% | 75% | 80% |

### Backend

```bash
# توليد تقرير التغطية
pnpm --filter @the-copy/backend test:coverage

# موقع التقارير: apps/backend/coverage/
# الصيغ المتاحة: text, json, html, lcov, json-summary
```

**عتبات التغطية المطلوبة:**

| المستوى | Lines | Functions | Branches | Statements |
|---|---|---|---|---|
| Global (الكل) | 85% | 85% | 80% | 85% |
| Per File (كل ملف) | 80% | 80% | 75% | 80% |

**الملفات المستثناة من التغطية (Backend):**
- `src/db/migrations/**` — ملفات الـ migrations
- `**/mcp-server.ts` — خادم MCP
- `**/*.mock.*` — ملفات المحاكاة
- `**/*.config.*` — ملفات الإعداد

**الملفات المستثناة من التغطية (Frontend):**
- `**/.next/**`, `**/dist/**` — مخرجات البناء
- `cypress/**` — اختبارات Cypress
- `next.config.*`, `tailwind.config.*` — ملفات إعداد الأدوات
- ملفات الاختبار نفسها (`**/*.test.*`, `**/*.spec.*`)

---

## ملاحظات بيئة الاختبار

### Vitest وـ TypeScript

يستخدم الباك اند ملف TypeScript مخصص للاختبارات:

```
apps/backend/tsconfig.vitest.json   — tsconfig مخصص للـ typecheck في الاختبارات
```

### Path Aliases في الاختبارات

يدعم كلا التطبيقين aliases التالية داخل الاختبارات:

**Frontend (`apps/web`):**
```
@       → src/
~       → src/
@core   → src/lib/drama-analyst/
@agents → src/lib/drama-analyst/agents/
@services → src/lib/drama-analyst/services/
@components → src/components/
```

**Backend (`apps/backend`):**
```
@     → src/
@core → src/services/agents/core/
```

### استبعاد اختبارات E2E من Vitest

اختبارات `tests/e2e/` و `**/tests/e2e/**` مستثناة صراحةً من Vitest عبر `exclude` في `vitest.config.ts`، وتُشغَّل حصراً عبر Playwright.

### تنظيف الحالة بين الاختبارات

```typescript
// يجب استدعاء vi.clearAllMocks() في beforeEach لضمان عزل الاختبارات
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## المصطلحات

| المصطلح | المعنى في سياق هذا المشروع |
|---|---|
| smoke test | اختبار سريع للتأكد من أن التهيئة الأساسية تعمل |
| config test | اختبار يثبت صحة ملفات env/config/middleware |
| integration test | اختبار يتحقق من تفاعل عدة وحدات معاً |
| E2E test | اختبار يحاكي سلوك المستخدم الكامل في المتصفح |
| harness | بنية مساعدة لرفع خادم وهمي أثناء اختبارات E2E |

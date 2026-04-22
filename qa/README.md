# البنية الاختبارية المشتركة للمشروع

## نظرة عامة

تم إنشاء هذه البنية لتوحيد اختبارات التكامل الحقيقي واختبارات البداية إلى النهاية (E2E) عبر المشروع. تهدف إلى توفير أدوات مشتركة، إعدادات مركزية، ومعايير موحدة لجميع الوكلاء العاملين على المشروع.

## الهيكل

```
qa/
├── config/                 # إعدادات مركزية
│   └── TestConfigManager.ts # مدير الإعدادات الموحد
├── core/                   # المكونات الأساسية
│   ├── TestLogger.ts       # نظام التسجيل الاحترافي
│   ├── TestArtifactsManager.ts # إدارة artifacts
│   └── TestFixtures.ts     # helpers وfixtures مشتركة
├── integration/            # اختبارات التكامل الحقيقي
│   └── foundation-integration.test.ts
├── e2e/                    # اختبارات E2E
│   ├── playwright.config.ts
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── foundation-e2e.test.ts
└── README.md
```

## الاستخدام

### متغيرات البيئة المطلوبة

```bash
# إعدادات التطبيق
NODE_ENV=test
APP_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:3001

# إعدادات الاختبارات
TEST_TIMEOUT=30000
TEST_PARALLEL_WORKERS=1
TEST_HEADLESS=true

# إعدادات Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_HEADLESS=true

# إعدادات التسجيل
TEST_LOG_LEVEL=info
TEST_LOG_FILE=./test-results/logs/test.log

# إعدادات artifacts
TEST_ARTIFACTS_DIR=./test-results/artifacts
TEST_SCREENSHOTS_DIR=./test-results/screenshots
TEST_TRACES_DIR=./test-results/traces
TEST_VIDEOS_DIR=./test-results/videos
```

### تشغيل الاختبارات

```bash
# جميع اختبارات البنية التأسيسية
pnpm test:foundation

# اختبارات التكامل الحقيقي فقط
pnpm test:foundation:integration

# اختبارات E2E فقط
pnpm test:foundation:e2e
```

### استخدام المكونات في اختباراتك

```typescript
import { testConfig } from '../../qa/config/TestConfigManager.js';
import { testLogger } from '../../qa/core/TestLogger.js';
import { testArtifacts } from '../../qa/core/TestArtifactsManager.js';
import { setupTestEnvironment, teardownTestEnvironment } from '../../qa/core/TestFixtures.js';

// في بداية الاختبار
await testConfig.loadConfig();
await testLogger.initialize();
await testArtifacts.initialize();

// تسجيل
testLogger.info('رسالة', { testName: 'my-test' });

// حفظ artifacts
await testArtifacts.saveScreenshot(buffer, 'screenshot.png', {
  testName: 'my-test',
  testSuite: 'my-suite'
});
```

## إضافة اختبارات جديدة

### اختبارات تكامل

1. أنشئ ملف في `qa/integration/`
2. استخدم Vitest
3. اتبع النمط الموجود في `foundation-integration.test.ts`

### اختبارات E2E

1. أنشئ ملف في `qa/e2e/`
2. استخدم Playwright
3. اتبع النمط الموجود في `foundation-e2e.test.ts`

## اتفاقيات التسمية

- ملفات الاختبار: `*.test.ts` للتكامل، `*.e2e.test.ts` للـ E2E
- suites: استخدم وصف عربي واضح
- tests: ابدأ بفعل (يجب أن...)
- artifacts: استخدم تسمية وصفية مع timestamp

## artifacts

يتم حفظ جميع artifacts في `test-results/`:

- `logs/`: ملفات السجل
- `screenshots/`: لقطات الشاشة
- `traces/`: traces الشبكة والأداء
- `videos/`: تسجيلات الفيديو
- `artifacts/`: ملفات إضافية

## التسجيل

- structured logging بصيغة JSON
- مستويات: error, warn, info, debug
- يشمل context لكل رسالة (testName, suiteName, إلخ)

## ملاحظات مهمة

- لا تستخدم mocks أو stubs في المسارات الأساسية
- استخدم اتصال حقيقي بالخدمات
- جميع الاختبارات يجب أن تكون قابلة للتشغيل الفعلي
- اتبع patterns الموجودة لضمان التناسق
- اختبر البنية بانتظام للتأكد من عدم كسرها

## استكشاف الأخطاء

### مشاكل شائعة

1. **متغيرات بيئة مفقودة**: تأكد من وجود جميع المتغيرات المطلوبة
2. **Playwright غير مثبت**: شغّل `npx playwright install`
3. **مجلدات غير موجودة**: البنية تنشئ المجلدات تلقائياً
4. **أخطاء في التسجيل**: تأكد من تهيئة المدير قبل الاستخدام

### تنظيف

```bash
# حذف artifacts القديمة
rm -rf test-results/
```

## التطوير المستقبلي

- إضافة دعم لمزيد من المتصفحات في E2E
- إضافة مقاييس أداء
- تحسين parallel execution
- إضافة visual regression testing
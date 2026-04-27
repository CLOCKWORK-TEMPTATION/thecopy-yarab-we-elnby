# ملخص مخالفات Lint

## الإجمالي
- **@the-copy/web**: 1384 errors, 36 warnings, 454 files
- **@the-copy/backend**: 1450 errors, 0 warnings, 162 files
- **المجموع**: 2834 errors, 36 warnings

## المخالفات حسب النوع (Web)

### 1. no-console (151 مخالفة) - الأكثر شيوعًا
- الملفات الرئيسية:
  - apps/web/src/app/(main)/art-director/index.ts (36)
  - apps/web/scripts/migrate-screenplay-data.ts (23)
  - apps/web/src/app/(main)/editor/scripts/rag-query.ts (10)
  - apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts (9)

### 2. max-lines-per-function (103 مخالفات)
- الملفات الرئيسية:
  - apps/web/src/app/(main)/actorai-arabic/components/ActorAiArabicStudio.tsx (9)
  - apps/web/src/app/(main)/BUDGET/components/DetailView.tsx (4)
  - apps/web/src/app/(main)/actorai-arabic/self-tape-suite/components/SelfTapeSuite.tsx (2)

### 3. max-lines (72 مخالفة)
- ملفات طويلة جدًا تحتاج تقسيم

### 4. @typescript-eslint/no-empty-function (44 مخالفة)
- دوال فارغة تحتاج إزالة أو تعليق

### 5. @typescript-eslint/no-floating-promises (17 مخالفة)
- Promises غير معالجة

### 6. @typescript-eslint/consistent-type-definitions (3 مخالفات)
- استخدام type بدلاً من interface

### 7. import/no-anonymous-default-export (7 مخالفات)
- تصدير افتراضي مجهول

### 8. @typescript-eslint/unbound-method (11 مخالفة)
- طرق غير مرتبطة بـ this

### 9. @typescript-eslint/no-unsafe-call (4 مخالفات)
- استدعاءات غير آمنة

### 10. @typescript-eslint/no-unused-vars (11 مخالفة)
- متغيرات غير مستخدمة

## خطة الإصلاح

### الدفعة 1: المخالفات البسيطة والقابلة للإصلاح الآلي
- @typescript-eslint/no-unused-vars
- @typescript-eslint/consistent-type-definitions
- import/no-anonymous-default-export

### الدفعة 2: console.log
- استبدال console.log بـ logger

### الدفعة 3: دوال فارغة
- إزالة أو تعليق الدوال الفارغة

### الدفعة 4: Promises غير معالجة
- إضافة await أو .catch()

### الدفعة 5: دوال طويلة
- تقسيم الدوال الطويلة

### الدفعة 6: ملفات طويلة
- تقسيم الملفات الطويلة

### الدفعة 7: المخالفات المتبقية
- unbound-method
- no-unsafe-call
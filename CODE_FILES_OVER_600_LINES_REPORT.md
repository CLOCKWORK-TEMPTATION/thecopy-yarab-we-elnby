# تقرير ملفات الكود التي تتجاوز 600 سطر

## معيار الفحص

تم فحص ملفات الأكواد المصدرية فقط داخل المستودع.
الحد الأقصى المقبول: 600 سطر.
أي ملف يحتوي على أكثر من 600 سطر تم إدراجه في هذا التقرير.

## الملفات المخالفة

| الترتيب | عدد الأسطر | المسار |
|---:|---:|---|
| 1 | 1855 | scripts/hybrid-audit.js |
| 2 | 1121 | apps/web/src/styles/globals.css |
| 3 | 866 | apps/web/src/app/(main)/editor/src/styles/ui-kit.css |
| 4 | 861 | apps/web/src/app/(main)/art-director/art-director.css |

## ملخص تنفيذي

- إجمالي ملفات الكود التي تم فحصها: 2987
- عدد الملفات التي تتجاوز 600 سطر: 4
- أكبر ملف من حيث عدد الأسطر: scripts/hybrid-audit.js (1855 سطرًا)

## ملاحظات النطاق

تم استبعاد ملفات التوثيق (`.md`, `.mdx`)، وملفات الإعداد والبيانات (`.json`, `.yml`, `.yaml`, `.toml`, `.xml`, `.txt`, `.log`, `.csv`)، وlockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`)، ومجلدات البناء والمخرجات (`dist/`, `build/`, `out/`, `.next/`, `coverage/`, `.cache/`, `.turbo/`, `.vercel/`)، والملفات المولدة (`generated/`, `__generated__/`)، وملفات الاعتماد (`node_modules/`, `vendor/`, `railway/`)، وملفات `.git/`، وكذلك الملفات المصغّرة وملفات الخرائط (`*.min.js`, `*.min.css`, `*.map`) و`*.tsbuildinfo` من نطاق الفحص. الفحص اقتصر على الملفات المتعقّبة عبر `git ls-files` ذات الامتدادات المصدرية المحددة في المهمة.

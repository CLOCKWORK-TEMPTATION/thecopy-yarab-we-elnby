# تقرير ملفات الأكواد الفعلية التي تتخطى 600 سطر

- التاريخ: 2026-04-28
- المصدر: فحص مباشر للملفات على القرص باستخدام `wc -l` (لا اعتماد على أي تقرير أو وثيقة سابقة)
- إجمالي ملفات الأكواد المفحوصة (بعد الاستبعادات): 2841 ملفًا

## معايير الفحص

**الامتدادات المشمولة (أكواد فعلية فقط):**
`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`, `.go`, `.rs`, `.java`, `.kt`, `.swift`, `.rb`, `.php`, `.cs`, `.c`, `.cpp`, `.h`, `.hpp`, `.vue`, `.svelte`

**المسارات المستبعدة:**
`node_modules/`, `.git/`, `.next/`, `.turbo/`, `dist/`, `build/`, `.output/`, `coverage/`, `.cache/`, `output/`, `out/`, `storybook-static/`

**الملفات المستبعدة (ليست كود مكتوب):**
`*.min.js` (مُصغّرة)، `*.bundle.js` (مُجمّعة)، `*.d.ts` (تصريحات أنواع — لا يوجد منها ما يتجاوز 600 سطر أصلًا)

## النتيجة

**عدد ملفات الأكواد الفعلية التي تتخطى 600 سطر: 11 ملفًا**

| # | عدد الأسطر | المسار |
|---|-----------:|--------|

| 5 | 1600 | [apps/web/src/lib/ai/stations/station5-dynamic-symbolic-stylistic.ts](apps/web/src/lib/ai/stations/station5-dynamic-symbolic-stylistic.ts) |

| 7 | 1177 | [apps/backend/editor-runtime/final-review.mjs](apps/backend/editor-runtime/final-review.mjs) |



## ملاحظات تشغيلية

- إجمالي الأسطر في الـ 11 ملفًا: 17965 سطرًا
- توزيع: 8 ملفات في `apps/web/`، ملفان في `apps/backend/` و `apps/web/.../editor/server/` (وهما نسختان متطابقتان تقريبًا في الحجم — `final-review.mjs`)، وملف واحد في `scripts/`.
- الملفان `final-review.mjs` متشابهان في الحجم (1177 و 1176) — يحتاجان مراجعة لاحتمال التكرار/المرآة.
- تم التحقق من العينات (`ActorAiArabicStudio.tsx`, `paste-classifier.ts`, `integration.test.ts`) بإعادة `wc -l` مباشرة عليها — الأرقام مطابقة.

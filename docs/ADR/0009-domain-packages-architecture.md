# ADR-0009: بنية الحزم السينمائية المتخصصة

## الحالة

**ملغى جزئيًا** — تم تقليص 13 حزمة إلى 2 فقط (انظر التحديث أدناه)

## التحديث (2026-04-05)

بعد تحليل الاستخدام الفعلي، تبيّن أن 10 من 13 حزمة كانت بدون أي استيراد فعلي من التطبيق. الكود كان قد انتقل إلى مجلدات الراوتات داخل `apps/web/` عبر عملية decomposition لم تُكمل تنظيف الحزم القديمة.

**ما حُذف (المرحلة الأولى):** `@the-copy/breakdown`، `@the-copy/directors-studio`، `@the-copy/editor`، `@the-copy/budget`، `@the-copy/actorai`، `@the-copy/art-director`، `@the-copy/brain-storm-ai`، `@the-copy/cinefit`، `@the-copy/creative-writing`، `@the-copy/styleist`

**ما تم توحيده (المرحلة الثانية):**
- `@the-copy/cinematography` — تحولت إلى app-first ثم حُذفت من `packages/`
- `@the-copy/breakapp` — بقيت كحزمة package-first وتم توحيد الراوت عليها
- `@the-copy/prompt-engineering` — بقيت كمكتبة منطق مستقلة (domain library)

**الحزم المتبقية في `packages/` الآن:**

| الحزمة | الدور |
|---|---|
| `@the-copy/shared` | بنية تحتية مشتركة (AI, DB, auth, types) |
| `@the-copy/ui` | مكونات واجهة مشتركة (Radix UI) |
| `@the-copy/tsconfig` | إعدادات TypeScript مشتركة |
| `@the-copy/core-memory` | مكتبة RAG/chunking (باكيند فقط) |
| `@the-copy/breakapp` | تطبيق الجدولة والإنتاج (package-first) |
| `@the-copy/prompt-engineering` | مكتبة تحليل وقوالب prompts (domain library) |

---

## السياق الأصلي

"النسخة" ليست تطبيقًا عامًا؛ إنها منصة متخصصة في الإنتاج السينمائي العربي تضم مجالات متمايزة. الاستمرار في تكديس كل هذا داخل `apps/web/src` سيُنتج ملفات بآلاف الأسطر ويُصعّب الصيانة والاختبار.

## القرار الأصلي

اعتمدنا 13 حزمة workspace سينمائية متخصصة تحت `packages/`. هذا القرار أثبت عمليًا أنه أنتج ازدواجية بين الحزم وراوتات التطبيق بدل الفصل النظيف المطلوب.

## الدروس المستفادة

- الحزم التي لا تُستهلك فعليًا تتحول إلى دين تقني
- decomposition بدون تنظيف الأصل يُنتج مصدرَي حقيقة متنافسين
- النموذج الأنجح هو: حزم بنية تحتية (`shared`, `ui`, `tsconfig`) + حزمة واحدة أو اثنتين كـ feature packages فقط للميزات التي تحتاج فعلاً لعقد مشترك

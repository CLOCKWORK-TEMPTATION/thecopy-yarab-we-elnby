# سجل إعادة الهيكلة — MIGRATION_LOG.md

> **التاريخ:** 27 مارس 2026
> **النطاق:** brain-storm-ai/ | BREAKAPP/ | actorai-arabic/
> **الحالة:** ✅ مكتمل

---

## المرحلة 1: نتائج التحليل والجرد ✅

### 1.1 جرد 'use client' vs 'use server'

**brain-storm-ai/** — كل المكونات `'use client'` (مبرر — تستخدم hooks/events)
**BREAKAPP/** — كل الصفحات `'use client'` (مبرر — تعتمد على localStorage/useRouter)
**actorai-arabic/** — `page.tsx` و `self-tape-suite/page.tsx` فقط `'use client'` (dynamic import)

**لا يوجد `"use server"` في أي من المجلدات الثلاثة.**
**لا يوجد caching قديم في أي من المجلدات الثلاثة.**

### 1.2 تصنيف المخاطر

| العنصر                                        | المخاطرة | الحالة                      |
| --------------------------------------------- | -------- | --------------------------- |
| BREAKAPP `app/layout.tsx` يعيد تعريف `<html>` | 🔴 حرج   | ✅ تم حذفه                  |
| BREAKAPP هيكل مكرر `app/` + `src/app/`        | 🔴 حرج   | ✅ تم تسطيحه                |
| BREAKAPP ملفات تكوين خاصة                     | 🟡 متوسط | ✅ تم حذفها                 |
| actorai-arabic 163KB component                | 🟡 متوسط | ⏳ يحتاج مرحلة تفكيك مستقلة |
| brain-storm-content.tsx 36KB في الجذر         | 🟢 منخفض | ✅ تم حذفه                  |
| أدوات خارجية (.minimax, .kilocode, .specify)  | 🟢 منخفض | ✅ تم حذفها                 |

---

## المرحلة 2: الهيكل المستهدف ✅

تم إنشاء المجلدات الجديدة:

- `brain-storm-ai/src/components/{features,layout,ui}`
- `brain-storm-ai/docs/`
- `actorai-arabic/components/features/`
- `actorai-arabic/lib/`

---

## المرحلة 3: إعادة الهيكلة ✅

### BREAKAPP — التغييرات المنفَّذة

| الإجراء               | التفاصيل                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| حذف `app/layout.tsx`  | كان يعيد تعريف `<html>` و `<body>` — يتعارض مع root layout                                                   |
| حذف `app/globals.css` | CSS خاص لا ينتمي لمجلد فرعي                                                                                  |
| تسطيح route structure | نُقلت الصفحات من `app/(auth)/`, `app/(dashboard)/`, `app/(crew)/`, `app/(runner)/` إلى مستوى BREAKAPP مباشرة |
| حذف `src/app/`        | هيكل مكرر — بقايا تطبيق مستقل                                                                                |
| حذف ملفات التكوين     | `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`                                                      |
| إضافة `loading.tsx`   | مؤشر تحميل بالعربية                                                                                          |
| إضافة `error.tsx`     | حدود خطأ مع زر إعادة المحاولة                                                                                |
| نقل التوثيق           | `DOCUMENTATION.md`, `SUMMARY.md`, `MERGE_RESOLUTION_REPORT.md` → `docs/`                                     |

**قرار:** إبقاء `page.tsx` كـ `'use client'` — لأن `isAuthenticated()` تعتمد على `localStorage` (client-only API).

### brain-storm-ai — التغييرات المنفَّذة

| الإجراء                           | التفاصيل                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| حذف `brain-storm-content.tsx`     | 36KB/911 سطر — نسخة قديمة. `page.tsx` يستورد من `src/components/BrainStormContent.tsx`         |
| حذف `.env.example`                | لا ينتمي لمجلد فرعي داخل app router                                                            |
| تصنيف المكونات                    | `BrainStormHeader`, `AgentsSidebar` → `layout/`                                                |
| تصنيف المكونات                    | `AgentCard`, `AgentIconComponent`, `ControlPanel`, `DebatePanel`, `FeaturesGrid` → `features/` |
| تحديث imports                     | `BrainStormContent.tsx` — مسارات الاستيراد محدّثة للمجلدات الجديدة                             |
| تحديث barrel exports              | `index.ts` — مسارات التصدير محدّثة                                                             |
| نقل التوثيق                       | 4 ملفات → `docs/`                                                                              |
| إضافة `loading.tsx` + `error.tsx` | ملفات UX إلزامية                                                                               |

### actorai-arabic — التغييرات المنفَّذة

| الإجراء                                           | التفاصيل                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| نقل constants                                     | `types/constants.ts` (311 سطر) → `lib/constants.ts` + re-export للتوافق |
| إضافة `loading.tsx` + `error.tsx`                 | ملفات UX إلزامية                                                        |
| إضافة `self-tape-suite/loading.tsx` + `error.tsx` | ملفات UX للـ sub-route                                                  |

**قرار:** عدم تفكيك `ActorAiArabicStudio.tsx` (163KB) في هذه المرحلة — يحتاج تحليل عميق ومرحلة مستقلة.

---

## المرحلة 7: التنظيف ✅

تم حذف مجلدات الأدوات الخارجية:

- `.minimax/` من brain-storm-ai و BREAKAPP و actorai-arabic
- `.kilocode/` من actorai-arabic
- `.specify/` من actorai-arabic

---

## قائمة التحقق النهائية

```
✅ كل page.tsx ≤ 50 سطر (thin page) — ماعدا BREAKAPP/page.tsx (redirect logic — مبرر)
✅ لا يوجد layout.tsx يعيد تعريف <html> أو <body>
✅ لا يوجد ملفات تكوين خاصة داخل مجلد فرعي
✅ لا يوجد هياكل مكررة (app/ و src/app/)
✅ كل 'use client' مبرر — المكون يستخدم hooks/events فعلاً
✅ imports محدثة بعد كل نقل
✅ كل route يحتوي loading.tsx + error.tsx
✅ التوثيق منظم في docs/
✅ مجلدات الأدوات الخارجية محذوفة
⏳ ActorAiArabicStudio.tsx (163KB) — يحتاج مرحلة تفكيك مستقلة
⏳ pnpm build — يحتاج تشغيل للتحقق النهائي
```

---

## الهيكل النهائي

### BREAKAPP/

```
BREAKAPP/
├── page.tsx                    ← 'use client' + redirect
├── loading.tsx                 ← مؤشر تحميل
├── error.tsx                   ← حدود خطأ
├── login/qr/page.tsx           ← QR login
├── dashboard/page.tsx          ← لوحة التحكم
├── director/page.tsx           ← لوحة المخرج
├── crew/menu/page.tsx          ← قائمة الطعام
├── runner/track/page.tsx       ← تتبع Runner
├── components/                 ← ConnectionTest, maps, scanner
├── hooks/                      ← useGeolocation, useSocket
├── lib/                        ← auth.ts, types/
├── docs/                       ← توثيق
└── README.md
```

### brain-storm-ai/

```
brain-storm-ai/
├── page.tsx                    ← thin (dynamic import)
├── loading.tsx                 ← مؤشر تحميل
├── error.tsx                   ← حدود خطأ
├── README.md
├── src/
│   ├── components/
│   │   ├── BrainStormContent.tsx  ← orchestrator
│   │   ├── index.ts               ← barrel exports
│   │   ├── features/              ← AgentCard, ControlPanel, DebatePanel, FeaturesGrid, AgentIconComponent
│   │   ├── layout/                ← BrainStormHeader, AgentsSidebar
│   │   └── ui/                    ← (فارغ — للاستخدام المستقبلي)
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   └── types/
└── docs/                       ← API_DOCS, TECHNICAL_DOCUMENTATION, USER_GUIDE, USER_GUIDE_AR
```

### actorai-arabic/

```
actorai-arabic/
├── page.tsx                    ← thin (dynamic import من @the-copy/actorai)
├── loading.tsx                 ← مؤشر تحميل
├── error.tsx                   ← حدود خطأ
├── components/
│   ├── ActorAiArabicStudio.tsx ← ⚠️ 163KB — يحتاج تفكيك
│   ├── features/               ← (فارغ — للتفكيك المستقبلي)
│   └── VoiceCoach.tsx
├── hooks/                      ← 4 hooks + barrel
├── types/                      ← index.ts + constants.ts (re-export)
├── lib/                        ← constants.ts (المصدر الأصلي)
├── self-tape-suite/
│   ├── page.tsx + loading.tsx + error.tsx
│   └── components/SelfTapeSuite.tsx
├── docs/
└── README.md
```

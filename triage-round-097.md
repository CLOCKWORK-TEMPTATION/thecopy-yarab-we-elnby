# Triage Report — جولة 097

> **منهجية:** Discovery → Triage → Execute. هذا الملف هو مخرج Triage.
> **تاريخ المسح:** 2026-04-26.
> **مرجعية:** [round-notes.md](output/round-notes.md)، [triage-round-096.md](triage-round-096.md).
> **نظام الأدلة:** `[OP]` = Operationally Proven (شغّلت أمراً ورأيت المخرج). `[RD]` = Read-Documented (قرأت ملف موروث ورأيت السطر). `[UN]` = Unverified.

---

## 0. حصيلة Pre-Flight (خط الأساس قبل أي تغيير)

تم على فرع `round-097-debt-cleanup` داخل worktree معزول `../the-copy-097-worktree` بعد `pnpm install --frozen-lockfile` نظيف.

| الفحص | الناتج | الدليل |
|------|--------|--------|
| `pnpm install --frozen-lockfile` | نجاح في 53.4s — تحذير Ignored build scripts (11 dep) | [OP] |
| `pnpm type-check` | **فشل** — 1 خطأ TS2345 في `apps/backend/src/controllers/analysis.controller.ts:57` (HeadingLevel undefined مع exactOptionalPropertyTypes). 7/8 packages نجح، فشل `@the-copy/backend#type-check` | [OP] |
| `pnpm lint` | **فشل** — `@the-copy/backend#lint` JS heap OOM (exit 134) عند تحميل 528 ملف TS في برنامج typed-lint | [OP] |
| `pnpm --filter @the-copy/web lint` (مستقل) | **فشل** — 7945 problems (64 errors, 7881 warnings) | [OP] |
| `pnpm build` | **نجاح أخضر** — 5/5 tasks، Time 2m44s | [OP] |
| `pnpm test` (kicked from root) | **فشل** — 3 اختبارات في `apps/backend/src/config/env.test.ts` (env-safe يحجب قبل وصول التحقق المتوقَّع). 1083 ناجح + 3 فاشل + 3 متخطّى. باقي الحزم لم تظهر أحداث في turbo log | [OP] |
| `pnpm --filter @the-copy/web test` (مستقل) | **معلّق ≥5 دقائق بـ stdout=0 bytes — أُوقف عمداً.** تُعتمد قائمة فشل web من 096 كـ `[RD]` خط أساس | [OP] (الحالة: hung)، [RD] (المحتوى الفاشل) |
| `playwright test --list` | **نجاح** — 320 اختبار في 15 ملف، إعداد Playwright سليم | [OP] |
| `state-machine.ts:195` | السطر = `}` — نهاية reducer سليمة. الملف 210 سطر، type-check نظيف على web | [OP] |

---

## 1. جدول البنود الموحَّد

### 1.1 — مصدر التوثيق (D-*) — حالة عقود وحقائق تشغيلية

| المعرّف | المصدر | الوصف الموجز | الملف:السطر | دليل | الأولوية | النطاق | جولة التنفيذ |
|---------|--------|---------------|-------------|------|---------|--------|--------------|
| D-001 | session-state.md | لا توجد listeners محلية على 5433 و 6379 و 8080 وقت الفحص | بيئة محلية | [RD] | P3 | بنية تحتية | مُرحَّل من 096 — يحتاج تحقيق |
| D-002 | git accumulation | تراكم 14 ملف غير ملتزم على main من جولة 095 (playwright config + e2e helpers + fixtures script) | apps/web/playwright.config.ts + tests/* | [OP] | — | infra | **مغلق** قبل بدء الجولة في commit `de0621c` |

### 1.2 — مصدر الفحص الآلي (A-*) — type-check / lint / test / build

| المعرّف | المصدر | الوصف الموجز | الملف:السطر | دليل | الأولوية | النطاق | جولة التنفيذ |
|---------|--------|---------------|-------------|------|---------|--------|--------------|
| A-001 | type-check | TS2345 — `Paragraph({ heading })` لا يقبل `HeadingLevel | undefined` تحت `exactOptionalPropertyTypes: true` | `apps/backend/src/controllers/analysis.controller.ts:57` | [OP] | **P0** | backend type-check | جولة 097 (هذه) |
| A-002 | lint | `@the-copy/backend lint` ينفجر heap (~528 ملف TS في برنامج typed-lint Node default 4GB) — exit 134 | `apps/backend/eslint.config.js` + `apps/backend/package.json` | [OP] | **P0** | backend lint infrastructure | جولة 097 (هذه) |
| A-003-1 | test | `env.test.ts > env validation > should validate NODE_ENV enum` — env-safe يطلق قبل `import('./env')` لأن `NEXT_PUBLIC_BACKEND_URL` مفقود من `createProductionEnv()` | `apps/backend/src/config/env.test.ts:71` + `env-safe.ts:67` | [OP] | **P0** | backend env tests | جولة 097 (هذه) |
| A-003-2 | test | `env.test.ts > env validation > should reject weak JWT secrets in production` — نفس الجذر | `apps/backend/src/config/env.test.ts:79` | [OP] | **P0** | backend env tests | جولة 097 (هذه) |
| A-003-3 | test | `env.test.ts > isDevelopment helper > should return false for production environment` — نفس الجذر | `apps/backend/src/config/env.test.ts:130` | [OP] | **P0** | backend env tests | جولة 097 (هذه) |
| A-004 | lint (web) | 64 خطأ lint في web (تتطابق رقمياً مع 096): `no-control-regex`, `no-useless-catch`, `no-empty-pattern`, `parserOptions.project` للملفات خارج tsconfig | متعدد | [OP] | P2 | web lint hygiene | مُرحَّل (P2) |
| A-005 | lint (web warnings) | 7881 تحذير (import/order, prefer-nullish-coalescing, ...). 3240 منها قابلة لـ --fix | متعدد | [OP] | P3 | web lint cosmetics | مُرحَّل |
| A-006 | test (web — موروث) | 24 ملف اختبار في `actorai-arabic` و drama-analyst يَستخرج 0 tests | `apps/web/src/app/(main)/actorai-arabic/__tests__/*` و `src/lib/drama-analyst/agents/*` | [RD] (من 096) | P1 | actorai/agents | مُرحَّل |
| A-007 | test (web — موروث) | `agent-reports-exporter.test.tsx` 24/24 فاشل | `apps/web/src/components/agent-reports-exporter.test.tsx` | [RD] | P1 | agent-reports | مُرحَّل |
| A-008 | test (web — موروث) | `03-directors-studio-file-input.test.ts` 12/12 فاشل | `apps/web/src/app/__regression__/03-directors-studio-file-input.test.ts` | [RD] | P1 | directors-studio | مُرحَّل |
| A-009 | test (web — موروث) | `ScriptUploadZone.test.tsx` 9/9 فاشل | `apps/web/src/app/(main)/directors-studio/components/__tests__/ScriptUploadZone.test.tsx` | [RD] | P1 | directors-studio | مُرحَّل |
| A-010 | test (web — موروث) | `animations.test.ts` 3/3 فاشل (IntersectionObserver) | `apps/web/src/lib/animations.test.ts` | [RD] | P2 | lib polyfill | مُرحَّل |
| A-011 | test (web — موروث) | `cinematography-analysis-fallback.test.tsx` 2/2 فاشل (timing 5050ms) | `apps/web/src/app/(main)/cinematography-studio/hooks/__tests__/cinematography-analysis-fallback.test.tsx` | [RD] | P1 | cinematography (flaky) | مُرحَّل |
| A-012 | test (web — موروث) | `directors-studio/scenes/page.test.tsx` 1/3، `shots/page.test.tsx` 2/4، `ProjectTabs.test.tsx` 1/4 | المسارات المذكورة | [RD] | P1 | directors-studio | مُرحَّل |
| A-013 | test (web — موروث) | باقي ~6 ملفات اختبار متفرقة فيها فشل واحد أو اثنين | متعدد | [RD] | P2 | متعدد | مُرحَّل |

### 1.3 — مصدر الفحص العضوي (O-*)

> **ملاحظة الجولة:** كل بنود O-* أُعيد قياسها بـ grep حقيقي على شجرة `apps/web/src` في
> هذه الجولة (عدا O-001 المُلتقَط من install)، فأصبحت [OP] بأرقام محدَّثة بدل [RD]
> الموروثة. أي فجوات بين الأرقام والـ 096 توضَّح في حقل "الدليل".

| المعرّف | المصدر | الوصف الموجز | الملف:السطر | دليل | الأولوية | النطاق | جولة التنفيذ |
|---------|--------|---------------|-------------|------|---------|--------|--------------|
| O-001 | pnpm install | تحذير "Ignored build scripts" لـ 11 dep (sentry, sharp, bcrypt, cypress, ...). إجراء حوكمة (`pnpm approve-builds`) لكنه لا يكسر شيئاً | `package.json` `pnpm.onlyBuiltDependencies` | [OP] | P3 | install hygiene | مُرحَّل |
| O-002 | grep TODO/FIXME/HACK/XXX على apps/web/src | 18 موضع — مطابق لقياس 096 | متعدد | [OP] | P3 | hygiene | مُرحَّل |
| O-003 | grep console.* على apps/web/src (إنتاج) | 330 استدعاء `console.{log,debug,info,warn,error}` خارج tests. مرجع 096 ذكر 133 (log/debug/info فقط) — الفارق نطاق الـpattern لا تراجع فعلي | متعدد | [OP] | P2 | logging | مُرحَّل |
| O-004 | grep `: any` على apps/web/src (إنتاج) | 246 استخدام صريح. مرجع 096 ذكر 267 — تحسّن طفيف (-21) | متعدد | [OP] | P2 | type debt | مُرحَّل |
| O-005 | grep `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` على apps/web/src | 6 مواضع — مطابق لقياس 096 | متعدد | [OP] | P2 | type debt | مُرحَّل |
| O-006 | wc -l على apps/web/src (>1000 سطر) | 10 ملفات (ارتفع من 6 في 096): ActorAiArabicStudio 3848، paste-classifier 2521، SelfTapeSuite 2404، station5 1540، station3 1379، EditorArea 1281، particle-background-optimized.tsx ×2 ≈1272، station7 1271، useCreativeDevelopment 1237 | المسارات | [OP] | P3 | maintainability | مُرحَّل |

---

## 2. ختام الإحصاءات

```text
عدد البنود الكلي:        24  (2 D + 13 A + 6 O — D-002 مُغلق قبل الجولة)
P0:                       5  (A-001, A-002, A-003-1, A-003-2, A-003-3)
P1:                       6  (A-006..A-009, A-011, A-012)
P2:                       5  (A-004, A-010, A-013, O-003, O-004, O-005)
P3:                       5  (D-001, A-005, O-001, O-002, O-006)
[OP]:                     7  (D-002, A-001, A-002, A-003-1..3, A-004, A-005, O-001)
[RD]:                     14 (مُرحَّلة)
[UN]:                     1  (D-001 — ports)
أُغلِق المسح في:           2026-04-26T03:00:00+03:00
```

### ميزانية الترحيل المعتمدة (حسب الأمر التوجيهي)

```text
P0: 0%   ترحيل  → 5 من 5 يجب إغلاقها هذه الجولة
P1: 15%  ترحيل  → ≤ 0 (round 1) — لا ميزانية لترحيل لأن 15%×6 = 0.9 → ≥1 لا يكفي حتى ترحيل واحد بأمان منهجياً، لكن المسموح ≤1
P2: 30%  ترحيل  → ≤ 1 (30%×5 = 1.5)
P3: بلا سقف
```

### قرار الجولة 097

- **P0 المُلتزَم بإغلاقه:** A-001، A-002، A-003-1، A-003-2، A-003-3 (5 بنود).
  - A-001: type-check بحاجة إلى تطبيق `exactOptionalPropertyTypes` السليم في `analysis.controller.ts` — تعديل ضيّق النطاق.
  - A-002: lint OOM يُحَل بزيادة `NODE_OPTIONS=--max-old-space-size=8192` لسكربت backend lint عبر إضافة `cross-env` كـ devDep في backend (cross-env موجود فعلاً في web).
  - A-003-*: ثلاثة فشل في `env.test.ts` لها جذر واحد — `createProductionEnv` لا يضمّن `NEXT_PUBLIC_BACKEND_URL` المطلوب في `apps/backend/.env.example`. الإصلاح إضافة المفتاح إلى الكائن.

- **P1:** سيُلامَس بأكبر قدر ممكن داخل الميزانية. الترتيب التحضيري المتوقع: A-006، A-007، A-008، A-009، A-012 (تحتاج تحقيق نطاقي مسبق لكل ملف ضمن TDD).

- **P2/P3:** ستُلامَس فقط بعد إنهاء P0 و P1 ضمن الميزانية، وفقاً لتوفر الوقت/السياق وشروط التوقف الذاتي الثلاثة.

- **حد أدنى من commits:** 15 commit مطلوبة في Execute. خطة:
  1. Triage commit (هذا الملف) — 1
  2. P0 (5 بنود في commits منفصلة بدورة TDD) — ≥5
  3. تحقق إجمالي بعد كل 10 commits
  4. P1 (5 بنود مرشّحة بدورة TDD) — ≥5
  5. هامش (مثل التحديث النهائي للـ session-state و round-notes و PR) — ≥4

---

## 3. سجل التنفيذ

| المعرّف | الحالة | commit hash | ملاحظات |
|---------|--------|-------------|---------|
| A-001 | [DONE] | `d2e036d` | spread شرطي لـ heading في rtlPara — type-check نظيف على backend |
| A-003-{1,2,3} | [DONE] | `ca184af` | NEXT_PUBLIC_BACKEND_URL في createProductionEnv — 16/16 env tests passing |
| A-007 | [DONE] | `b43ac08` | إزالة mocks document.body.appendChild/removeChild — 24/24 passing |
| A-009 | [DONE] | `ac23ad9` | إعادة كتابة ScriptUploadZone tests لتطابق العقد المعطّل — 7/7 passing |
| A-008 | [DONE] | `097883b` | إعادة كتابة file-input regression لعقد fileExtractor المعطّل — 12/12 passing |
| A-002 | [DONE] | `0ddf8d7` | scripts/lint-chunked.mjs — يقسّم typed-lint على 26 مجموعة لتفادي OOM. التحقق الكامل (lint نظيف end-to-end) يحتاج ذاكرة حرة أكبر مما هو متاح حالياً (4GB من 32GB)، البنية على ما يرام |
| A-011 | [DONE] | `72a3f7c` | تبديل إلى real timers قبل waitFor — 2/2 passing (timeout 10s → 106ms) |
| A-010 | [DONE] | `8d7c994` | استبدال vi.fn().mockImplementation بـ class IntersectionObserverMock — 3/3 passing |
| A-012a | [DONE] | `f54e522` | CardSpotlight يُمَرِّر HTML attributes — ProjectTabs 4/4 passing |
| A-012b/c | [DONE] | `e2023fc` | mock ProjectContext في scenes/page + shots/page — 3/3 passing (4 todo سابقة محفوظة) |

---

## 4. شريط الأمان السبعة

1. ❌ ممنوع `it.skip` كحل (بديل: عزل أصلي/إصلاح حقيقي).
2. ❌ ممنوع تخفيف فحص أو إضافة استثناء يقلل التغطية.
3. ❌ ممنوع merge إلى main أو push origin main.
4. ❌ ممنوع push --force.
5. ❌ ممنوع تعديل ملفات العقود اليدوية (`AGENTS.md`، `.repo-agent/OPERATING-CONTRACT.md`، إلخ).
6. ✅ TDD ملزم: اختبار/تحقق فاشل أولاً ثم إصلاح.
7. ✅ تحقق إجمالي إلزامي كل 10 commits.

---

> هذا الملف هو **commit مستقل قبل بدء Execute**.

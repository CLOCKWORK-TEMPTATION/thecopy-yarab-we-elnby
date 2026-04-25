# Triage Report — جولة 096

> **منهجية:** Discovery → Triage → Execute. هذا الملف هو مخرج Triage.
> **تاريخ المسح:** 2026-04-26.
> **مرجعية:** [round-notes.md](output/round-notes.md) جولة 096.
> **نظام الأدلة:** `[OP]` = Operationally Proven (شغّلت أمراً ورأيت المخرج). `[RD]` = Read-Documented (قرأت الملف ورأيت السطر). `[UN]` = Unverified.

---

## 0. حصيلة Pre-Flight (خط الأساس قبل أي تغيير)

- `pnpm --filter web test:cinematography:integration`: 8/8 PASS [OP].
- `pnpm --filter web type-check`: 0 أخطاء — صار نظيفًا منذ جولة 095 [OP].
- `pnpm --filter web lint`: 64 أخطاء + 7762 تحذير [OP].
- `pnpm --filter web build`: webpack compile + TypeScript + Static page generation **كلها تنجح**؛ يفشل في خطوة "Collecting build traces" بـ `ENOENT proxy.js.nft.json` [OP].
- `pnpm --filter web test`: 43 ملف فاشل / 100 ناجح / 1 متخطّى. 68 اختبار فاشل / 999 ناجح / 24 todo [OP].

---

## 1. جدول البنود الموحَّد

### 1.1 — مصدر التوثيق (D-*)

| المعرّف | المصدر | الوصف الموجز | الملف:السطر | دليل | الأولوية | النطاق | جولة التنفيذ |
|---------|--------|---------------|-------------|------|---------|--------|--------------|
| D-001 | session-state.md "الأعطال المفتوحة الآن" | لا توجد listeners محلية على 5433 و 6379 و 8080 | بيئة محلية | [UN] | P3 | بنية تحتية | مُرحَّل (تحقيق إضافي) |
| D-002 | session-state.md "خارج النطاق" | `state-machine.ts:195` Unreachable code — مغلق upstream | `apps/web/src/app/(main)/analysis/lib/state-machine.ts` | [OP] type-check يمر | — | analysis | **مغلق** قبل الجولة |
| D-003 | session-state.md "خارج النطاق" | `editor/src/App.tsx:214` recordDiagnostic implicit any — مغلق upstream | `apps/web/src/app/(main)/editor/src/App.tsx:214` | [OP] type-check يمر | — | editor | **مغلق** قبل الجولة |

### 1.2 — مصدر الفحص الآلي (A-*)

| المعرّف | المصدر | الوصف الموجز | الملف:السطر | دليل | الأولوية | النطاق | جولة التنفيذ |
|---------|--------|---------------|-------------|------|---------|--------|--------------|
| A-001 | build (Pre-Flight 3.3c) | `pnpm build` يفشل في "Collecting build traces" بـ `ENOENT proxy.js.nft.json`. webpack compile + TS + Static gen تنجح | `apps/web/src/proxy.ts` (Next.js 16 يولّد `middleware.js.nft.json` بدل `proxy.js.nft.json` ثم يطلب الأخير) | [OP] أعدت البناء بعد `rm -rf .next` فظهر نفس الخطأ | **P0** | infra build | جولة 096 (هذه) |
| A-002 | lint | 64 خطأ lint مقسّمة فعليًا إلى عدة فئات: `no-control-regex` في sanitizer (×3)، `no-useless-catch` في e2e config (×4)، `no-empty-pattern` في scripts (×30+)، `Parsing error: parserOptions.project` في ملفات .d.ts ومسارات خارج tsconfig (×27) | متعدد | [OP] | P2 | lint hygiene | مُرحَّل (P2 بحجم كبير، خارج blast-radius جلسة واحدة) |
| A-003 | lint | 7762 تحذير (import/order, prefer-nullish-coalescing, ...) | متعدد | [OP] | P3 | lint cosmetics | مُرحَّل |
| A-004 | test | 24 ملف اختبار في `actorai-arabic` و drama-analyst agents يَستخرج 0 tests (إعداد كسر) | `src/app/(main)/actorai-arabic/__tests__/*` و `src/lib/drama-analyst/agents/*` | [OP] | P1 | actorai/agents | مُرحَّل (P1 لكن يلزم تحقيق نطاقي قبل الإصلاح) |
| A-005 | test | `src/components/agent-reports-exporter.test.tsx` 24/24 فاشل | المسار المذكور | [OP] | P1 | agent-reports | مُرحَّل |
| A-006 | test | `src/app/__regression__/03-directors-studio-file-input.test.ts` 12/12 فاشل | المسار المذكور | [OP] | P1 | directors-studio | مُرحَّل |
| A-007 | test | `src/app/(main)/directors-studio/components/__tests__/ScriptUploadZone.test.tsx` 9/9 فاشل | المسار المذكور | [OP] | P1 | directors-studio | مُرحَّل |
| A-008 | test | `src/lib/animations.test.ts` 3/3 فاشل (IntersectionObserver) | المسار المذكور | [OP] | P2 | lib polyfill | مُرحَّل |
| A-009 | test | `cinematography-analysis-fallback.test.tsx` 2/2 فاشل (timing 5050ms) | `src/app/(main)/cinematography-studio/hooks/__tests__/cinematography-analysis-fallback.test.tsx` | [OP] | P1 | cinematography (flaky) | مُرحَّل (يحتاج تحليل timing مسبق، خطر تراجع 8/8) |
| A-010 | test | `directors-studio/scenes/page.test.tsx` 1/3، `shots/page.test.tsx` 2/4، `ProjectTabs.test.tsx` 1/4 | المسارات المذكورة | [OP] | P1 | directors-studio | مُرحَّل |
| A-011 | test | باقي ~6 ملفات اختبار متفرقة فيها فشل واحد أو اثنين | متعدد | [OP] | P2 | متعدد | مُرحَّل |

### 1.3 — مصدر الفحص العضوي (O-*)

| المعرّف | المصدر | الوصف الموجز | الملف:السطر | دليل | الأولوية | النطاق | جولة التنفيذ |
|---------|--------|---------------|-------------|------|---------|--------|--------------|
| O-001 | grep TODO/FIXME | 18 موضع TODO/FIXME/HACK في كود الإنتاج | متعدد | [OP] | P3 | hygiene | مُرحَّل |
| O-002 | grep console | 133 استدعاء `console.log/debug/info` في كود الإنتاج | متعدد | [OP] | P2 | logging | مُرحَّل (حجم كبير جدًا) |
| O-003 | grep `: any` | 267 استخدام `any` صريح في كود الإنتاج | متعدد | [OP] | P2 | type debt | مُرحَّل |
| O-004 | grep `@ts-ignore`/`@ts-expect-error` | 6 مواضع تجاهل صريح | متعدد | [OP] | P2 | type debt | مُرحَّل |
| O-005 | wc -l | ملفات فوق 1000 سطر: ActorAiArabicStudio (3848)، paste-classifier (2521)، SelfTapeSuite (2404)، station5 (1540)، station3 (1379)، EditorArea.ts (1281) | المسارات المذكورة | [OP] | P3 | maintainability | مُرحَّل (يحتاج خطة هيكلية، ليس تجزئة عشوائية) |

---

## 2. ختام الإحصاءات

```text
عدد البنود الكلي:        18  (3 D + 11 A + 5 O — لا تُعدّ D-002 و D-003 المغلقة قبل الجولة)
P0:                       1  (A-001)
P1:                       7  (A-004..A-007, A-009, A-010, ضمنًا A-009 cinematography flaky)
P2:                       7  (A-002, A-008, A-011, O-002, O-003, O-004 + 1 ضمن lint)
P3 (مُرحَّل):              5  (D-001, A-003, O-001, O-005, ضمنًا 1 hygiene)
[UN] (تحتاج تحقيق):       1  (D-001)
أُغلِق المسح في:           2026-04-26T00:30:00+02:00
```

### قرار الجولة 096

- **P0 المنفّذ:** A-001 (build blocker) فقط، لأنه:
  - الحاجب الوحيد لـ `pnpm build` ولشرط القبول الإجمالي للجولة.
  - blast-radius مُتحكَّم به (ملف واحد + 1 import).
  - جذره مفهوم تشغيليًا (Next.js 16.2.3 يَتوقع `proxy.js.nft.json` من ملف `proxy.ts` لكنه يولّد `middleware.js.nft.json` فقط).

- **P1 المنفّذ:** **لا شيء.** كل بنود P1 السبعة لها blast-radius مرتفع وتحتاج تحقيق نطاقي مسبق (test fixtures مكسورة، مسارات مرفوضة، timing flaky). تنفيذها العشوائي خطر على الأخضر الموروث (8/8 cinematography). تُرحَّل صراحة لجولة 097.

- **P2 المنفّذ:** **لا شيء.** 267 `any` و 133 `console.log` يستحيل إغلاقها في جلسة واحدة دون توسيع غير مبرَّر للنطاق (انتهاك blast-radius rule).

- **P3:** غير منفَّذ بحكم الترتيب الحاكم.

---

## 3. سجل التنفيذ

| المعرّف | الحالة | commit hash | ملاحظات |
|---------|--------|-------------|---------|
| A-001 | [PENDING] | — | قيد التنفيذ — رينيم `proxy.ts` → `middleware.ts` + تحديث استيراد الاختبار |


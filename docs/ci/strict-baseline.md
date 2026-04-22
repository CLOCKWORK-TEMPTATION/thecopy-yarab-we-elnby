# Strict Baseline — TypeScript + ESLint Debt Budget

## Metadata

| البند | القيمة |
|---|---|
| الفرع | `chore/strict-baseline` |
| تاريخ القياس | 2026-04-22 |
| Node heap | `--max-old-space-size=12288` (backend), `--max-old-space-size=14336` (backend tests) |
| TypeScript | 5.9.3 |
| ESLint | 9.39.x |
| حالة القياس | Phase 0 — additive only (no gate changes) |

## الأوامر المستخدمة

```bash
# Backend — split في مجموعتين لتجنّب OOM (520 ملف TS + dependencies ثقيلة)
NODE_OPTIONS="--max-old-space-size=12288" \
  pnpm -C apps/backend exec tsc -p tsconfig.check.json --noEmit --pretty false \
  > docs/ci/baseline-backend-excluded-ts.log 2>&1

NODE_OPTIONS="--max-old-space-size=14336" \
  pnpm -C apps/backend exec tsc -p tsconfig.check-tests.json --noEmit --pretty false \
  > docs/ci/baseline-backend-tests-ts.log 2>&1

# Web — شامل src + tests + noPropertyAccessFromIndexSignature:true
NODE_OPTIONS="--max-old-space-size=12288" \
  pnpm -C apps/web exec tsc -p tsconfig.check.json --noEmit --pretty false \
  > docs/ci/baseline-web-ts.log 2>&1
```

## ملاحظة حاسمة على المنهجية

- **الباكند**: tsc مُقسَّم لمجموعتين لأن `src/**` بـ 520 ملف TS مع تبعيات ثقيلة (puppeteer, @opentelemetry, mongodb, pg) يتجاوز heap 12 GB في تشغيل واحد. نفس السبب وراء وجود [`typecheck-runtime.mjs`](../../apps/backend/scripts/typecheck-runtime.mjs) و`--max-old-space-size=12288` فيه. **معنى هذا**: خطة Phase 4 (استبدال `type-check` بـ `tsc -b tsconfig.check.json`) **لن تعمل** بدون إبقاء التقسيم بشكل ما — إما عبر `tsc -b` مع `references` حقيقية، أو إبقاء المُشغِّل المخصص في شكل مُرقَّى.
- **الباكند src/**: الـ gate الحالي (`typecheck-runtime.mjs`) يمر (قائمة الـ 12 مجموعة). الفجوة الوحيدة في src هي الاستثناءات، والتي قِيست منفصلة.
- **الويب**: tsc واحد على whole src+tests يمر دون OOM (exit 0 بمعنى خروج shell، ليس exit tsc — كل الأخطاء في الـ log).

## نتائج القياس

### Backend — 409 خطأ TS

#### المناطق المُستَثناة حاليًا من الـ gate (non-test)

include = `src/agents/** + src/examples/** + src/mcp-server.ts + src/scripts/** + src/test/** + scripts/**`

**67 خطأ**:

| TS code | العدد | المعنى |
|---|---|---|
| TS6133 | 27 | declared but never used |
| TS7015 | 8 | element implicit any (index signature) |
| TS6192 | 8 | all imports in module are unused |
| TS7030 | 5 | not all code paths return a value |
| TS2339 | 5 | property does not exist |
| TS2532 | 4 | object possibly undefined |
| TS4114 | 2 | override modifier |
| TS2379 | 2 | exactOptionalPropertyTypes |
| TS2322 | 2 | type not assignable |
| آخرى | 4 | TS4111, TS2769, TS2353, TS18048 |

أعلى الملفات مساهمة:
- `src/examples/tracing-examples.ts` — 8
- `src/mcp-server.ts` — 6
- `src/types/ai/geminiTypes.ts` — 4
- `src/agents/instructions/*.ts` — 2×7 = 14 (نمط مشترك)

#### الاختبارات المُستَثناة

include = `src/__tests__/** + src/**/*.test.ts + src/**/*.spec.ts`

**342 خطأ**:

| TS code | العدد | المعنى |
|---|---|---|
| TS2339 | 86 | property does not exist |
| TS4111 | 60 | bracket notation (index signature) |
| TS6133 | 48 | declared but never used |
| TS18046 | 33 | value is of type unknown |
| TS2532 | 29 | object possibly undefined |
| TS2322 | 16 | type not assignable |
| TS2345 | 15 | argument not assignable |
| TS2694 | 11 | namespace has no exported member |
| TS18048 | 10 | possibly undefined |
| TS2741 | 6 | missing property |

### Web — 567 خطأ TS

include = `src/**/*.{ts,tsx} + __tests__/** + tests/**` + `noPropertyAccessFromIndexSignature: true`

| TS code | العدد | النسبة | المعنى |
|---|---|---|---|
| TS4111 | 338 | **60%** | bracket notation — من `noPropertyAccessFromIndexSignature` flip |
| TS2353 | 57 | 10% | excess property in object literal |
| TS2532 | 43 | 8% | object possibly undefined |
| TS2345 | 20 | 4% | argument not assignable |
| TS2451 | 14 | 2% | redeclaration |
| TS2307 | 12 | 2% | cannot find module (test-utils مفقود) |
| TS2322 | 11 | 2% | type not assignable |
| TS6133 | 9 | 2% | unused |
| TS18048 | 8 | 1% | possibly undefined |
| TS2708 | 6 | 1% | cannot be used as namespace |
| TS2339 | 6 | 1% | property doesn't exist |
| آخرى | 43 | 7% | |

**توزيع TS4111 (338 خطأ) بين المصادر**:
- إنتاج (`src/` بدون tests): **181** (54%)
- اختبارات: **157** (46%)

أعلى الملفات مساهمة:
- `src/env.test.ts` — 70
- `src/lib/drama-analyst/services/apiService.test.ts` — 42
- `src/app/(main)/styleIST/services/geminiService.ts` — 34
- `src/app/(main)/cinematography-studio/lib/__tests__/cinematography-config.integration.test.ts` — 25
- `src/lib/drama-analyst/orchestration/executor.test.ts` — 23
- `src/app/api/cineai/validate-shot/__tests__/route.integration.test.ts` — 18
- `src/lib/actions/analysis.ts` — 17
- `src/app/(main)/editor/src/rag/query.ts` — 17

## المجموع

**~976 خطأ TS تحت الـ gate الصارم** (409 backend + 567 web).

## رافع الخطر الأبرز

### Risk 1 — `noPropertyAccessFromIndexSignature: true` في الويب

- **الكلفة**: 338 خطأ TS4111 (60% من دَين الويب، 35% من الدَّين الكلي).
- **السبب**: ويب اليوم يستخدم `process.env["X"]` صريحاً في أماكن، لكن أيضاً `someObj.prop` على كائنات ذات index signature — 181 خطأ إنتاج + 157 اختبار.
- **التوصية**: **لا تُرَقَّ هذه القاعدة إلى `packages/tsconfig/base.json` في Phase 1**. أبقها:
  - `true` في `apps/backend/tsconfig.json` (قائمة).
  - `false` في `apps/web/tsconfig.json` (قائمة).
  - `true` في `apps/web/tsconfig.check.json` فقط (gate قادم).
  - اقلبها في `tsconfig.json` بعد burn-down زيرو.

### Risk 2 — Backend tsc OOM على مستودع واحد

- **السبب**: 520 ملف TS + تبعيات ثقيلة → heap 12 GB غير كافٍ لتشغيل واحد.
- **الأثر على Phase 4**: `tsc -b tsconfig.check.json tsconfig.build.json` **لن يمر** دون إما:
  - `references` حقيقية داخل tsconfig.check.json تشير إلى sub-projects، أو
  - إبقاء `typecheck-runtime.mjs` كـ orchestrator يتوسط `-b`، أو
  - رفع heap لـ 16+ GB على CI runners (غير عملي).
- **التوصية**: تعديل Phase 4 ليستخدم `pnpm -C apps/backend run type-check` (المُشغِّل القائم) مع توسيع قوائمه لتشمل المناطق المُستَثناة.

### Risk 3 — `eslint-plugin-jsx-a11y` غير مقيس

- **السبب**: الخطة Phase 0 تطلب قياسه، لكن الإضافة غير مثبتة. تثبيتها يلمس lockfile قبل نقطة rollback آمنة.
- **التوصية**: قياسه في Phase 3 فقط عند تثبيت السلسلة الكاملة.

## Burn-down plan

ترتيب معالجة الأخطاء (يبدأ من أعلى-قيمة، أقل-ريبل):

| # | المجموعة | الأخطاء | استراتيجية |
|---|---|---|---|
| 1 | Web TS4111 في إنتاج | 181 | `process.env["X"]` + كائنات index-signature → bracket notation (أوتوماتيكي codemod) |
| 2 | Backend tests TS2339 | 86 | إضافة `declare module "vitest"` + types لمكتبات tests |
| 3 | Web TS4111 في tests | 157 | نفس codemod |
| 4 | Backend tests TS4111 | 60 | نفس codemod |
| 5 | Backend tests TS6133 | 48 | `--fix` على autofix-able + مراجعة يدوية |
| 6 | Web TS2353 + TS2532 | 100 | يدوي |
| 7 | Backend tests TS18046 (unknown) | 33 | type-narrowing + asserts |
| 8 | Web + backend آخر | 311 | يدوي حسب الأولوية |

### عتبة strict-check Required

- **ابتدائي**: `continue-on-error: true`، `--max-warnings=976` (= العدد الحالي).
- **كل PR**: خفض العتبة بمقدار الأخطاء المُصلَحة في PR (ratchet).
- **تحويل لـ Required**: عندما `--max-warnings=0` لأسبوع متتالي على CI.

## ESLint Baseline

> ملاحظة: التشغيل بالسلسلة القائمة فقط (لا type-aware، لا jsx-a11y، لا exhaustive-deps). سلسلة Phase 3 (recommendedTypeChecked + jsx-a11y + exhaustive-deps + import + unused-imports) ستُقاس بعد تثبيت `eslint-plugin-jsx-a11y`.

### Backend — 616 خطأ (eslint src، config حالي)

| قاعدة | العدد | ملاحظة |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 217 | في الـ excluded dirs (runtime runner يتجاهلها) |
| `max-lines-per-function` | 170 | الحد = 50 سطر |
| `no-console` | 84 | |
| `@typescript-eslint/no-unused-vars` | 75 | |
| `max-lines` | 31 | الحد = 300 سطر |
| `complexity` | 29 | الحد = 10 |
| `no-restricted-syntax` | 10 | default exports |
| parse errors | 2 | |

**لماذا 616 رغم أن `pnpm lint` يمر؟** المُشغِّل [`lint-runtime.mjs`](../../apps/backend/scripts/lint-runtime.mjs) يستخدم `--quiet` (أخطاء فقط) و`--ignore-pattern` لـ tests/examples/mcp-server/scripts، ويحصر الأهداف في قائمة dirs. الـ 616 موجودون في المناطق المُستَثناة — نفس منطقة الـ 409 أخطاء TS.

### Web — 0 أخطاء / 0 تحذيرات (eslint src، config حالي)

- 1365 ملف مفحوص. القواعد المُفعَّلة قليلة جداً وسماحية (4 قواعد React + no-unused-vars). **هذا لا يعني أن الويب نظيف**: قواعد Phase 3 الحقيقية (`recommendedTypeChecked`, `react-hooks/exhaustive-deps`, `jsx-a11y`, `import/order`, `no-floating-promises`) غير مُفعَّلة.

### الفجوة الحقيقية (تقدير)

- **Backend**: 616 خطأ ESLint موثَّق + ? (Phase 3 سلسلة كاملة) — تقدير إضافي >500 خطأ عند تفعيل `recommendedTypeChecked` على الأكواد الموجودة.
- **Web**: ~1000-2000 خطأ متوقع عند تفعيل السلسلة الكاملة (`exhaustive-deps` + `jsx-a11y` + `no-floating-promises`). يحتاج قياس بعد Phase 3.

## الخطوات المقترحة بعد Phase 0

1. **قرار بشري على Risk 1**: هل نُرقِّي `noPropertyAccessFromIndexSignature` إلى base.json أم نبقيه app-local؟
2. **قرار بشري على Risk 2**: هل نحتفظ بالمُشغِّل المخصص في Phase 4 أم نُعيد هيكلة لـ project references؟
3. بعد القرارين: ابدأ Phase 1 (base.json consolidation — آمن، additive).
4. Phase 2 (tsconfig.check.json additive — آمن، حقَّقناه بالفعل هنا).
5. Phase 3 (ESLint flat config ترقية) — مع قياس ثانٍ بعد تثبيت jsx-a11y.
6. Phase 5 ratchet rollout — بعد burn-down 50% على الأقل.

## ملفات الـ Artifact

- [`baseline-backend-excluded-ts.log`](./baseline-backend-excluded-ts.log) — non-test excluded areas
- [`baseline-backend-tests-ts.log`](./baseline-backend-tests-ts.log) — tests
- [`baseline-web-ts.log`](./baseline-web-ts.log) — whole web with strict check config
- [`baseline-backend-eslint.log`](./baseline-backend-eslint.log) — قيد التوليد
- [`baseline-web-eslint.log`](./baseline-web-eslint.log) — قيد التوليد

## إعدادات القياس المضافة

- [`apps/backend/tsconfig.check.json`](../../apps/backend/tsconfig.check.json)
- [`apps/backend/tsconfig.check-tests.json`](../../apps/backend/tsconfig.check-tests.json)
- [`apps/web/tsconfig.check.json`](../../apps/web/tsconfig.check.json)

هذه الثلاثة **additive**؛ لا تُغيّر السلوك الحالي لـ CI أو pre-commit أو pre-push.

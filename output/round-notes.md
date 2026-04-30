# سجل الحالة التنفيذية الحالية

> هذا الملف يرصد الوضع الحالي فقط، ولا يحتفظ بتاريخ الجولات السابقة.

## لقطة الحالة الحالية

### وقت الرصد الحالي

2026-04-30T08:50:00Z

### آخر مزامنة مرجعية

2026-04-30T08:50:00Z

### نوع الرصد

جولة إصلاح حوكمة gitignore — كشف helpers مدفونة في فحوصات CI

## ملخص الجولة

### المشكلة المرصودة على PR #30 / commit `bd49096`

ثلاثة فحوصات CI فاشلة + ستة فحوصات يتم تخطيها:

| فحص | حالة CI |
|---|---|
| Verify Frontend | FAIL |
| Strict TypeScript and ESLint | FAIL |
| Hybrid Production Audit | FAIL |
| Build Frontend / Docker Build Frontend / E2E Tests | skipped (cascading من Verify Frontend) |
| Blue-Green Deploy/Rollback/Cleanup | skipped (مقصود — لا يعمل على PR) |

### السبب الجذري

قاعدة `test-*.*` العامة في `.gitignore:673` كانت تبتلع ملفات infrastructure حقيقية في `apps/**/src/**` (helpers تستوردها ملفات اختبار). الملفات بقت موجودة محليًا فقط، فالـ tests تعدي لوكال وتفشل في CI.

### ما تم تنفيذه

- إعادة هيكلة `.gitignore:669-678` — تحويل أنماط الملفات المؤقتة من recursive لـ root-anchored بإضافة `/`، وحذف الاستثناء الخاص بـ `actorai-arabic/test-utils.tsx` (لم يعد ضروريًا).
- إضافة 7 ملفات helper إلى git (كانت `!!` ignored):
  - `apps/web/src/app/(main)/development/__tests__/test-fixtures.ts`
  - `apps/web/src/app/(main)/development/__tests__/test-helpers.ts`
  - `apps/web/src/app/(main)/development/hooks/test-constants.ts`
  - `apps/web/src/app/(main)/development/hooks/test-fixtures.ts`
  - `apps/web/src/app/(main)/development/hooks/test-helpers.ts`
  - `apps/web/src/app/(main)/development/hooks/test-routing.ts`
  - `apps/web/scripts/cinematography/test-suites.ts`

### التحقق الفعلي بعد التعديل (تنفيذ pnpm، ليس قراءة)

| فحص | الأمر المُشغّل | النتيجة |
|---|---|---|
| vitest على ملفي failing | `pnpm exec vitest run integration.test.ts t020-task-catalog.test.ts test-routing.ts` | ✅ Test Files 2 passed, Tests 25 passed |
| Strict TypeScript | `pnpm --filter @the-copy/web run type-check` | ✅ 0 TypeScript error(s) (كان 15 على CI) |
| Strict ESLint | `pnpm --filter @the-copy/web run lint` | ✅ 0 error(s), 0 warning(s) (كان 159 على CI) |

التحقق ضمن قاعدة AGENTS.md "أي تعديل يمس ملفات الفحص والتحقق يجب أن يخضع بعده لتشغيل فعلي مباشر للفحص المتأثر".

### قاعدة الفحوصات الحاكمة

تم احترامها. التعديل **يُقوّي** الفحص (يكشف helpers كانت مخفية ويجبر CI يراها) ولا يُضعفه. لا قاعدة فحص تم حذفها أو تخفيفها أو تحويل فشلها إلى تحذير.

### إصلاح Hybrid Production Audit (تكملة في نفس الجولة)

**السبب الجذري المُثبَت:** `resolveAiConfig()` في [scripts/hybrid-audit.js](../scripts/hybrid-audit.js) كانت تفضّل `process.env.AI_API_KEY` على المفتاح الخاص بالـ provider:

```javascript
// قبل
apiKey: (process.env.AI_API_KEY || providerKeyFallback || "").trim()
```

في CI، الـ secrets الأربعة (`AI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_GENAI_API_KEY`) كلهم مُمرَّرين كـ env. لما `provider=gemini` لكن `AI_API_KEY` يحمل مفتاحًا غير-Gemini (Anthropic أو generic)، الـ script يبعث المفتاح الخطأ لـ Google → **400 Bad Request**.

**الإصلاح المنفّذ:** عكس الأولوية — تفضيل المفتاح الخاص بالـ provider أولاً، و `AI_API_KEY` كـ fallback فقط:

```javascript
// بعد
apiKey: (providerSpecificKey || process.env.AI_API_KEY || "").trim()
```

**تحسينات تشخيصية مرافقة:** `callGemini` الآن تستخرج `response.text()` عند الفشل وتُسجّل `finishReason` و `promptFeedback` لتيسير التشخيص المستقبلي.

**التحقق الفعلي محليًا** (محاكاة لسيناريو CI):
- `AI_API_KEY=sk-this-is-a-wrong-anthropic-style-key-not-for-gemini` + `GEMINI_API_KEY=<صحيح>` + `AI_PROVIDER=gemini` + `AI_MODEL=gemini-2.5-flash`
- النتيجة: ✅ verdict كامل من Gemini (5 issues مفصّلة، provider=gemini، model=gemini-2.5-flash) — الـ script استخدم `GEMINI_API_KEY` الصحيح وتجاهل المفتاح الخاطئ.

قبل الإصلاح كانت نفس البيئة تنتج `Gemini review request failed with 400 Bad Request`.

### الملفات التي تم تعديلها / تتبعها في هذه الجولة

```
M  .gitignore
M  scripts/hybrid-audit.js
A  apps/web/scripts/cinematography/test-suites.ts
A  apps/web/src/app/(main)/development/__tests__/test-fixtures.ts
A  apps/web/src/app/(main)/development/__tests__/test-helpers.ts
A  apps/web/src/app/(main)/development/hooks/test-constants.ts
A  apps/web/src/app/(main)/development/hooks/test-fixtures.ts
A  apps/web/src/app/(main)/development/hooks/test-helpers.ts
A  apps/web/src/app/(main)/development/hooks/test-routing.ts
M  output/round-notes.md
M  output/session-state.md
```

### مستوى drift

`hard-drift` — تعديل بنيوي على .gitignore + tracking لـ 7 ملفات infrastructure.

### ما بقي مفتوحًا

- مشكلة `apps/web/src/app/(main)/cinematography-studio/components/scene/SceneStudioPanel.tsx` المعدّل (غير مرتبط بأي من الإصلاحين) — لم يُمس في هذه الجولة.
- ملفات untracked: `docker-compose.hub.yml`, `scripts/docker/` — لم تُمس.
- AI verdict من Hybrid Audit بعد الإصلاح أنتج 5 issues حقيقية (mock-data، fake-binding، unresolved-route، missing-endpoint) — هذه نتائج فحص حقيقي، لا تعطل البنية، لكن قد يجعل الـ audit يفشل على PR لأسباب موضوعية. هذه ليست regression من إصلاحنا، بل سلوك الفحص المتوقع.

### هل استلزم الأمر تحديث session-state

نعم.

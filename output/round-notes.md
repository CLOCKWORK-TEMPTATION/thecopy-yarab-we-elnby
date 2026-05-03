# سجل الحالة التنفيذية الحالية

> هذا الملف يرصد الوضع الحالي فقط، ولا يحتفظ بتاريخ الجولات السابقة.

## لقطة الحالة الحالية

### وقت الرصد الحالي

2026-05-03T05:30:00Z

### آخر مزامنة مرجعية

2026-05-03T05:26:42.128Z

### نوع الرصد

جولة جاهزية الإنتاج P0 — مرحلة 0 + سبعة بنود P0

### ما الذي تغيّر في هذه الجولة

#### المرحلة 0 — حزم الأساس المشترك (مُضافة جديدة)

- `packages/api-client/` — عميل HTTP موحّد + `ApiResponse` + `ApiError` مصنّف.
- `packages/security-middleware/` — فحص التوكنات + rate limiting + actor scoping.
- `packages/error-boundary/` — `useAsyncOperation` + `normalizeError`.
- `packages/persistence/` — autosave + snapshot بـ namespacing موحّد.
- `packages/validation/` — Zod schemas + sanitizers لـ Excel/HTML.
- `packages/export/` — `prepareExportDom` + color converter يحلّ مشكلة `oklch`.
- `packages/ai-orchestration/` — `assertModelTextNotEmpty` + `assertToolResultNotEmpty`.

كل الحزم مسجَّلة في `apps/web/tsconfig.json` paths و`apps/web/package.json` dependencies.
كل حزمة تحتوي على الأقل اختبار صرامة واحد لا يُسمح بتخفيفه.

#### P0-1 — editor (مكتمل)

- `apps/web/src/app/(main)/editor/src/utils/exporters/export-pdf.ts`
  استدعاء `applyExportSafeColors` على كل عنصر داخل iframe قبل `pdf.html`.
  هذا يحلّ فشل التصدير الموثَّق:
  `Attempting to parse an unsupported color function 'oklch'`.
- `apps/web/src/app/(main)/editor/src/controllers/editor-actions/export-actions.ts`
  استبدال رسالة الخطأ التقنية الخام برسالة عربية مفهومة. السبب يُسجَّل في logs فقط.
- `apps/web/src/app/(main)/editor/src/hooks/use-local-storage.ts`
  منع كتابة أي مفتاح يطابق نمط JWT/access/refresh/bearer/secret في localStorage.
- `apps/web/src/app/(main)/editor/src/App.tsx`
  استدعاء `bootstrapClientStorageGuard` عند أول mount لمسح أي بقايا توكنات.
- `apps/web/src/app/(main)/editor/src/components/editor/editor-area-format-utils.ts`
  استبدال عدّاد الكلمات بـ `countArabicWords` يدعم RLM/LRM وأنواع المسافات.
- `apps/web/src/app/(main)/editor/src/components/app-shell/AppSidebar.tsx`
  إضافة زر مسح صريح + Escape + استماع `onInput`. يحل مشكلة عدم رجوع الأقسام بعد مسح البحث.
- `apps/web/src/app/(main)/editor/src/controllers/editor-actions/menu-actions.ts`
  ConfirmDialog قبل "مستند جديد" + snapshot احتياطي قبل المسح.
- `apps/web/src/app/(main)/editor/src/components/editor/__tests__/editor-area-format-utils.test.ts`
  اختبار صرامة لعدّاد الكلمات العربي ضد محارف الاتجاه والمسافات.

#### P0-2 — analysis (مكتمل)

- `apps/web/src/app/api/public/analysis/seven-stations/[...path]/route.ts`
  إضافة pre-check و rate limit على start. منع التحليل المكلف عند تجاوز الحد.
  rate limit: 30/ساعة للمستخدم، 5/ساعة للمجهول.

#### P0-3 — breakdown (مكتمل)

- `apps/web/src/app/api/breakdown/projects/[projectId]/analyze/route.ts`
  منع 500 الخام. تصنيف أخطاء التحليل إلى codes واضحة:
  504 timeout، 503 ai_unavailable، 429 quota، 422 validation، 502 model_empty.
  منع empty response من المرور كنجاح.

#### P0-4 — actorai-arabic (مكتمل)

- `apps/web/src/app/api/actorai-arabic/analyze-script/route.ts` (جديد)
  endpoint حقيقي مع Zod validation + rate limit + `assertActorAnalysisNotEmpty`.
- `apps/web/src/app/(main)/actorai-arabic/components/studio/useScriptAnalysis.ts`
  استبدال `setTimeout` بـ `api.post` الحقيقي + autosave عبر `createAppStorage`
  + restore بعد reload + منع double-submit + رسائل خطأ مصنّفة.

#### P0-5 — development (مكتمل)

- `apps/web/src/app/api/development/execute/route.ts`
  استدعاء `assertModelTextNotEmpty` لمنع empty response من النجاح.
  استبدال شكل الاستجابة بـ `ApiResponse` الموحَّد.
  تصنيف الأخطاء عبر `ApiError` بدل 500 خام.

#### P0-6 — art-director (مكتمل)

- `apps/web/src/app/api/art-director/[...path]/route.ts`
  حقن `x-actor-kind` و`x-anonymous-session-id` headers قبل proxy.
  rate limit للكتابات: 60/ساعة للمستخدم، 10/ساعة للمجهول.
  cookie `tc_anon_sid` تُولَّد تلقائياً للمجهول الجديد.

#### P0-7 — directors-studio (مكتمل)

- `apps/web/src/lib/directors-editor/config-manager.ts`
  إضافة `buildLoginRedirectUrl` و sceneId/shotId إلى `buildEditorUrl`.
- `apps/web/src/app/(main)/directors-studio/components/NoProjectSection.tsx`
  pre-flight check إلى `/api/auth/me` قبل التحويل. عند 401 يُعرض toast
  واضح + redirect إلى `/login` مع redirect target يعود للمحرر بنفس projectId.

### ما الذي تم تحديثه

- إضافة سبع حزم جديدة في `packages/`.
- تحديث `apps/web/tsconfig.json` paths.
- تحديث `apps/web/package.json` dependencies.
- تعديل ثمانية ملفات في `editor`.
- إضافة endpoint جديد لـ `actorai-arabic`.
- تعديل أربع نقاط API (analysis، breakdown، development، art-director).
- تعديل ملفي directors-studio.
- إضافة ملحق إلى `packages/PACKAGES-INDEX.md` يصف الحزم الجديدة.
- تحديث هذا الملف.

### مستوى drift

`hard-drift`

السبب: إضافة سبع حزم workspace جديدة وعدّة API endpoints جديدة،
مما يستوجب إعادة توليد code-map و mind-map.

### حالة طبقة المعرفة والاسترجاع

- governance status: `governed`
- total systems: `6` (لم يتغيّر)

### ما الذي بقي مفتوحًا

#### يلزم بعد هذه الجولة (قبل قبول إغلاق P0 نهائياً)

1. `pnpm install` لتسجيل الحزم الجديدة في `pnpm-lock.yaml`.
2. تشغيل اختبارات الصرامة:

```text
pnpm -r --filter "@the-copy/api-client" --filter "@the-copy/security-middleware" --filter "@the-copy/ai-orchestration" --filter "@the-copy/export" test
```

3. `pnpm agent:refresh-maps` لإعادة توليد code-map و mind-map بعد إضافة الحزم.
4. `pnpm agent:verify` للتحقق النهائي من اتساق الحقيقة التشغيلية.
5. اختبار E2E لكل بند P0 يثبت شرط القبول قبل اعتباره مغلقاً نهائياً.
   هذه الاختبارات لم تُكتب بعد في هذه الجولة — مطلوبة في جولة لاحقة قصيرة قبل القبول.

#### بنود لم تُلمس في هذه الجولة (P1 وما بعد)

- إصلاح FCP < 2500ms في كل التطبيقات.
- `BUDGET` export الفعلي وإخفاء API paths من UI.
- `brain-storm-ai` loading/rate limit/export.
- `BREAKAPP` redirect وQR errors.
- `cinematography-studio` export/share.
- `styleIST` Tech Pack و Import Ref و Canvas.
- اختبارات وصولية axe محلية لكل تطبيق.
- اختبار 20 reload للذاكرة في editor.
- اختبارات RTL وعربية شاملة.
- اختبارات أمنية (XSS في export، Excel formula injection).

### هل استلزم الأمر تحديث session-state

نعم — الحقيقة البنيوية تغيّرت بإضافة سبع حزم workspace جديدة وأربعة endpoints
معدّلة وendpoint واحد جديد.

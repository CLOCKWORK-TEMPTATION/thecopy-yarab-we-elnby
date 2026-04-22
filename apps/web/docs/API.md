# مرجع API — الفرونت اند (Next.js)

> **آخر تحديث:** 2026-04-07
> **إطار العمل:** Next.js (App Router) · TypeScript
> **بورت الفرونت اند:** `5000`
> **بورت الباك اند:** `3001`

---

## نظرة عامة

| الخاصية                     | القيمة                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- |
| الإطار                      | Next.js مع App Router                                                              |
| اللغة                       | TypeScript                                                                         |
| بورت التشغيل                | 5000                                                                               |
| عنوان الباك اند             | `BACKEND_URL` أو `NEXT_PUBLIC_BACKEND_URL`                                         |
| نمط API                     | Route Handlers داخل `src/app/api/`                                                 |
| تخزين البيانات المحلية      | ليس هو المسار الرسمي للتطبيقات المستهدفة                                           |
| تخزين الحالة المؤقتة        | `app-state` رسمي عبر Proxy في الويب وباك إند موحّد                                 |
| الذكاء الاصطناعي المستخدم   | يخرج تشغيليًا من `apps/backend`، والويب يعمل كطبقة Route Handlers/Proxy عند الحاجة |
| الاعتمادات البيئية الرئيسية | `GEMINI_API_KEY`، `GROQ_API_KEY`، `NEXT_PUBLIC_API_URL`، `NEXT_PUBLIC_BACKEND_URL` |

---

> **تنبيه تشغيلي:** بعض المقاطع في هذا الملف وُلدت قبل توحيد الربط على `apps/backend`. المسارات الرسمية الحالية التي تم التحقق منها حيًا هي:
>
> - `/api/app-state/[app]` كـ Proxy إلى الباك إند
> - `/api/brainstorm` كـ Proxy إلى الباك إند
> - `/api/styleist/execute` كـ المسار الرسمي لـ `styleIST`
> - `/api/editor` لم يعد مسارًا حيًا
> - `/api/projects*` و`/api/ai/*` ضمن الربط الرسمي الحالي

## جدول المحتويات

1. [Next.js API Routes](#1-nextjs-api-routes)
   - [الحالة والاختبار](#11-الحالة-والاختبار)
   - [الذكاء الاصطناعي — دردشة ونماذج لغوية](#12-الذكاء-الاصطناعي--دردشة-ونماذج-لغوية)
   - [تحليل السيناريو](#13-تحليل-السيناريو)
   - [CineAI — تصوير سينمائي](#14-cineai--تصوير-سينمائي)
   - [النقد الفني (Critique)](#15-النقد-الفني-critique)
   - [البريك داون (Breakdown)](#16-البريك-داون-breakdown)
   - [Art Director](#17-art-director)
   - [الميزانية (Budget)](#18-الميزانية-budget)
   - [المشاريع (Projects)](#19-المشاريع-projects)
   - [المشاهد (Scenes)](#110-المشاهد-scenes)
   - [اللقطات (Shots)](#111-اللقطات-shots)
   - [الشخصيات (Characters)](#112-الشخصيات-characters)
   - [حالة التطبيق (App State)](#113-حالة-التطبيق-app-state)
2. [Server Actions](#2-server-actions)
3. [Middleware](#3-middleware)

---

## 1. Next.js API Routes

جميع المسارات تقع تحت `apps/web/src/app/api/`.

---

### 1.1 الحالة والاختبار

#### `GET /api/health`

| الخاصية         | القيمة                                   |
| --------------- | ---------------------------------------- |
| الملف           | `src/app/api/health/route.ts`            |
| الوصف           | فحص حالة الفرونت اند (health check بسيط) |
| يتصل بالباك اند | لا                                       |

**الاستجابة الناجحة:**

```json
{ "status": "ok" }
```

---

#### `POST /api/groq-test`

| الخاصية         | القيمة                                          |
| --------------- | ----------------------------------------------- |
| الملف           | `src/app/api/groq-test/route.ts`                |
| الوصف           | اختبار الاتصال بخدمة Groq مباشرة من الفرونت اند |
| يتصل بالباك اند | لا — يتصل بـ Groq API مباشرة                    |
| المتغير البيئي  | `GROQ_API_KEY`                                  |

**الطلب:** لا يحتاج body.

**الاستجابة الناجحة:**

```json
{ "message": "Hello from Vercel!" }
```

**الاستجابة عند الخطأ:**

```json
{ "error": "رسالة الخطأ" }
```

---

### 1.2 الذكاء الاصطناعي — دردشة ونماذج لغوية

#### `POST /api/ai/chat`

| الخاصية         | القيمة                                                                                 |
| --------------- | -------------------------------------------------------------------------------------- |
| الملف           | `src/app/api/ai/chat/route.ts`                                                         |
| الحالة          | **مهجورة (Deprecated)** — بديلها مباشر عبر الباك اند                                   |
| الوصف           | وسيط (proxy) يحوّل الطلب إلى `POST /api/ai/chat` في الباك اند ويعيد streaming response |
| يتصل بالباك اند | نعم — `POST ${NEXT_PUBLIC_API_URL}/api/ai/chat`                                        |

**الطلب:** أي body JSON يُمرَّر كما هو للباك اند.

**الاستجابة الناجحة:** استجابة مُدفوعة (SSE / text event stream).

**ملاحظة:** يُنصح باستدعاء الباك اند مباشرة (`http://localhost:3001/api/ai/chat`) بدلاً من هذا المسار.

---

#### `POST /api/gemini`

| الخاصية         | القيمة                                                             |
| --------------- | ------------------------------------------------------------------ |
| الملف           | `src/app/api/gemini/route.ts`                                      |
| الوصف           | compatibility shim تاريخي، وليس المسار الرسمي الحالي لـ `styleIST` |
| يتصل بالباك اند | نعم — يحوّل إلى `/api/styleist/execute` في الباك إند               |
| المتغير البيئي  | لا يعتمد عليه كمسار رسمي مباشر من الويب                            |

**الطلب:**

```json
{
  "action": "string",
  "data": {}
}
```

**الإجراءات المتاحة (`action`):**

| الإجراء              | الوصف                               | حقول `data` المطلوبة                                                                                                |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `generateDesign`     | توليد تصميم أزياء سينمائي           | `projectType`، `sceneContext`، `characterProfile`، `psychologicalState`، `filmingLocation`، `productionConstraints` |
| `transcribeAudio`    | تحويل ملف صوتي إلى نص               | `audioBase64`، `mimeType`                                                                                           |
| `analyzeVideo`       | تحليل فيديو لاستلهام تصاميم الأزياء | `videoBase64`، `mimeType`                                                                                           |
| `generateGarment`    | توليد وصف مفصل لقطعة ملابس          | `prompt`، `size`                                                                                                    |
| `generateVirtualFit` | محاكاة إلباس افتراضي                | `garmentUrl`، `personUrl`، `config`                                                                                 |
| `editGarment`        | تعديل صورة ملابس حسب التعليمات      | `imageUrl`، `editPrompt`                                                                                            |
| `refineScreenplay`   | تصحيح تصنيف أسطر السيناريو          | `lines` (مصفوفة أسطر)                                                                                               |

**الاستجابة:** تختلف حسب `action`، دائماً JSON.

---

### 1.3 تحليل السيناريو

#### `POST /api/analysis/seven-stations`

| الخاصية         | القيمة                                                          |
| --------------- | --------------------------------------------------------------- |
| الملف           | `src/app/api/analysis/seven-stations/route.ts`                  |
| الحالة          | **مهجورة (Deprecated)**                                         |
| الوصف           | وسيط يحوّل طلب تحليل "المحطات السبع" إلى الباك اند              |
| يتصل بالباك اند | نعم — `POST ${NEXT_PUBLIC_API_URL}/api/analysis/seven-stations` |
| المهلة القصوى   | 300 ثانية (5 دقائق)                                             |

**GET `/api/analysis/seven-stations`** — يعيد معلومات الخدمة فقط.

**ملاحظة:** استخدم Server Action `runFullPipeline` بدلاً من هذا المسار.

---

#### `POST /api/review-screenplay`

| الخاصية         | القيمة                                                         |
| --------------- | -------------------------------------------------------------- |
| الملف           | `src/app/api/review-screenplay/route.ts`                       |
| الوصف           | مراجعة نص سيناريو عربي بواسطة Gemini AI وتقديم ملاحظات تفصيلية |
| يتصل بالباك اند | لا — يتصل بـ Gemini مباشرة                                     |
| المتغير البيئي  | `GEMINI_API_KEY` أو `NEXT_PUBLIC_GEMINI_API_KEY`               |

**الطلب:**

```json
{ "text": "نص السيناريو (50 حرف على الأقل)" }
```

**الاستجابة الناجحة:**

```json
{ "review": "نتيجة المراجعة التفصيلية" }
```

**الأخطاء الممكنة:**

- `400` — النص قصير جداً (أقل من 50 حرف)
- `500` — مفتاح API غير متوفر أو خطأ داخلي

---

#### `GET /api/editor-runtime/health`

| الخاصية         | القيمة                                                     |
| --------------- | ---------------------------------------------------------- |
| الملف           | `src/app/api/editor-runtime/health/route.ts`               |
| الوصف           | نقطة الصحة الرسمية لربط المحرر مع `backend editor runtime` |
| يتصل بالباك اند | نعم — يحوّل إلى `/api/editor-runtime/health`               |

---

#### `POST /api/brainstorm`

| الخاصية         | القيمة                                                       |
| --------------- | ------------------------------------------------------------ |
| الملف           | `src/app/api/brainstorm/route.ts`                            |
| الوصف           | Proxy رسمي إلى خدمة العصف الذهني متعددة الوكلاء في الباك إند |
| يتصل بالباك اند | نعم — `POST /api/brainstorm` في الباك إند                    |

**الطلب:**

```json
{
  "task": "وصف المهمة",
  "context": {},
  "agentIds": ["agent-1", "agent-2"]
}
```

**الاستجابة الناجحة:**

```json
{ "success": true, "result": { "...": "نتيجة النقاش" } }
```

**الأخطاء الممكنة:**

- `400` — `task` أو `agentIds` مفقودان

---

### 1.4 CineAI — تصوير سينمائي

#### `POST /api/cineai/color-grading`

| الخاصية         | القيمة                                                              |
| --------------- | ------------------------------------------------------------------- |
| الملف           | `src/app/api/cineai/color-grading/route.ts`                         |
| الوصف           | اقتراح لوحة ألوان احترافية للتدريج اللوني السينمائي بحسب نوع المشهد |
| يتصل بالباك اند | لا — Gemini مباشرة (`gemini-1.5-flash`)                             |
| المتغير البيئي  | `GOOGLE_GENAI_API_KEY` أو `GEMINI_API_KEY`                          |

**الطلب:**

```json
{
  "sceneType": "morning | night | indoor | outdoor | happy | sad",
  "mood": "اختياري — وصف المزاج",
  "temperature": 5500
}
```

**الاستجابة الناجحة:**

```json
{
  "success": true,
  "palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
  "primaryColor": "#HEX",
  "secondaryColor": "#HEX",
  "accentColor": "#HEX",
  "sceneType": "morning",
  "mood": "neutral",
  "temperature": 5500,
  "suggestions": ["اقتراح 1", "اقتراح 2"],
  "lutRecommendation": "توصية LUT",
  "cinematicReferences": ["مرجع سينمائي"],
  "generatedAt": "2026-03-30T00:00:00.000Z",
  "source": "ai | mock"
}
```

**ملاحظة:** عند غياب مفتاح API تُعاد بيانات تجريبية (`source: "mock"`).

---

#### `POST /api/cineai/generate-shots`

| الخاصية         | القيمة                                                   |
| --------------- | -------------------------------------------------------- |
| الملف           | `src/app/api/cineai/generate-shots/route.ts`             |
| الحالة          | **مهجورة (Deprecated)**                                  |
| الوصف           | وسيط يحوّل طلب توليد اللقطات إلى الباك اند               |
| يتصل بالباك اند | نعم — `POST ${NEXT_PUBLIC_API_URL}/api/shots/suggestion` |

---

#### `POST /api/cineai/validate-shot`

| الخاصية         | القيمة                                                                        |
| --------------- | ----------------------------------------------------------------------------- |
| الملف           | `src/app/api/cineai/validate-shot/route.ts`                                   |
| الوصف           | تحليل جودة لقطة سينمائية بواسطة Gemini Vision وتقييم التعريض والتكوين والفوكس |
| يتصل بالباك اند | لا — Gemini مباشرة (`gemini-2.0-flash-exp`)                                   |
| المتغير البيئي  | `GOOGLE_GENAI_API_KEY` أو `GEMINI_API_KEY`                                    |
| نوع الطلب       | `multipart/form-data`                                                         |

**الطلب:** `FormData` يحتوي على:

- `image` (File) — ملف الصورة

**الاستجابة الناجحة:**

```json
{
  "success": true,
  "validation": {
    "score": 85,
    "status": "good",
    "exposure": "Good",
    "composition": "Excellent",
    "focus": "Acceptable",
    "colorBalance": "Good",
    "suggestions": ["اقتراح 1"],
    "technicalDetails": {
      "histogram": "Balanced",
      "waveform": "Good dynamic range",
      "vectorscope": "Colors within broadcast safe"
    },
    "strengths": [],
    "improvements": []
  },
  "analyzedAt": "2026-03-30T00:00:00.000Z",
  "source": "ai | mock"
}
```

---

### 1.5 النقد الفني (Critique)

جميع مسارات النقد وسيطة (proxy) تُحوّل الطلبات إلى الباك اند مع ترحيل cookie `token` للمصادقة.

**المتغير البيئي:** `NEXT_PUBLIC_BACKEND_URL` (الافتراضي: `http://localhost:3001`)

#### `GET /api/critique/config`

| الخاصية         | القيمة                                                     |
| --------------- | ---------------------------------------------------------- |
| الملف           | `src/app/api/critique/config/route.ts`                     |
| الوصف           | جلب كل إعدادات النقد المتاحة                               |
| يتصل بالباك اند | نعم — `GET ${NEXT_PUBLIC_BACKEND_URL}/api/critique/config` |
| المصادقة        | `Bearer token` من cookie                                   |

---

#### `GET /api/critique/config/[taskType]`

| الخاصية         | القيمة                                                                |
| --------------- | --------------------------------------------------------------------- |
| الملف           | `src/app/api/critique/config/[taskType]/route.ts`                     |
| الوصف           | جلب إعداد النقد لنوع مهمة معين                                        |
| المعامل         | `taskType` — نوع المهمة في المسار                                     |
| يتصل بالباك اند | نعم — `GET ${NEXT_PUBLIC_BACKEND_URL}/api/critique/config/{taskType}` |
| المصادقة        | `Bearer token` من cookie                                              |

---

#### `GET /api/critique/dimensions/[taskType]`

| الخاصية         | القيمة                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| الملف           | `src/app/api/critique/dimensions/[taskType]/route.ts`                     |
| الوصف           | جلب أبعاد التقييم التفصيلية لنوع مهمة معين                                |
| المعامل         | `taskType` — نوع المهمة في المسار                                         |
| يتصل بالباك اند | نعم — `GET ${NEXT_PUBLIC_BACKEND_URL}/api/critique/dimensions/{taskType}` |
| المصادقة        | `Bearer token` من cookie                                                  |

---

#### `POST /api/critique/summary`

| الخاصية         | القيمة                                                       |
| --------------- | ------------------------------------------------------------ |
| الملف           | `src/app/api/critique/summary/route.ts`                      |
| الوصف           | الحصول على ملخص نقدي شامل                                    |
| يتصل بالباك اند | نعم — `POST ${NEXT_PUBLIC_BACKEND_URL}/api/critique/summary` |
| المصادقة        | `Bearer token` + `CSRF-Token` من cookies                     |

**الطلب:** JSON body يُمرَّر كما هو للباك اند.

---

### 1.6 البريك داون (Breakdown)

#### `POST /api/breakdown/analyze`

| الخاصية         | القيمة                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------- |
| الملف           | `src/app/api/breakdown/analyze/route.ts`                                                            |
| الوصف           | تحليل سيناريو كامل: يُنشئ مشروع في الباك اند ثم يشغّل تحليل البريك داون                             |
| يتصل بالباك اند | نعم — خطوتان: `POST .../breakdown/projects/bootstrap` ثم `POST .../breakdown/projects/{id}/analyze` |
| المصادقة        | `Authorization` header + cookies + `X-XSRF-TOKEN`                                                   |

**الطلب:**

```json
{
  "script": "محتوى السيناريو",
  "title": "عنوان المشروع (اختياري)"
}
```

**الاستجابة الناجحة:**

```json
{ "success": true, "data": { "...": "نتيجة التحليل" } }
```

**GET `/api/breakdown/analyze`** — يعيد معلومات الخدمة فقط.

---

#### `GET|POST /api/breakdown/[...path]`

| الخاصية         | القيمة                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| الملف           | `src/app/api/breakdown/[...path]/route.ts`                                                                                       |
| الوصف           | وسيط عام (catch-all proxy) يُحوّل أي طلب GET أو POST تحت `/api/breakdown/` إلى الباك اند مع الحفاظ على query string والـ cookies |
| يتصل بالباك اند | نعم — `${NEXT_PUBLIC_API_URL}/api/breakdown/{...path}`                                                                           |
| Runtime         | `nodejs` — `force-dynamic`                                                                                                       |
| المصادقة        | `Authorization` header + cookies + `X-XSRF-TOKEN`                                                                                |

---

### 1.7 Art Director

#### `GET|POST /api/art-director/[...path]`

| الخاصية         | القيمة                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| الملف           | `src/app/api/art-director/[...path]/route.ts`                                                                 |
| الوصف           | وسيط عام يُوجّه الطلبات إلى `handleArtDirectorRequest` المحلي الذي يُدير نظام الإضافات (plugins) للمخرج الفني |
| يتصل بالباك اند | لا — يُعالج محلياً عبر `src/app/(main)/art-director/server/handlers.ts`                                       |
| Runtime         | `nodejs` — `force-dynamic`                                                                                    |

**الإضافات المدعومة:** BudgetOptimizer، CinemaSkillsTrainer، CreativeInspirationAssistant، AutomaticDocumentationGenerator، ImmersiveConceptArt، LightingSimulator، LocationSetCoordinator، MRPrevizStudio، ProductionReadinessReport، PerformanceProductivityAnalyzer، RiskAnalyzer، SetReusabilityOptimizer، TerminologyTranslator، VirtualProductionEngine، VirtualSetEditor، VisualConsistencyAnalyzer.

---

### 1.8 الميزانية (Budget)

#### `POST /api/budget/generate`

| الخاصية         | القيمة                                                     |
| --------------- | ---------------------------------------------------------- |
| الملف           | `src/app/api/budget/generate/route.ts`                     |
| الوصف           | توليد ميزانية فيلم تلقائياً من سيناريو باستخدام Gemini AI  |
| يتصل بالباك اند | لا — يستخدم `@/app/(main)/BUDGET/lib/geminiService` محلياً |
| نوع المحتوى     | `application/json` مطلوب                                   |

**الطلب:**

```json
{
  "scenario": "نص السيناريو (مطلوب)",
  "title": "عنوان المشروع (اختياري)"
}
```

**الاستجابة الناجحة:**

```json
{
  "success": true,
  "data": { "budget": { "...": "بيانات الميزانية" } }
}
```

**الأخطاء الممكنة:**

- `400` — `scenario` مفقود أو فارغ
- `415` — Content-Type غير صحيح

**رؤوس الاستجابة:** `X-RateLimit-Limit: 100`، `Cache-Control: no-store`

---

#### `POST /api/budget/export`

| الخاصية         | القيمة                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| الملف           | `src/app/api/budget/export/route.ts`                                            |
| الوصف           | تصدير بيانات الميزانية كملف Excel (`.xlsx`) مع ورقة ملخص وأوراق تفصيلية لكل قسم |
| يتصل بالباك اند | لا — يُعالج محلياً باستخدام `exceljs`                                           |
| نوع المحتوى     | `application/json` مطلوب                                                        |

**الطلب:**

```json
{
  "budget": {
    "sections": [],
    "grandTotal": 0,
    "metadata": { "title": "اسم المشروع" }
  }
}
```

**الاستجابة الناجحة:** ملف ثنائي بنوع `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` مع header `Content-Disposition: attachment`.

**الأخطاء الممكنة:**

- `400` — بيانات الميزانية ناقصة أو غير صالحة
- `415` — Content-Type غير صحيح

---

#### `POST /api/budget/analyze`

| الخاصية         | القيمة                                                      |
| --------------- | ----------------------------------------------------------- |
| الملف           | `src/app/api/budget/analyze/route.ts`                       |
| الوصف           | تحليل سيناريو لاستخلاص بيانات الإنتاج المؤثرة على الميزانية |
| يتصل بالباك اند | نعم — Proxy إلى `/api/budget/analyze` في الباك إند          |
| نوع المحتوى     | `application/json` مطلوب                                    |

**الطلب:**

```json
{ "scenario": "نص السيناريو (مطلوب)" }
```

**الاستجابة الناجحة:**

```json
{ "success": true, "data": { "analysis": { "...": "نتيجة التحليل" } } }
```

---

### 1.9 المشاريع (Projects)

مسارات المشاريع ضمن الربط الرسمي الحالي، والويب يتعامل معها كطبقة Route Handlers فوق الباك إند الرئيسي.

#### `GET /api/projects`

| الخاصية | القيمة                          |
| ------- | ------------------------------- |
| الملف   | `src/app/api/projects/route.ts` |
| الوصف   | جلب قائمة جميع المشاريع         |

**الاستجابة:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "scriptContent": "...",
      "userId": "local-user",
      "createdAt": "ISO",
      "updatedAt": "ISO"
    }
  ]
}
```

---

#### `POST /api/projects`

| الخاصية | القيمة                          |
| ------- | ------------------------------- |
| الملف   | `src/app/api/projects/route.ts` |
| الوصف   | إنشاء مشروع جديد                |

**الطلب:**

```json
{ "title": "عنوان المشروع (مطلوب)", "scriptContent": "اختياري" }
```

**الاستجابة:** `201` مع بيانات المشروع المنشأ.

---

#### `GET /api/projects/[id]`

| الخاصية | القيمة                               |
| ------- | ------------------------------------ |
| الملف   | `src/app/api/projects/[id]/route.ts` |
| الوصف   | جلب مشروع واحد بمعرّفه               |

---

#### `PUT /api/projects/[id]`

| الخاصية | القيمة                                 |
| ------- | -------------------------------------- |
| الملف   | `src/app/api/projects/[id]/route.ts`   |
| الوصف   | تحديث عنوان المشروع أو محتوى السيناريو |

**الطلب:** `{ "title": "اختياري", "scriptContent": "اختياري" }`

---

#### `DELETE /api/projects/[id]`

| الخاصية | القيمة                                                         |
| ------- | -------------------------------------------------------------- |
| الملف   | `src/app/api/projects/[id]/route.ts`                           |
| الوصف   | حذف المشروع مع كل بياناته (مشاهد، شخصيات، لقطات) بصورة متسلسلة |

---

#### `GET /api/projects/[id]/scenes`

| الخاصية | القيمة                                      |
| ------- | ------------------------------------------- |
| الملف   | `src/app/api/projects/[id]/scenes/route.ts` |
| الوصف   | جلب مشاهد مشروع مرتبة حسب رقم المشهد        |

---

#### `POST /api/projects/[id]/scenes`

| الخاصية | القيمة                                      |
| ------- | ------------------------------------------- |
| الملف   | `src/app/api/projects/[id]/scenes/route.ts` |
| الوصف   | إنشاء مشهد جديد داخل مشروع                  |

**الطلب:**

```json
{
  "title": "مطلوب",
  "location": "مطلوب",
  "timeOfDay": "مطلوب",
  "sceneNumber": 1,
  "characters": [],
  "description": "اختياري",
  "shotCount": 0,
  "status": "planned"
}
```

---

#### `GET /api/projects/[id]/characters`

| الخاصية | القيمة                                          |
| ------- | ----------------------------------------------- |
| الملف   | `src/app/api/projects/[id]/characters/route.ts` |
| الوصف   | جلب شخصيات مشروع                                |

---

#### `POST /api/projects/[id]/characters`

| الخاصية | القيمة                                          |
| ------- | ----------------------------------------------- |
| الملف   | `src/app/api/projects/[id]/characters/route.ts` |
| الوصف   | إنشاء شخصية جديدة في مشروع                      |

**الطلب:**

```json
{
  "name": "اسم الشخصية (مطلوب)",
  "appearances": 0,
  "consistencyStatus": "good",
  "lastSeen": null,
  "notes": null
}
```

---

### 1.10 المشاهد (Scenes)

#### `GET /api/scenes/[id]`

| الخاصية         | القيمة                             |
| --------------- | ---------------------------------- |
| الملف           | `src/app/api/scenes/[id]/route.ts` |
| الوصف           | جلب مشهد واحد بمعرّفه              |
| يتصل بالباك اند | لا — قاعدة بيانات JSON محلية       |

---

#### `PUT /api/scenes/[id]`

| الخاصية | القيمة                                                       |
| ------- | ------------------------------------------------------------ |
| الملف   | `src/app/api/scenes/[id]/route.ts`                           |
| الوصف   | تحديث بيانات مشهد (رقم، عنوان، موقع، وقت، شخصيات، وصف، حالة) |

---

#### `DELETE /api/scenes/[id]`

| الخاصية | القيمة                             |
| ------- | ---------------------------------- |
| الملف   | `src/app/api/scenes/[id]/route.ts` |
| الوصف   | حذف مشهد مع كل لقطاته المرتبطة     |

---

#### `GET /api/scenes/[id]/shots`

| الخاصية | القيمة                                   |
| ------- | ---------------------------------------- |
| الملف   | `src/app/api/scenes/[id]/shots/route.ts` |
| الوصف   | جلب لقطات مشهد مرتبة حسب رقم اللقطة      |

---

#### `POST /api/scenes/[id]/shots`

| الخاصية | القيمة                                                            |
| ------- | ----------------------------------------------------------------- |
| الملف   | `src/app/api/scenes/[id]/shots/route.ts`                          |
| الوصف   | إنشاء لقطة جديدة داخل مشهد ويُحدّث `shotCount` في المشهد تلقائياً |

**الطلب:**

```json
{
  "shotType": "مطلوب",
  "cameraAngle": "مطلوب",
  "cameraMovement": "مطلوب",
  "lighting": "مطلوب",
  "shotNumber": 1,
  "aiSuggestion": null
}
```

---

### 1.11 اللقطات (Shots)

#### `GET /api/shots/[id]`

| الخاصية         | القيمة                            |
| --------------- | --------------------------------- |
| الملف           | `src/app/api/shots/[id]/route.ts` |
| الوصف           | جلب لقطة واحدة بمعرّفها           |
| يتصل بالباك اند | لا — قاعدة بيانات JSON محلية      |

---

#### `PUT /api/shots/[id]`

| الخاصية | القيمة                                                                                 |
| ------- | -------------------------------------------------------------------------------------- |
| الملف   | `src/app/api/shots/[id]/route.ts`                                                      |
| الوصف   | تحديث بيانات لقطة (رقم، نوع، زاوية الكاميرا، حركتها، الإضاءة، اقتراح الذكاء الاصطناعي) |

---

#### `DELETE /api/shots/[id]`

| الخاصية | القيمة                                               |
| ------- | ---------------------------------------------------- |
| الملف   | `src/app/api/shots/[id]/route.ts`                    |
| الوصف   | حذف لقطة ويُحدّث `shotCount` في المشهد الأب تلقائياً |

---

### 1.12 الشخصيات (Characters)

#### `GET /api/characters/[id]`

| الخاصية         | القيمة                                 |
| --------------- | -------------------------------------- |
| الملف           | `src/app/api/characters/[id]/route.ts` |
| الوصف           | جلب شخصية واحدة بمعرّفها               |
| يتصل بالباك اند | لا — قاعدة بيانات JSON محلية           |

---

#### `PUT /api/characters/[id]`

| الخاصية | القيمة                                                                |
| ------- | --------------------------------------------------------------------- |
| الملف   | `src/app/api/characters/[id]/route.ts`                                |
| الوصف   | تحديث بيانات شخصية (اسم، عدد الظهور، حالة الاتساق، آخر ظهور، ملاحظات) |

---

#### `DELETE /api/characters/[id]`

| الخاصية | القيمة                                 |
| ------- | -------------------------------------- |
| الملف   | `src/app/api/characters/[id]/route.ts` |
| الوصف   | حذف شخصية                              |

---

### 1.13 حالة التطبيق (App State)

#### `GET /api/app-state/[app]`

| الخاصية         | القيمة                                                |
| --------------- | ----------------------------------------------------- |
| الملف           | `src/app/api/app-state/[app]/route.ts`                |
| الوصف           | قراءة الحالة المحفوظة لتطبيق معين                     |
| المعامل         | `app` — معرّف التطبيق (يُتحقق منه بـ Zod Schema)      |
| يتصل بالباك اند | نعم — Proxy إلى خدمة `app-state` الرسمية في الباك إند |
| Runtime         | `nodejs` — `force-dynamic`                            |

**الاستجابة:**

```json
{ "success": true, "data": { "...": "بيانات الحالة" }, "updatedAt": "ISO" }
```

---

#### `PUT /api/app-state/[app]`

| الخاصية | القيمة                                 |
| ------- | -------------------------------------- |
| الملف   | `src/app/api/app-state/[app]/route.ts` |
| الوصف   | حفظ أو تحديث حالة تطبيق                |

**الطلب:**

```json
{ "data": { "...": "بيانات الحالة" } }
```

---

#### `DELETE /api/app-state/[app]`

| الخاصية | القيمة                                 |
| ------- | -------------------------------------- |
| الملف   | `src/app/api/app-state/[app]/route.ts` |
| الوصف   | مسح حالة تطبيق وإعادة تهيئتها          |

---

## 2. Server Actions

Server Actions في Next.js تعمل على الخادم وتُستدعى مباشرة من مكونات React أو Client Components. جميعها تحتوي على `"use server"` في أعلى الملف.

---

### `runFullPipeline`

| الخاصية         | القيمة                                                                |
| --------------- | --------------------------------------------------------------------- |
| الملف           | `src/lib/actions/analysis.ts`                                         |
| المُصدَّر من    | `src/lib/actions/index.ts`                                            |
| الوصف           | تشغيل خط تحليل درامي كامل للنص عبر "المحطات السبع" باستخدام Gemini AI |
| يتصل بالباك اند | لا — يستخدم `@/lib/ai/stations/run-all-stations` محلياً               |
| المتغير البيئي  | `GEMINI_API_KEY` (أو بدائله)                                          |

**المدخلات (`PipelineInput`):**

```typescript
{
  fullText: string;      // النص الدرامي المراد تحليله (مطلوب، غير فارغ)
  projectName?: string;  // اسم المشروع (افتراضي: "تحليل درامي شامل")
}
```

**المخرجات (`PipelineResult = AnalysisPipelinePayload`):**

```typescript
{
  success: boolean;
  mode: "ai" | "fallback";
  warnings: string[];
  stationOutputs: Record<string, unknown>; // مخرجات كل محطة تحليل
  metadata: {
    analysisMode: string;
    projectName: string;
    textLength: number;
    [key: string]: unknown;
  };
}
```

**السلوك الاحتياطي:** عند غياب مفتاح API أو في بيئة الاختبار، تُعاد نتيجة من `buildFallbackSevenStationsResult` مع تحذير في حقل `warnings`.

---

### `getData`

| الخاصية         | القيمة                                                |
| --------------- | ----------------------------------------------------- |
| الملف           | `src/app/actions.ts`                                  |
| الوصف           | استعلام تجريبي مباشر على قاعدة بيانات Neon PostgreSQL |
| يتصل بالباك اند | لا — يتصل بـ Neon مباشرة                              |
| المتغير البيئي  | `DATABASE_URL`                                        |

**المدخلات:** لا شيء.

**المخرجات:** نتيجة الاستعلام SQL.

**ملاحظة:** الاستعلام حالياً placeholder (`...`). هذه Action للاستخدام الداخلي.

---

### `analyzeTextForCharactersRelationships`

| الخاصية         | القيمة                                                          |
| --------------- | --------------------------------------------------------------- |
| الملف           | `src/lib/ai/flows/analyze-text-for-characters-relationships.ts` |
| الوصف           | تحديد الشخصيات الرئيسية وعلاقاتهم في نص درامي عبر Genkit        |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                                     |

**المدخلات:**

```typescript
{
  text: string;
} // النص الدرامي
```

**المخرجات:**

```typescript
{
  characters: string[];     // أسماء الشخصيات الرئيسية
  relationships: string[];  // العلاقات بين الشخصيات
}
```

---

### `generateConflictNetwork`

| الخاصية         | القيمة                                            |
| --------------- | ------------------------------------------------- |
| الملف           | `src/lib/ai/flows/generate-conflict-network.ts`   |
| الوصف           | توليد شبكة صراع من نص درامي بصيغة JSON عبر Genkit |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                       |

**المدخلات:**

```typescript
{
  analyzedText: string;
} // النص الدرامي
```

**المخرجات:**

```typescript
{
  conflictNetworkJson: string;
} // JSON string يمثل شبكة الصراع
```

---

### `diagnoseAndRefineConflictNetwork`

| الخاصية         | القيمة                                                      |
| --------------- | ----------------------------------------------------------- |
| الملف           | `src/lib/ai/flows/diagnose-and-refine-conflict-networks.ts` |
| الوصف           | تشخيص مشكلات شبكة الصراع واقتراح تحسينات عبر Genkit         |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                                 |

**المدخلات:** شبكة صراع (شخصيات، علاقات، صراعات) بصيغة object مُهيكل.

**المخرجات:** توصيات تحسين وشبكة محسّنة.

---

### `identifyThemesAndGenres`

| الخاصية         | القيمة                                                            |
| --------------- | ----------------------------------------------------------------- |
| الملف           | `src/lib/ai/flows/identify-themes-and-genres.ts`                  |
| الوصف           | تحديد المواضيع الدرامية والأنواع الأدبية من نص سيناريو عبر Genkit |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                                       |

**المدخلات:**

```typescript
{
  text: string;
}
```

**المخرجات:**

```typescript
{
  themes: string[]; // المواضيع
  genres: string[]; // الأنواع
}
```

---

### `measureTextEfficiencyAndEffectiveness`

| الخاصية         | القيمة                                                          |
| --------------- | --------------------------------------------------------------- |
| الملف           | `src/lib/ai/flows/measure-text-efficiency-and-effectiveness.ts` |
| الوصف           | قياس كفاءة وفعالية النص الدرامي وإعطاء درجة تقييم عبر Genkit    |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                                     |

**المدخلات:** `string` — النص الدرامي مباشرة.

**المخرجات:**

```typescript
{
  efficiencyScore: number; // درجة الكفاءة (0-100)
  effectivenessAnalysis: string; // تحليل نصي للفعالية
}
```

---

### `visualizeAnalysisResults`

| الخاصية         | القيمة                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| الملف           | `src/lib/ai/flows/visualize-analysis-results.ts`                                                     |
| الوصف           | إنشاء تصور مرئي لنتائج التحليل الدرامي (شبكات الصراع، علاقات الشخصيات، العناصر الموضوعية) عبر Genkit |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                                                                          |

**المدخلات:**

```typescript
{
  conflictNetwork: string; // JSON string لشبكة الصراع
  characterRelationships: string; // JSON string لعلاقات الشخصيات
  thematicElements: string; // JSON string للعناصر الموضوعية
}
```

**المخرجات:** وصف مرئي (visualization) لنتائج التحليل.

---

### `aiTeamBrainstorming`

| الخاصية         | القيمة                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------- |
| الملف           | `src/ai/ai-team-brainstorming.ts`                                                                 |
| الوصف           | جلسة عصف ذهني بواسطة فريق من وكلاء الذكاء الاصطناعي (2-5 وكلاء) لتطوير أفكار السيناريو عبر Genkit |
| يتصل بالباك اند | لا — Genkit + Gemini مباشرة                                                                       |

**المدخلات:**

```typescript
{
  scriptConcept: string;         // الفكرة أو الحبكة الأولية (مطلوب)
  numberOfAgents?: number;       // عدد الوكلاء 2-5 (افتراضي: 3)
  specificRequests?: string;     // طلبات أو توجيهات محددة (اختياري)
}
```

**المخرجات:**

```typescript
{
  brainstormingSessionSummary: string; // ملخص جلسة العصف الذهني
}
```

---

## 3. Middleware

**الملف:** `src/middleware.ts`

> **تنبيه إصدار:** في Next.js 16+، اصطلاح `middleware.ts` مهجور لصالح `proxy.ts`. الملف الحالي في المشروع لا يزال باسم `middleware.ts`، وقد تم كتم تحذير الإهمال مؤقتاً في `next.config.ts`. عند الترقية الكاملة يجب إعادة تسمية الملف إلى `proxy.ts`.

### وصف عام

الـ Middleware يعمل على **كل الطلبات** الواردة للفرونت اند ويُضيف headers أمنية إلى كل الاستجابات. لا يتحكم في الوصول أو المصادقة — دوره الوحيد هو الأمان على مستوى HTTP headers.

### المسارات المُعالجة

يُطبَّق الـ Middleware على **جميع المسارات** باستثناء:

| المسار المستثنى                        | السبب              |
| -------------------------------------- | ------------------ |
| `/_next/static/**`                     | الملفات الثابتة    |
| `/_next/image/**`                      | تحسين الصور        |
| `/favicon.ico`                         | أيقونة الموقع      |
| `/**.(svg\|png\|jpg\|jpeg\|gif\|webp)` | ملفات الصور العامة |

### Headers الأمنية المُضافة

| الـ Header                  | القيمة                                         | البيئة      |
| --------------------------- | ---------------------------------------------- | ----------- |
| `Content-Security-Policy`   | CSP كامل مع قائمة مصادر مسموحة                 | الإنتاج فقط |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | الإنتاج فقط |
| `X-Content-Type-Options`    | `nosniff`                                      | دائماً      |
| `X-Frame-Options`           | `DENY`                                         | دائماً      |
| `X-XSS-Protection`          | `1; mode=block`                                | دائماً      |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              | دائماً      |

### سياسة أمان المحتوى (CSP)

في بيئة **الإنتاج**، يُفعَّل CSP بالسياسات التالية:

| التوجيه           | المصادر المسموحة                                       |
| ----------------- | ------------------------------------------------------ |
| `default-src`     | `'self'`                                               |
| `script-src`      | `'self'`، Google APIs، Sentry، CDN                     |
| `connect-src`     | `'self'`، Google APIs (Firebase/Identity)، Sentry، CDN |
| `img-src`         | `'self'`، data، blob، Unsplash، Picsum، Google         |
| `media-src`       | `'self'`، Pixabay، blob، data                          |
| `frame-ancestors` | `'none'` (أو مصدر محدد عبر `ALLOWED_DEV_ORIGIN`)       |
| `object-src`      | `'none'`                                               |

**في بيئة التطوير:** CSP مُعطَّل بالكامل (`null`) لتسهيل العمل.

### المتغيرات البيئية الخاصة بالـ Middleware

| المتغير                  | الغرض                                        |
| ------------------------ | -------------------------------------------- |
| `NODE_ENV`               | تحديد بيئة التشغيل (development/production)  |
| `ALLOWED_DEV_ORIGIN`     | عنوان إضافي مسموح له بتضمين الصفحة في iframe |
| `NEXT_PUBLIC_SENTRY_DSN` | لاستخراج مصدر Sentry وإضافته لـ CSP          |
| `NEXT_PUBLIC_CDN_URL`    | لاستخراج مصدر CDN وإضافته لـ CSP             |

---

## ملاحظات عامة

### أنماط الاستجابة

معظم API Routes تتبع نمطاً موحداً:

```json
// استجابة ناجحة
{ "success": true, "data": { "..." } }

// استجابة فاشلة
{ "success": false, "error": "وصف الخطأ" }
```

### المسارات المهجورة (Deprecated)

المسارات التالية وسيطة للتوافق العكسي فقط ويُنصح بالاستغناء عنها:

| المسار                              | البديل المباشر                                    |
| ----------------------------------- | ------------------------------------------------- |
| `POST /api/ai/chat`                 | `POST http://localhost:3001/api/ai/chat`          |
| `POST /api/analysis/seven-stations` | Server Action `runFullPipeline`                   |
| `POST /api/cineai/generate-shots`   | `POST http://localhost:3001/api/shots/suggestion` |

### مصادر البيانات

| النوع                                | المصدر                                        |
| ------------------------------------ | --------------------------------------------- |
| المشاريع، المشاهد، اللقطات، الشخصيات | الباك إند الرئيسي عبر مسارات `/api/projects*` |
| حالة التطبيقات                       | الباك إند الرئيسي عبر `/api/app-state/[app]`  |
| النقد والبريك داون (الجزء الجسري)    | الباك إند الرسمي على port 3001                |
| الذكاء الاصطناعي (Gemini)            | يخرج تشغيليًا من `apps/backend`               |
| الذكاء الاصطناعي (Genkit flows)      | Google AI عبر Genkit                          |
| Groq                                 | Groq Cloud API مباشرة                         |

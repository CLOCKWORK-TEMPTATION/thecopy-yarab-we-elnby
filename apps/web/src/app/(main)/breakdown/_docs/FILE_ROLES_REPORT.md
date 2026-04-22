# تقرير أدوار الملفات — وحدة Breakdown

> تاريخ التقرير: 2026-03-26
> المسار: `apps/web/src/app/(main)/breakdown/`

---

## نظرة عامة

وحدة **Breakdown** هي نظام تحليل سيناريوهات سينمائية يعمل بالذكاء الاصطناعي (Gemini AI). يقوم بتفكيك المشاهد واستخراج العناصر الإنتاجية (ممثلين، ملابس، مواقع، مركبات، إلخ) باستخدام وكلاء AI متخصصين يعملون بالتوازي.

---

## 1. ملفات الجذر (Root Files)

### `page.tsx`

- **الدور**: نقطة الدخول لصفحة Next.js (App Router) — `"use client"`
- **الوظيفة**: يعرض واجهة التبديل بين وضعين: **مساحة التفكيك** (Workspace) و**التقرير** (Report). يستخدم `BreakdownApp` و `BreakdownContent` كمكونين فرعيين.

### `App.tsx`

- **الدور**: المكون الرئيسي لوضع "مساحة التفكيك"
- **الوظيفة**: يوفر واجهة لإدخال نص السيناريو ومعالجته عبر `useScriptProcessor` و `useSceneManager`. يعرض نتائج التحليل عبر `ResultsView` مع شات بوت `ChatBot` ونظام إشعارات `ToastContainer`.

### `breakdown-content.tsx`

- **الدور**: مكون عرض وضع "التقرير" — `"use client"`
- **الوظيفة**: يحمّل تقرير التحليل النهائي من localStorage أو من ملف JSON ثابت (`/analysis_output/final-report.json`)، ويعرضه عبر مكونات `breakdown-ui.tsx`.

### `breakdown-report.ts`

- **الدور**: خدمة قراءة التقارير من التخزين المحلي
- **الوظيفة**: يقرأ نتائج التحليل من `localStorage` (مفتاح `stationAnalysisResults`)، يتحقق من صحتها عبر Zod schemas، ويعيدها كـ `AnalysisReportOutput`.

### `breakdown-ui.tsx`

- **الدور**: مكتبة مكونات عرض التقرير
- **الوظيفة**: يحتوي على مكونات مثل `BreakdownReportView`, `BreakdownLoadingState`, `BreakdownMessageState`, `BreakdownScore` لعرض بيانات التقرير بتنسيق بطاقات (Cards) و Badges.

### `config.ts`

- **الدور**: إعدادات التطبيق المركزية
- **الوظيفة**: يُعرّف `AppConfig` (مفتاح API، البيئة)، دالة `getAppConfig()` لتحميل الإعدادات، ودالة `logError()` لتسجيل الأخطاء بشكل موحد.

### `constants.tsx`

- **الدور**: الثوابت وتعريفات الوكلاء
- **الوظيفة**: يُصدّر مصفوفة `AGENTS` التي تحتوي على تعريفات كل وكيل تحليل (الاسم، الأيقونة، اللون، الوصف) بالإضافة إلى `MOCK_SCRIPT` للتجربة.

### `types.ts`

- **الدور**: تعريفات TypeScript المركزية
- **الوظيفة**: يُعرّف الأنواع الأساسية: `Scene`, `SceneBreakdown`, `CastMember`, `ScenarioAnalysis`, `AgentDef`, `Version`, `ImpactMetrics`, `ExtendedCastMember`, وغيرها.

### `schemas.ts`

- **الدور**: مخططات التحقق بـ Zod
- **الوظيفة**: يحتوي على `CastMemberSchema`, `SceneBreakdownSchema`, `AnalysisReportSchema` وغيرها للتحقق من صحة البيانات الواردة من API والمدخلات.

### `package.json`

- **الدور**: تعريف الحزمة وتبعياتها
- **الوظيفة**: يحدد اسم الوحدة والتبعيات مثل `@google/genai`, `zod`, `lucide-react`.

### `metadata.json`

- **الدور**: بيانات وصفية للتطبيق
- **الوظيفة**: يحتوي على اسم التطبيق ووصفه والإصدار.

### `tsconfig.json`

- **الدور**: إعدادات TypeScript
- **الوظيفة**: يضبط خيارات المترجم الخاصة بوحدة Breakdown.

### `.env.example`

- **الدور**: نموذج متغيرات البيئة
- **الوظيفة**: يوضح المتغيرات المطلوبة مثل `API_KEY` و `GEMINI_API_KEY`.

### `.gitignore`

- **الدور**: استثناءات Git
- **الوظيفة**: يستثني ملفات البيئة والتبعيات المحلية.

### `verify.ps1` / `verify.sh`

- **الدور**: سكربتات تحقق
- **الوظيفة**: تتحقق من صحة الإعداد والتبعيات والبنية (Windows PowerShell و Unix Shell).

### `breakdown-report.test.ts`

- **الدور**: اختبارات وحدة breakdown-report
- **الوظيفة**: يختبر دوال قراءة التقارير من التخزين المحلي والتحقق من صحتها.

### `tests/page.route.test.tsx`

- **الدور**: اختبار مسار الصفحة
- **الوظيفة**: يختبر أن صفحة Breakdown تُعرض بشكل صحيح.

---

## 2. المكونات (components/)

### `AgentCard.tsx`

- **الدور**: بطاقة عرض وكيل تحليل واحد
- **الوظيفة**: يعرض اسم الوكيل وأيقونته وقائمة العناصر المستخرجة. يدعم حالة التحميل (Loader spinner) وحالة عدم وجود عناصر.

### `CastBreakdownView.tsx`

- **الدور**: عرض تفريغ طاقم التمثيل
- **الوظيفة**: واجهة متكاملة لعرض الشخصيات المستخرجة مع بحث، تصفية حسب الدور/الجنس، ترتيب، تحليل متقدم (عواطف، أقواس درامية)، وتصدير إلى CSV/JSON.

### `ChatBot.tsx`

- **الدور**: واجهة الشات بوت العائمة
- **الوظيفة**: نافذة محادثة عائمة (floating) تستخدم `useChatSession` للتواصل مع Gemini AI. تدعم فتح/إغلاق، إرسال رسائل، وعرض حالة التحميل.

### `ChatMessage.tsx`

- **الدور**: مكون رسالة واحدة في الشات
- **الوظيفة**: يعرض رسالة (مستخدم أو بوت) بتنسيق فقاعة محادثة مع أفاتار مختلف لكل طرف.

### `ResultsView.tsx`

- **الدور**: عرض نتائج تحليل المشاهد
- **الوظيفة**: يعرض قائمة المشاهد المستخرجة مع إمكانية توسيع كل مشهد، تشغيل التحليل التفصيلي، عرض بطاقات الوكلاء (`AgentCard`)، تحليل السيناريوهات الاستراتيجية، واستعادة إصدارات سابقة.

### `ScenarioNavigator.tsx`

- **الدور**: متصفح السيناريوهات الاستراتيجية
- **الوظيفة**: نافذة منبثقة (Modal) تعرض سيناريوهات الإنتاج البديلة مع مقاييس (الميزانية، الجدول، المخاطر) باستخدام أشرطة تقدم ملونة.

### `ToastContainer.tsx`

- **الدور**: حاوية إشعارات Toast
- **الوظيفة**: يعرض إشعارات متحركة بأنواع مختلفة (نجاح، خطأ، تحذير، معلومات) بدلاً من `alert()`.

---

## 3. الخطافات (hooks/)

### `index.ts`

- **الدور**: نقطة تصدير موحدة
- **الوظيفة**: يُعيد تصدير جميع الخطافات وأنواعها من مكان واحد لتسهيل الاستيراد.

### `useChatSession.ts`

- **الدور**: إدارة جلسة المحادثة مع Gemini
- **الوظيفة**: يُنشئ جلسة Chat مع Google GenAI، يدير الرسائل (إرسال/استقبال)، يعالج الأخطاء، ويوفر واجهة `messages`, `input`, `sendMessage`, `isLoading`.

### `useSceneManager.ts`

- **الدور**: إدارة المشاهد وتحليلها
- **الوظيفة**: يدير حالة المشاهد (إضافة، تحديث، حذف)، تشغيل التحليل التفصيلي عبر Gemini، تحليل السيناريوهات الاستراتيجية، وإدارة الإصدارات (versioning).

### `useScriptProcessor.ts`

- **الدور**: معالجة نص السيناريو
- **الوظيفة**: يأخذ نص السيناريو الخام ويرسله لـ Gemini لتقسيمه إلى مشاهد. يتحقق من صحة النتائج عبر Zod schemas ويعيد قائمة `Scene[]`.

### `useToast.ts`

- **الدور**: نظام إشعارات Toast
- **الوظيفة**: يوفر دوال `success()`, `error()`, `warning()`, `info()` لعرض إشعارات غير متطفلة مع إزالة تلقائية بعد مدة محددة.

---

## 4. الخدمات (services/)

### `geminiService.ts`

- **الدور**: خدمة التواصل المركزية مع Gemini AI
- **الوظيفة**: يحتوي على جميع دوال API: تقسيم السيناريو (`segmentScript`)، تحليل المشهد (`analyzeScene`)، توليد السيناريوهات (`generateScenarios`)، وإنشاء جلسة محادثة (`createChatSession`). يستخدم نموذج `gemini-3-pro-preview`.

### `agentConfigs.ts`

- **الدور**: تكوينات الوكلاء المتخصصين
- **الوظيفة**: يُعرّف `AGENT_PERSONAS` — كائن يحتوي على دور كل وكيل تقني (ملابس، مكياج، مواقع، إلخ)، مجال تركيزه، وقواعد الاستخراج.

### `breakdownAgents.ts`

- **الدور**: منسّق الوكلاء (Orchestrator)
- **الوظيفة**: دالة `runAllBreakdownAgents()` تشغّل جميع الوكلاء التقنيين بالتوازي وتجمع نتائجهم في كائن `SceneBreakdown` واحد (بدون cast).

### `castAgent.ts`

- **الدور**: ملف إعادة تصدير لوحدة castAgent
- **الوظيفة**: يُعيد تصدير كل شيء من `./castAgent/index` للتوافق مع الإصدارات السابقة بعد إعادة هيكلة الكود.

### `castService.ts`

- **الدور**: خدمة تحليل طاقم التمثيل عالية المستوى
- **الوظيفة**: يوفر `analyzeCastEnhanced()` للتحليل المتقدم، `exportCastToCSV()`, `exportCastToJSON()`, `generateCastingCall()` مع تطبيع النص العربي.

---

## 5. وكلاء التحليل التقنيين (services/\*Agent.ts)

> كل وكيل يتبع نفس النمط: يتصل بـ Gemini AI مع prompt متخصص ويعيد `string[]`.

| الملف                | الدور                 | ما يستخرجه                                        |
| -------------------- | --------------------- | ------------------------------------------------- |
| `costumeAgent.ts`    | وكيل الملابس          | الأزياء، الإكسسوارات، حالة الملابس                |
| `makeupHairAgent.ts` | وكيل المكياج والشعر   | مستحضرات التجميل، الجروح، تسريحات الشعر           |
| `propsAgent.ts`      | وكيل الإكسسوارات      | الأدوات المحمولة والأشياء التي يتفاعل معها الممثل |
| `vehiclesAgent.ts`   | وكيل المركبات         | السيارات، الدراجات، القوارب، الطائرات             |
| `locationsAgent.ts`  | وكيل المواقع          | أماكن التصوير والديكورات                          |
| `extrasAgent.ts`     | وكيل الكومبارس        | الأشخاص في الخلفية ومتطلباتهم                     |
| `stuntsAgent.ts`     | وكيل المشاهد الخطرة   | الحركات الخطرة ومتطلبات السلامة                   |
| `animalsAgent.ts`    | وكيل الحيوانات        | الحيوانات الحية المطلوبة في المشهد                |
| `spfxAgent.ts`       | وكيل المؤثرات العملية | الانفجارات، الدخان، المطر، النار                  |
| `vfxAgent.ts`        | وكيل المؤثرات البصرية | CGI، الشاشات الخضراء، التركيبات الرقمية           |
| `graphicsAgent.ts`   | وكيل الجرافيكس        | اللافتات، الشاشات، العناصر المرئية                |

---

## 6. وحدة تحليل الشخصيات (services/castAgent/)

### `index.ts`

- **الدور**: نقطة تصدير موحدة للوحدة
- **الوظيفة**: يُعيد تصدير جميع الأنواع والدوال من ملفات الوحدة الفرعية.

### `types.ts`

- **الدور**: تعريفات TypeScript لتحليل الشخصيات
- **الوظيفة**: يُعرّف `CharacterProfile`, `EmotionStats`, `AnalysisResult`, `SceneData`, `MergeSuggestion`, `Connection` وغيرها.

### `constants.ts`

- **الدور**: ثوابت NLP وقوائم الكلمات المفتاحية
- **الوظيفة**: يحتوي على `GROUP_KEYWORDS`, `GENERIC_KEYWORDS`, `EMOTION_KEYWORDS`, `MALE_PATTERNS`, `FEMALE_PATTERNS`, `TRANSITIONS` — بالعربية والإنجليزية.

### `parser.ts`

- **الدور**: دوال تحليل النص و NLP
- **الوظيفة**: يوفر `normalizeArabic()`, `isSceneHeading()`, `isTransition()`, `isLikelyCharacter()`, `parseNameHeader()`, `extractSceneLocation()` لمعالجة نصوص السيناريو.

### `analyzer.ts`

- **الدور**: دوال تحليل الشخصيات والعواطف
- **الوظيفة**: يوفر `analyzeEmotion()`, `analyzeGenderAndConflict()`, `generateCharacterTags()`, `calculateConnections()`, `generateMergeSuggestions()`.

### `scriptAnalyzer.ts`

- **الدور**: محرك التحليل المحلي الرئيسي
- **الوظيفة**: يحلل السكريبت كاملاً محلياً (بدون AI) لاستخراج الشخصيات وإحصائياتها باستخدام الـ parser و analyzer.

### `aiAgent.ts`

- **الدور**: تكامل Google GenAI لتحليل الشخصيات
- **الوظيفة**: يستخدم Gemini AI لتحليل متقدم للشخصيات يتجاوز قدرات التحليل المحلي (NLP).

### `exporter.ts`

- **الدور**: مولّد تنسيقات التصدير
- **الوظيفة**: يوفر `exportToCSV()` و `exportToJSON()` لتصدير نتائج التحليل.

---

## 7. ملفات التوثيق

| الملف                        | الوصف                          |
| ---------------------------- | ------------------------------ |
| `README.md`                  | التوثيق الرئيسي للوحدة         |
| `QUICK_START.md`             | دليل البدء السريع              |
| `TECHNICAL_DOCUMENTATION.md` | التوثيق التقني التفصيلي        |
| `INTEGRATION_GUIDE.md`       | دليل التكامل مع الأنظمة الأخرى |
| `DEPLOYMENT_STATUS.md`       | حالة النشر الحالية             |
| `FIXES_SUMMARY.md`           | ملخص الإصلاحات المطبقة         |

---

## 8. خريطة التبعيات

```
page.tsx
├── App.tsx (مساحة التفكيك)
│   ├── hooks/useScriptProcessor.ts → geminiService.ts → Gemini AI
│   ├── hooks/useSceneManager.ts → geminiService.ts → Gemini AI
│   ├── hooks/useToast.ts
│   ├── components/ResultsView.tsx
│   │   ├── components/AgentCard.tsx
│   │   ├── components/CastBreakdownView.tsx → castService.ts
│   │   ├── components/ScenarioNavigator.tsx
│   │   └── components/ToastContainer.tsx
│   └── components/ChatBot.tsx
│       ├── hooks/useChatSession.ts → geminiService.ts
│       └── components/ChatMessage.tsx
│
├── breakdown-content.tsx (التقرير)
│   ├── breakdown-report.ts → schemas.ts (Zod)
│   └── breakdown-ui.tsx
│
├── services/geminiService.ts (المحور المركزي)
│   ├── services/breakdownAgents.ts (المنسّق)
│   │   ├── costumeAgent.ts
│   │   ├── makeupHairAgent.ts
│   │   ├── propsAgent.ts
│   │   ├── vehiclesAgent.ts
│   │   ├── locationsAgent.ts
│   │   ├── extrasAgent.ts
│   │   ├── stuntsAgent.ts
│   │   ├── animalsAgent.ts
│   │   ├── spfxAgent.ts
│   │   ├── vfxAgent.ts
│   │   └── graphicsAgent.ts
│   └── services/castService.ts → castAgent/
│       ├── castAgent/scriptAnalyzer.ts (تحليل محلي)
│       ├── castAgent/aiAgent.ts (تحليل AI)
│       ├── castAgent/parser.ts
│       ├── castAgent/analyzer.ts
│       ├── castAgent/constants.ts
│       ├── castAgent/types.ts
│       └── castAgent/exporter.ts
│
└── الأنواع والإعدادات
    ├── types.ts
    ├── schemas.ts
    ├── config.ts
    └── constants.tsx
```

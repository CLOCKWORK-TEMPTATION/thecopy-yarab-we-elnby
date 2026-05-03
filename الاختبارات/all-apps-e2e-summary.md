# الملخص الجامع لاختبارات E2E الميدانية — جلسة 2026-05-01

**النطاق:** 12 تطبيقًا/صفحة من منصة `the copy` على `https://www.thecopy.app`
**حالة المستخدم:** غير مسجَّل (Anonymous) فقط — وفق طلب المستخدم
**أداة التنفيذ:** `Claude in Chrome MCP`
**النشر المرصود:** `dpl_9LN2r7HveA7SBAd53aDKVayzHeQM` ثم `dpl_9JVFeWoAQqgptsx3LQgsUqz5wesd`

---

## جدول الملخص

| التطبيق | إجمالي | ناجح | فاشل | محجوب | غير موجود | أخطر فشل | Production-Ready؟ |
|---|---|---|---|---|---|---|---|
| **actorai-arabic** | 39 | 14 | 5 | 12 | 8 | زرّا `حلل النص` و `تحليل الإيقاع` لا يطلقان أي طلب API — فشل صامت + فقدان محتوى textarea بعد reload + FCP 3524-5560ms | **لا** |
| **analysis** | 36 | 12 | 8 | 6 | 10 | تناقض تفويض: `POST /start` = 200 لكن `GET /stream` و `/snapshot` = **403** — التحليل يبدأ على الخادم ولا يُستلم في الواجهة، شريط التقدم عالق عند 5% بلا رسالة خطأ + FCP 7400ms | **لا** |
| **art-director** | 42 | 12 | 1 | 5 | 24 | FCP = **8556ms** الأبطأ في هذا التطبيق + تلوث قاعدة الإنتاج ببيانات اختبار (`قصر الاختبار {timestamp}`) + عدم عزل بيانات المستخدمين المجهولين | **شبه** (الأقرب لـ Production من الباقي) |
| **brain-storm-ai** | 35 | 17 | 1 | 5 | 12 | FCP = **11548ms** الأبطأ في الجولة كلها + زمن استجابة POST 7-8s بدون مؤشر loading واضح | **شبه** (الأكثر اكتمالًا وظيفيًا — وكلاء AI يولدون محتوى عربي حقيقي) |
| **BREAKAPP** | 40 | 16 | 3 | 12 | 9 | زمن التوجيه الإجمالي ~11s (`Redirect in progress` 5s + FCP صفحة QR 6608ms) + رسالة `Network Error` عامة جدًا | **شبه** (بوابة QR Login تعمل وظيفيًا، 404 احترافية) |
| **breakdown** | 44 | 9 | 7 | 6 | 22 | `POST /api/breakdown/projects/{uuid}/analyze` = **500 Internal Server Error** بعد bootstrap ناجح (201)، فشل صامت في الواجهة + FCP 10132ms | **لا** |
| **BUDGET** | 43 | 14 | 2 | 6 | 21 | كشف مسارات API الداخلية في الواجهة (`نتاج: /api/budget/analyze` و `/api/budget/generate` كـ subtitles) + FCP 10564ms | **شبه** (analyze + generate كلاهما 200 ويولدان محتوى عربي مفصل) |
| **cinematography-studio** | 45 | 17 | 2 | 7 | 19 | FCP = **9712ms** + التطبيق client-side تمامًا (لا backend AI رغم اسم `Vision CineAI`) | **شبه** (dashboard فاخر، WebGL مفعَّل، حفظ LS) |
| **development** | 46 | 9 | 5 | 7 | 25 | تنفيذ `إكمال النص` يُرجع **empty response** (`نفّذت المهمة لكن لم تُرجع أي محتوى`) + FCP **11452ms** الثاني الأبطأ | **لا** (كتالوج 27 أداة لكن أداة التجربة فشلت) |
| **/editor** | 13 | 6 | 4 | 0 | 0 | PDF Export معطل (`oklch()` parsing) + schema تصنيف غير قياسي (`basmala` + `scene_header_*` بدل slugline/action/character/dialogue) + فقدان نص طويل صامت (5440→113 بعد 4s) + فتح ملف فشل صامت + إعادة تصنيف يُفسد التصنيفات | **لا** (محدّث 2026-05-03 بعد رفع حاجز المصادقة) |
| **directors-studio** | 43 | 8 | 1 | 10 | 24 | FCP = **11524ms** + كل أزرار `فتح المحرر` تحيل إلى `/editor` المحجوب | **شبه** (dashboard فقط، الديمو بمشهدين يعمل) |
| **styleIST** | 46 | 8 | 2 | 9 | 27 | FCP = 9124ms + ادعاء `RENDER: THREE.JS r158` بدون canvas WebGL فعلية (ديكوري) | **شبه** (cockpit cinematic فاخر، Inspector + Timeline) |

---

## الإجماليات

| البند | العدد |
|---|---|
| إجمالي الحالات عبر التطبيقات | **473** |
| ناجح | **134** |
| فاشل | **38** |
| محجوب | **101** |
| غير موجود | **200** |

---

## التطبيقات حسب الجاهزية

### **ليس Production-Ready** (5):
1. **actorai-arabic** — أزرار التحليل صامتة، فقدان البيانات
2. **analysis** — 403 على stream/snapshot، شريط 5% عالق
3. **breakdown** — 500 على analyze، فشل صامت
4. **development** — empty response من 27 أداة
5. **/editor** — PDF export معطل + schema تصنيف غير قياسي + فقدان نص طويل (محدّث 2026-05-03)

### **شبه Production-Ready** (7):
1. **art-director** — APIs تعمل (200)، CRUD كامل، XSS معقّم
2. **brain-storm-ai** — وكلاء يولدون محتوى عربي حقيقي
3. **BREAKAPP** — بوابة QR + 404 احترافية
4. **BUDGET** — analyze + generate كلاهما 200 ينتج محتوى مفصل
5. **cinematography-studio** — dashboard cinematic مع WebGL
6. **directors-studio** — dashboard مع ديمو متعدد المشاهد
7. **styleIST** — cockpit cinematic فاخر

### **معاقة بحاجز مصادقة** (0):
لا توجد بعد رفع حاجز `/editor` في 2026-05-03.

---

## أنماط مشتركة عبر التطبيقات

1. **FCP بطيء جدًا في كل التطبيقات** — يتراوح من 3524ms (actorai-arabic أسرع حالة) إلى 11548ms (brain-storm-ai الأبطأ). لا تطبيق واحد يحقق العتبة المقبولة (<2500ms).
2. **Backend يقبل المجهول بدون auth أو rate limiting** على معظم نقاط `POST` (analyze, generate, brainstorm, locations/add) — خطر استنزاف LLM tokens ومخاطر abuse.
3. **localStorage مشترك same-origin** — كل التطبيقات تتسرب مفاتيحها لبعضها (filmlane.* و the-copy.* و brainstorm_* و breakdown_tour_done...) — لا namespace isolation.
4. **XSS معقّم بشكل سليم** عبر كل التطبيقات (React/Next escaping يعمل) — نقطة قوة موحَّدة.
5. **Sentry monitoring مفعَّل** عبر كل التطبيقات — `POST /monitoring?o=4511284205453312...`.
6. **رسائل الخطأ العامة `Network Error`** أو الفشل الصامت تنتشر — تجربة مستخدم متدنية عند الفشل.

---

## أعلى 5 توصيات إصلاح ذات أولوية عبر المنصة

1. **خفض FCP إلى أقل من 2500ms في كل التطبيقات** — مراجعة JS bundle، تأجيل تحميل الميزات غير الأساسية.
2. **إصلاح تناقضات التفويض** — توحيد سياسة auth بين `/start` و `/stream` و `/snapshot` في analysis، وإصلاح 500 في breakdown، و empty response في development.
3. **إضافة معالج خطأ موحَّد** يتمايز بين 401/403/500 ويعرض رسائل مفهومة (يلزم تسجيل دخول، الخادم مشغول، إلخ).
4. **عزل بيانات المستخدمين المجهولين** — إما إجبار التسجيل أو session-scoped data، خاصة في art-director (تلوث قاعدة الإنتاج).
5. **إخفاء مسارات API من UI** — خاصة في BUDGET (`نتاج: /api/budget/analyze` ظاهر للمستخدم).

---

## ملاحظة منهجية

- التقارير القديمة في مجلد `الاختبارات/` كلها أُعيدت كتابتها بأدلة تشغيلية فعلية. ادعاءات النجاح القديمة في كل تطبيق تقريبًا تبيَّن أنها مدحوضة جزئيًا أو كليًا عند الاختبار الميداني الفعلي.
- اختبار المستخدم المسجَّل خارج نطاق هذه الجولة بقرار المستخدم في البداية.
- اختبارات Console و Cookies و Axe و Lighthouse و Offline محجوبة بمحدودية أداة Chrome MCP — موثَّقة بدقة في كل تقرير.

**الملفات الناتجة:** 12 تقريرًا منفصلًا + هذا الملف الجامع، كلها في
`C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\الاختبارات\`
.

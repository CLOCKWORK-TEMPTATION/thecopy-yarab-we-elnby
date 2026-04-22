<!-- markdownlint-disable -->

# ActorAI Arabic - استوديو الممثل الذكي

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**استوديو ذكي متكامل لتمارين التمثيل والتدريب الفني للممثلين العرب**

[المميزات](#-المميزات) • [التثبيت](#-التثبيت) • [الاستخدام](#-الاستخدام) • [الهيكل](#-الهيكل-المعماري) • [المساهمة](#-المساهمة) • [الترخيص](#-الترخيص)

</div>

---

## ١. نظرة عامة على المشروع

### الوصف

**ActorAI Arabic** هو استوديو ذكي متكامل لتمارين التمثيل والتدريب الفني للممثلين العرب، حيث يجمع بين تقنيات الذكاء الاصطناعي المتقدمة وأدوات التدريب التقليدية لمساعدة الممثلين على تطوير مهاراتهم الصوتية والأدائية.

يعتمد التطبيق على أحدث تقنيات تحليل الصوت والفيديو وتقديم الملاحظات الفورية، مما يتيح للممثلين التدرب بشكل مستقل وتحسين أدائهم في مختلف أنواع الأدوار التمثيلية. يدعم التطبيق اللغة العربية بالكامل مع الحفاظ على التوافق مع المعايير الدولية في مجال التدريب التمثيلي.

### المشكلة التي يحلها

صعوبة الوصول للتدريب التمثيلي الاحترافي كانت حكراً على الاستوديوهات والمدارس الكبرى. يوفر هذا التطبيق أدوات كانت حكراً على الاحترافيين لجميع المستخدمين عبر واجهة عربية سهلة الاستخدام.

### الجمهور المستهدف

- الممثلون المبتدئون الذين يريدون تطوير مهاراتهم
- الطلاب في المعاهد والكليات التمثيلية
- المحترفون الذين يريدون تحسين أدائهم
- المعلمون والمدربون التمثيليون

---

## ٢. المميزات الرئيسية

### 🎤 تحليل الصوت اللحظي

- قياس طبقة الصوت (Pitch) ومستواه
- تحليل شدة الصوت ومستوى الضغط الصوتي
- تتبع سرعة الكلام (كلمة/دقيقة)
- تقييم وضوح المخارج والنطق
- مراقبة أنماط التنفس أثناء الأداء
- تحليل الوقفات الدرامية وتوقيتها

### 📹 تحليل الأداء البصري

- تتبع اتجاه النظر وحركة العين
- تحليل تعبيرات الوجه ومزامنتها مع النص
- مراقبة معدل الرمش ومؤشر التوتر
- تقييم استخدام المساحة على الشاشة
- تقديم اقتراحات لتحسين الأداء الحركي

### 🧠 أدوات الحفظ الذكي

- نظام حذف كلمات عشوائي حسب مستوى الصعوبة
- اكتشاف التردد وتقديم التلقين التلقائي
- تتبع نقاط الضعف والإحصائيات التفصيلية
- دعم النصوص العربية الطويلة

### 🎬 جناح السيلف تيب

-Teleprompter معلق مع تحكم بالإيماءات

- علامات تحديد مواقع الحركة (Blocking)
- إطارات الكاميرا لنظرة احترافية
- مؤقتات العد التنازلي والتسجيل

### 🎭 مدرب الصوت التفاعلي

- تمارين التنفس العميق
- تمارين النطق والإسقاط الصوتي
- تمارين الرنين وأعاصير اللسان
- تحليل لحظي مع ملاحظات فورية

---

## ٣. المتطلبات التقنية

### المتطلبات الأساسية

| المطلب  | الحد الأدنى | الموصى به |
| ------- | ----------- | --------- |
| Node.js | 24.x        | 24.x      |
| pnpm    | 8.x         | 10.x      |
| npm     | 9.x         | 10.x      |

### المتصفحات المدعومة

- Google Chrome (آخر إصدارين)
- Mozilla Firefox (آخر إصدارين)
- Apple Safari (آخر إصدارين)
- Microsoft Edge (آخر إصدارين)

**ملاحظة**: المتصفح يجب أن يدعم Web Audio API و MediaDevices API.

### الأجهزة المطلوبة

- كاميرا ويب (مدمجة أو خارجية)
- ميكروفون خارجي أو ميكروفون جهاز عالي الجودة
- ذاكرة وصول عشوائي ٤ جيجابايت كحد أدنى
- اتصال إنترنت مستقر للتحميل

---

## ٤. التثبيت

### الخطوة ١: استنساخ المستودع

```bash
git clone https://github.com/your-org/actorai-arabic.git
cd actorai-arabic
```

### الخطوة ٢: تثبيت التبعيات

```bash
# باستخدام pnpm (موصى به)
pnpm install

# أو باستخدام npm
npm install
```

### الخطوة ٣: إعداد المتغيرات البيئية

أنشئ ملف `.env.local` في الجذر:

```env
# إعدادات التطبيق
NEXT_PUBLIC_APP_NAME=ActorAI Arabic
NEXT_PUBLIC_APP_URL=http://localhost:3000

# مفاتيح API (اختياري)
# OPENAI_API_KEY=your-api-key
```

### الخطوة ٤: تشغيل خادم التطوير

```bash
pnpm dev
```

افتح المتصفح على `http://localhost:3000/actorai-arabic`

---

## ٥. الأوامر المتاحة

### أوامر التطوير

```bash
# تشغيل خادم التطوير
pnpm dev

# تشغيل خادم الإنتاج
pnpm start

# بناء التطبيق للإنتاج
pnpm build

# تحليل حجم الحزمة
pnpm analyze
```

### أوامر الجودة

```bash
# فحص الأنواع
pnpm typecheck

# فحص الكود
pnpm lint

# تنسيق الكود
pnpm format

# تشغيل الاختبارات
pnpm test
```

---

## ٦. هيكل المشروع

```
actorai-arabic/
├── page.tsx                    # الصفحة الرئيسية للتطبيق
├── types/
│   ├── index.ts               # تعريفات الأنواع والواجهات
│   └── constants.ts           # الثوابت والقيم الافتراضية
├── hooks/
│   ├── index.ts              # تصدير جميع الـ Hooks
│   ├── useWebcamAnalysis.ts  # تحليل تعبيرات الوجه والحركة
│   ├── useVoiceAnalytics.ts  # تحليل الصوت والنطق
│   ├── useNotification.ts    # نظام الإشعارات
│   └── useMemorization.ts    # أدوات حفظ النصوص
├── components/
│   ├── ActorAiArabicStudio.tsx  # المكون الرئيسي للاستوديو
│   └── VoiceCoach.tsx           # مدرب الصوت
├── self-tape-suite/
│   ├── page.tsx                # صفحة جناح السيلف تيب
│   └── components/
│       └── SelfTapeSuite.tsx   # مكون السيلف تيب
└── docs/                       # التوثيق
    ├── PROGRESS.md
    ├── CORE_MECHANISM.md
    └── FILE_RELATIONS.md
```

---

## ٧. الواجهات البرمجية (API)

### Hooks المتاحة

#### useVoiceAnalytics

محلل صوت لحظي يقيس:

```typescript
const {
  isListening,
  metrics,
  waveformData,
  frequencyData,
  startListening,
  stopListening,
  reset,
} = useVoiceAnalytics();
```

**المقاييس المتاحة:**

- `pitch`: طبقة الصوت (Hz)
- `volume`: شدة الصوت (dB)
- `speechRate`: سرعة الكلام (كلمة/دقيقة)
- `articulation`: وضوح المخارج (٠-١٠٠)
- `breathing`: أنماط التنفس
- `pauses`: الوقفات الدرامية

#### useWebcamAnalysis

محلل أداء بصري بالكاميرا:

```typescript
const { state, videoRef, requestPermission, startAnalysis, stopAnalysis } =
  useWebcamAnalysis();
```

#### useMemorization

أداة حفظ النصوص:

```typescript
const {
  state,
  setScript,
  startSession,
  handleInput,
  submitAnswer,
  processTextForDisplay,
} = useMemorization();
```

#### useNotification

نظام الإشعارات:

```typescript
const { notification, showSuccess, showError, showInfo } = useNotification();
```

---

## ٨. أنواع البيانات (TypeScript)

### الأنواع الرئيسية

```typescript
// تمرين صوتي
interface VocalExercise {
  id: string;
  name: string;
  description: string;
  duration: string;
  category: "breathing" | "articulation" | "projection" | "resonance";
}

// نتيجة تحليل الكاميرا
interface WebcamAnalysisResult {
  eyeLine: { direction: EyeDirection; consistency: number };
  expressionSync: { score: number; matchedEmotions: string[] };
  blinkRate: { rate: number; status: BlinkRateStatus };
  blocking: { spaceUsage: number; movements: string[] };
  overallScore: number;
}

// إحصائيات الحفظ
interface MemorizationStats {
  totalAttempts: number;
  correctWords: number;
  incorrectWords: number;
  weakPoints: string[];
  averageResponseTime: number;
}
```

لمزيد من التفاصيل، راجع `types/index.ts`

---

## ٩. المنهجيات التمثيلية المدعومة

### ١. طريقة ستانيسلافسكي

طريقة ستانيسلافسكي Konstantin Stanislavski emphasize العاطفة والواقعية. يستخدم الممثل تجاربه الشخصية لخلق أداءات حقيقية باستخدام تمارين مثل "إذا كان" و"السحر إذا".

### ٢. تقنية مايسنر

طوّرها Sanford Meisner وتركز على تمارين "التكرار" حيث يتفاعل الممثلون مع سلوكياتهم الحقيقية بدلاً من الاستجابات المخططة مسبقاً.

### ٣. تقنية تشيخوف

Michael Chekhov يقدم أدوات نفسية-جسدية للخلق الشخصي والتعبير العاطفي من خلال الجسم.

### ٤. طريقة أوتا هاغن

Uta Hagen تعتمد على مبدأ "الواقعية" مع تمارين "البدائل" لاستبدال العناصر الخيالية بعناصر حقيقية.

### ٥. الجماليات العملية

David Mamet تعتمد على تحليل النص لفهم بنية المشهد والحركة.

---

## ١٠. ميزات الواقع المعزز

### Teleprompter معلق

- التمرير التلقائي الموجه بالنظر
- تمييز السطر الحالي
- تخصيص السرعة والحجم

### علامات Blocking

- علامات ثلاثية الأبعاد لتحديد مواقع الحركة
- مكتبات أنماط جاهزة

### عين الكاميرا

- إطارات لنظرة احترافية
- دعم نسب العرض المختلفة (١٦:٩، ٢.٣٥:١، ٤:٣)

### الشريك الهولوغرافي

- شخصية ثلاثية الأبعاد للتدريب
- تخصيص المشاعر والسلوك

### التحكم بالإيماءات

- التحكم بالعين واليد والرأس
- أوامر صوتية

---

## ١١. حالات الاستخدام

### استخدام ١: تدريب الصوت

```tsx
import VoiceCoach from "./components/VoiceCoach";

function VocalTrainingPage() {
  return (
    <div>
      <VoiceCoach />
    </div>
  );
}
```

### استخدام ٢: تحليل الأداء

```tsx
import { useWebcamAnalysis } from "./hooks";

function PerformanceAnalysis() {
  const { state, videoRef, requestPermission, startAnalysis } =
    useWebcamAnalysis();

  return (
    <div>
      <video ref={videoRef} autoPlay muted />
      <button onClick={requestPermission}>تفعيل الكاميرا</button>
      <button onClick={startAnalysis}>بدء التحليل</button>
    </div>
  );
}
```

### استخدام ٣: حفظ النص

```tsx
import { useMemorization } from "./hooks";

function MemorizationPractice() {
  const { state, setScript, startSession, handleInput, submitAnswer } =
    useMemorization();

  return (
    <div>
      <textarea onChange={(e) => setScript(e.target.value)} />
      <button onClick={() => startSession()}>بدء</button>
      <input onChange={(e) => handleInput(e.target.value)} />
      <button onClick={() => submitAnswer()}>تحقق</button>
    </div>
  );
}
```

---

## ١٢. الاختبارات

### تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
pnpm test

# تشغيل في وضع المراقبة
pnpm test:watch

# تغطية الكود
pnpm test:coverage
```

### هيكل الاختبارات

```
__tests__/
├── hooks/
│   ├── useVoiceAnalytics.test.ts
│   ├── useWebcamAnalysis.test.ts
│   └── useMemorization.test.ts
├── components/
│   └── VoiceCoach.test.tsx
└── utils/
    └── helpers.test.ts
```

---

## ١٣. الأسئلة الشائعة

### س: لماذا لا تعمل الكاميرا/الميكروفون؟

ج: تأكد من:

- السماح بالوصول في إعدادات المتصفح
- عدم استخدام التطبيقات الأخرى للجهاز
- صحة توصيل الجهاز

### س: هل بياناتي مخزنة على الخادم؟

ج: لا، جميع البيانات مخزنة محلياً في متصفحك ولا تُرسل لأي خادم.

### س: كيف أستخدم Teleprompter؟

ج:

- انتقل إلى وضع السيلف تيب
- أدخل النص المراد
- استخدم الإيماءات للتحكم (النظر للأعلى للتمرير)

### س: هل يعمل التطبيق على الهاتف؟

ج: نعم، لكن الميزات الكاملة تتطلب كمبيوتر مع كاميرا وميكروفون خارجيين.

---

## ١٤. المساهمة في المشروع

### خطوات المساهمة

١. استنساخ المستودع
٢. إنشاء فرع جديد `git checkout -b feature/your-feature`
٣. إجراء التغييرات
٤. كتابة الاختبارات
٥. إرسال Pull Request

### معايير الكود

- استخدام TypeScript，严格 -遵守 React Hooks قواعد
- كتابة توثيق JSDoc -遵守 تنسيق الكود مع Prettier

### رخصة المساهمة

بإرسال Pull Request، توافق على نشر مساهمتك تحت رخصة MIT.

---

## ١٥. الدعم والتواصل

### قنوات الدعم

- **Discord**: رابط الدعوة
- **Twitter**: @ActorAIArabic
- **البريد الإلكتروني**: support@actorai.example.com

### الإبلاغ عن المشاكل

استخدم GitHub Issues للإبلاغ عن:

- أخطاء البرمجة
- طلبات الميزات
- تحسينات التوثيق

---

## ١٦. التحديثات والتغييرات

### سجل التغييرات

**الإصدار ١.٠.٠** (قيد التطوير)

- إضافة تحليل الصوت اللحظي
- إضافة تحليل الكاميرا
- إضافة أدوات الحفظ الذكي
- إضافة جناح السيلف تيب
- إضافة مدرب الصوت التفاعلي

---

## ١٧. القيود والخصوصية

### القيود

- يتطلب إذن الكاميرا والميكروفون
- لا يعمل بدون اتصال بالإنترنت (بعض الميزات)
- يتطلب متصفحاً حديثاً

### الخصوصية

- جميع البيانات مخزنة محلياً
- لا يُستخدم للذكاء الاصطناعي
- لا مشاركة بيانات مع أطراف خارجية
- يمكنك حذف جميع البيانات من المتصفح

---

## ١٨. الاعتمادات

### التقنيات المستخدمة

- [Next.js](https://nextjs.org/) - إطار العمل
- [React](https://react.dev/) - مكتبة الواجهة
- [TypeScript](https://www.typescriptlang.org/) - اللغة
- [Tailwind CSS](https://tailwindcss.com/) - الأنماط
- [shadcn/ui](https://ui.shadcn.com/) - المكونات

### شكر خاص

- فريق التطوير
- المختبريين الأوائل
- المجتمع العربي التقني

---

## ١٩. الترخيص

<div align="center">

MIT License - انظر ملف [LICENSE](./LICENSE) للتفاصيل.

**حقوق النشر © ٢٠٢٤ ActorAI Arabic**

</div>

---

## 📞 الاتصال

للأسئلة والتواصل:

- البريد الإلكتروني: info@actorai.example.com
- الموقع: https://actorai.example.com

---

<div align="center">

**صنع بـ ❤️ للممثلين العرب**

</div>

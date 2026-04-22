<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BreakBreak AI - Script Breakdown Assistant

تطبيق ويب يستخدم الذكاء الاصطناعي لتحليل وتفريغ السيناريوهات السينمائية تلقائياً.

## الميزات

✨ **تفريغ السيناريو التلقائي** - تقسيم السيناريو إلى مشاهد منفصلة
🎭 **تحليل الشخصيات** - استخراج معلومات الممثلين والشخصيات
🎬 **تحليل الإنتاج** - تحليل تكاليف، الأزياء، الديكور، الحيوانات، والمؤثرات
💡 **مساعد ذكي** - chatbot متخصص في الاستفسارات الإنتاجية
🔄 **إدارة النسخ** - حفظ واستعادة نسخ سابقة من التحليلات

## المتطلبات المسبقة

- **Node.js** (الإصدار 16 أو أحدث)
- **Gemini API Key** - احصل عليه من [Google AI Studio](https://aistudio.google.com/apikey)

## التثبيت والتشغيل

### 1. تثبيت المتعلقات

```bash
npm install
```

### 2. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env.local` واملأ قيمتك:

```bash
cp .env.example .env.local
```

ثم عدّل `.env.local`:

```dotenv
GEMINI_API_KEY=your_actual_api_key_here
```

⚠️ **تحذير أمني**: لا تشارك مفتاح API الخاص بك في الكود المصدري أو في الـ Git.

### 3. تشغيل التطبيق في وضع التطوير

```bash
npm run dev
```

التطبيق سيكون متاحاً على `http://localhost:3000`

### 4. البناء للإنتاج

```bash
npm run build
```

## استكشاف الأخطاء

### الخطأ: "GEMINI_API_KEY is required"

**السبب**: لم يتم تعيين مفتاح API.

**الحل**:

1. تأكد من وجود ملف `.env.local`
2. تحقق من أن `GEMINI_API_KEY` يحتوي على قيمة صحيحة
3. تجنب استخدام كلمات مثل `PLACEHOLDER` أو `your_key_here`

### الخطأ: "Failed to segment script"

**السبب**:

- مفتاح API غير صحيح
- الاتصال بالإنترنت معطل
- السيناريو بصيغة غير صحيحة

**الحل**:

1. تحقق من صحة مفتاح API
2. تأكد من الاتصال بالإنترنت
3. تحقق من تنسيق السيناريو (يجب أن يكون بصيغة standard screenplay)

### الخطأ: في ChatBot "خدمة الذكاء الاصطناعي غير متاحة"

**السبب**: فشل تهيئة جلسة الدردشة.

**الحل**:

1. افتح جهاز الكمبيوتر (F12) وتحقق من رسائل الخطأ
2. تأكد من أن مفتاح API صحيح
3. جرب إعادة تحميل الصفحة

## البنية المشروع

```
src/
├── App.tsx                 # المكون الرئيسي
├── config.ts              # إعدادات التطبيق والتحقق
├── types.ts               # تعريفات TypeScript
├── constants.tsx          # ثوابت الوكلاء والإعدادات
├── index.html             # ملف HTML الرئيسي
├── components/            # مكونات React
│   ├── ResultsView.tsx
│   ├── ChatBot.tsx
│   ├── AgentCard.tsx
│   └── ...
├── services/              # خدمات الذكاء الاصطناعي
│   ├── geminiService.ts   # الخدمة الرئيسية
│   ├── castService.ts     # تحليل الشخصيات
│   ├── breakdownAgents.ts # تنسيق الوكلاء
│   └── [agentName]Agent.ts # وكلاء متخصصون
└── ...
```

## مراجع إضافية

- [Google Gemini API Docs](https://ai.google.dev/api/python/google/generativeai)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

## الترخيص

هذا المشروع مفتوح المصدر ومتاح تحت رخصة MIT.

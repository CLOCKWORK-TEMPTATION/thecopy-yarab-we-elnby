# FilmBudget AI Pro - Application Budget

تطبيق احترافي لإنشاء ميزانيات الأفلام باستخدام الذكاء الاصطناعي (Google Gemini 2.0)

## المميزات الرئيسية

- 🎬 توليد ميزانيات احترافية من السيناريو تلقائياً
- 🤖 تحليل متقدم باستخدام Google Gemini AI
- 📊 رسوم بيانية وتحليلات مفصلة
- 📁 تصدير بصيغ متعددة (PDF, Excel)
- 🌍 دعم اللغة العربية بالكامل
- 💾 حفظ واستعادة المشاريع
- 📱 واجهة متجاوبة مع جميع الأجهزة

## التثبيت والتشغيل

### المتطلبات

- Node.js 18 أو أحدث
- npm أو yarn أو pnpm

### خطوات التثبيت

1. تثبيت المكتبات:

```bash
npm install
# أو
yarn install
# أو
pnpm install
```

2. إعداد ملف البيئة:

```bash
cp .env.example .env.local
```

3. إضافة مفتاح Gemini API في ملف `.env.local`:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

احصل على مفتاح API من: https://makersuite.google.com/app/apikey

4. تشغيل التطبيق:

```bash
npm run dev
# أو
yarn dev
# أو
pnpm dev
```

5. افتح المتصفح على: http://localhost:3000

## البنية التقنية

- **Framework**: Next.js 15.3.5 + React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **AI**: Google Gemini 2.0 Flash
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## الاستخدام

### 1. إدخال السيناريو

أدخل عنوان الفيلم ووصف السيناريو أو النص الكامل

### 2. التحليل المتقدم (اختياري)

احصل على تحليل مفصل للمتطلبات الإنتاجية، المخاطر، والتوصيات

### 3. إنشاء الميزانية

انقر على "إنشاء الميزانية الكاملة" وانتظر حتى يقوم الذكاء الاصطناعي بتوليد الميزانية

### 4. التعديل والتخصيص

عدّل أي بند في الميزانية، أضف ملاحظات، واستخدم الأدوات المتقدمة

### 5. التصدير

صدّر الميزانية كملف PDF أو Excel

## البنية الهيكلية

```
BUDGET/
├── app/
│   ├── api/
│   │   └── budget/
│   │       ├── generate/route.ts    # API لتوليد الميزانية
│   │       └── export/route.ts      # API للتصدير
│   ├── layout.tsx                   # التخطيط الرئيسي
│   ├── page.tsx                     # الصفحة الرئيسية
│   └── globals.css                  # الأنماط العامة
├── components/
│   ├── BudgetApp.tsx                # المكون الرئيسي للتطبيق
│   ├── ScriptAnalyzer.tsx           # محلل السيناريو
│   ├── BudgetAnalytics.tsx          # التحليلات والإحصائيات
│   ├── DetailView.tsx               # عرض التفاصيل
│   ├── EnhancedChart.tsx            # الرسوم البيانية
│   ├── TemplateSelector.tsx         # اختيار القوالب
│   ├── TopSheet.tsx                 # الورقة العليا
│   ├── ExportModal.tsx              # نافذة التصدير
│   └── ui/                          # مكونات UI الأساسية
├── lib/
│   ├── constants.ts                 # الثوابت والقوالب
│   ├── geminiService.ts             # خدمة Gemini AI
│   ├── types.ts                     # تعريفات TypeScript
│   └── utils.ts                     # دوال مساعدة
└── package.json
```

## الربط بالمنصة الأم

هذا التطبيق جزء من منصة FilmBudget AI Pro الشاملة. للربط بالمنصة الأم:

### خيار 1: استخدام كوحدة مستقلة (Standalone)

التطبيق جاهز للعمل بشكل مستقل بفضل إعداد `output: "standalone"` في next.config.ts

### خيار 2: دمج في تطبيق أكبر

يمكن استيراد المكونات مباشرة:

```tsx
import BudgetApp from "@/components/BudgetApp";

// في أي صفحة أو مكون
function MyPage() {
  return <BudgetApp />;
}
```

### خيار 3: API Integration

استخدم API endpoints للتكامل مع أنظمة أخرى:

```javascript
// توليد ميزانية
const response = await fetch("/api/budget/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Film Title",
    scenario: "Script content...",
  }),
});

const { budget } = await response.json();
```

## المشاكل الشائعة والحلول

### مشكلة: "Gemini API Key is missing"

**الحل**: تأكد من إضافة المفتاح في ملف `.env.local`

### مشكلة: مكونات UI غير موجودة

**الحل**: تم إنشاء جميع مكونات UI المطلوبة في `components/ui/`

### مشكلة: أخطاء TypeScript

**الحل**: تم تفعيل `ignoreBuildErrors: true` في next.config.ts للتطوير السريع

## الترخيص

هذا المشروع مرخص تحت MIT License

## الدعم والمساهمة

للإبلاغ عن مشاكل أو اقتراح تحسينات، يرجى فتح issue في المستودع.

---

© 2026 FilmBudget AI Pro. Powered by Google Gemini 2.0 Flash

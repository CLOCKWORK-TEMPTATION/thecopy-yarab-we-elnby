<!-- markdownlint-disable -->

# Break Break - تطبيق إدارة الإنتاج السينمائي

تطبيق حديث لإدارة الإنتاج السينمائي مع مصادقة (Authentication) قائمة على رمز QR.

## الميزات الرئيسية

- 🔐 مصادقة آمنة باستخدام رمز QR
- 📡 اتصال فوري عبر WebSocket
- 🗺️ تتبع الموقع الجغرافي
- 📱 تصميم متجاوب يعمل على جميع الأجهزة
- 🔄 مزامنة تلقائية مع المنصة الأم

## متطلبات التشغيل

- Node.js 24 أو أحدث
- npm أو yarn

## التثبيت

```bash
# تثبيت الحزم (Packages)
npm install

# نسخ ملف متغيرات البيئة
cp .env.example .env.local
```

## التكوين

قم بتعديل ملف `.env.local` لضبط اتصال المنصة الأم:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## تشغيل التطبيق

```bash
# وضع التطوير (Development)
npm run dev

# بناء للإنتاج (Production Build)
npm run build

# تشغيل الإنتاج
npm start
```

التطبيق سيعمل على: http://localhost:3001

## البنية الأساسية

```
app/
├── (auth)/           # صفحات المصادقة
│   └── login/qr/     # تسجيل الدخول برمز QR
├── dashboard/        # لوحة التحكم الرئيسية
├── (crew)/          # صفحات الطاقم
├── (runner)/        # صفحات المساعدين
└── layout.tsx       # التخطيط الرئيسي

components/
├── scanner/         # مكون قارئ QR
├── maps/           # مكون الخرائط
└── ConnectionTest.tsx  # اختبار الاتصال بالمنصة

hooks/
├── useSocket.ts    # Hook للاتصال بـ Socket.IO
└── useGeolocation.ts  # Hook لتتبع الموقع

lib/
└── auth.ts        # وظائف المصادقة والتوثيق
```

## الاتصال بالمنصة الأم

يتصل التطبيق بالمنصة الأم عبر:

1. **REST API**: للعمليات الأساسية
2. **WebSocket**: للمزامنة الفورية

### اختبار الاتصال

يوفر التطبيق صفحة اختبار الاتصال في لوحة التحكم تعرض:

- حالة اتصال API
- حالة اتصال WebSocket
- رسائل الأخطاء إن وجدت

## المصادقة (Authentication)

يستخدم التطبيق نظام مصادقة ثلاثي:

1. **رمز QR**: يحتوي على معلومات المشروع والمستخدم
2. **Device Hash**: بصمة الجهاز للأمان
3. **JWT Token**: رمز الوصول الآمن

## الأمان

- تخزين آمن للرموز في `localStorage`
- التحقق التلقائي من صلاحية الرموز
- CORS محمي
- اتصال مشفر

## التطوير

### إضافة صفحة جديدة

```typescript
// app/new-page/page.tsx
'use client';

export default function NewPage() {
  return <div>صفحة جديدة</div>;
}
```

### استخدام Socket.IO

```typescript
import { useSocket } from "@/hooks/useSocket";

const { connected, emit, on } = useSocket({
  auth: true, // استخدام التوثيق
});

// إرسال حدث
emit("event-name", { data: "value" });

// استقبال حدث
on("event-name", (data) => {
  console.log(data);
});
```

## استكشاف الأخطاء

### خطأ في الاتصال بالـ API

تأكد من:

- تشغيل المنصة الأم على العنوان الصحيح
- صحة قيمة `NEXT_PUBLIC_API_URL`
- عدم وجود جدار ناري (Firewall) يمنع الاتصال

### خطأ في WebSocket

تأكد من:

- دعم المنصة الأم لـ Socket.IO
- صحة قيمة `NEXT_PUBLIC_SOCKET_URL`
- تفعيل CORS في المنصة الأم

## الترخيص

حقوق النشر محفوظة © 2026 Break Break

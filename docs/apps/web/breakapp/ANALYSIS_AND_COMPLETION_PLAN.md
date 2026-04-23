# BREAKAPP — تقرير تحليلي حاسم وخطة استكمال شاملة

> **النطاق:** `apps/web/src/app/(main)/BREAKAPP/` داخل مونوريبو The Copy
> **المؤلف:** محمد أمين راضي / Mohamed Amin Rady
> **التاريخ:** 23 أبريل 2026
> **حالة التقرير:** تحليل مبني على المقتطفات المرفقة فقط — لا يشمل فحص المستودع كاملاً

---

## 0) القيود المعرفية قبل الحكم

هذا التقرير مبني على **14 ملفاً** من مجلد `BREAKAPP` فقط. لم يُتح لي:

- محتوى حزمة `@the-copy/breakapp` (الـ `types`, `api`, `components`, `hooks`, `lib/auth`)
- الباك-إند (سواء `apps/api` أو خدمة منفصلة)
- مخطط قاعدة البيانات (`schema`, `migrations`, `ORM models`)
- ملف `package.json` الجذري و `turbo.json` / `pnpm-workspace.yaml`
- بوابة الـ
  `WebSocket Gateway`
  وبنية الـ
  `Socket.IO Namespaces`

لذلك أُصنّف كل استنتاج إلى ثلاث طبقات: **مؤكد من الكود**، **مُستنتج قوي من الاستدعاءات**، **غير مؤكد يحتاج فحصاً**.

---

## 1) الملخص التنفيذي الحاسم

**الحكم:** التطبيق في طور `alpha-skeleton` — الواجهات موجودة والتدفقات مرسومة، لكنّ هناك **ثغرة معمارية حرجة واحدة** وعدد من النواقص البنيوية في طبقتي
`auth guarding`
و
`role-based routing`
إضافة إلى استنتاج أن الباك-إند لم يُبنَ بعد بالقدر الذي يغطي الاستدعاءات كلها.

**أعلى ثلاث مشاكل تأثيراً (بالترتيب):**

1. **فشل حماية المسارات فعلياً** — ملف `(authenticated)/layout.tsx` موجود لكن الصفحات المحمية (`dashboard`, `director`, `crew/menu`, `runner/track`) **ليست بداخل المجموعة**، بل مباشرة تحت `BREAKAPP/`. النتيجة: الـ
   `Auth Guard`
   لا يُشغَّل إطلاقاً على الصفحات الحساسة، ويتكرر منطق التحقق داخل `dashboard/page.tsx` يدوياً — بينما بقية الصفحات الحساسة **بدون أي حماية**.

2. **غياب كامل لـ `Role-Based Access Control` على الراوتر** — يستطيع `crew` فتح `/BREAKAPP/director` مباشرة وسيُحمَّل له كامل الـ
   `UI`
   للمخرج.

3. **الباك-إند المُستنتج من الاستدعاءات غير موجود بالكامل على الأرجح** — `MERGE_RESOLUTION_REPORT.md` يُصرّح صراحة بأن "المنصة الأم تحتاج إلى تشغيل"، ما يعني أن كل الـ
   `endpoints`
   المطلوبة قد لا تكون مبنية بعد.

**الخلاصة:** التطبيق **غير جاهز للإنتاج** حالياً، والمسار المقترح يتطلب ما بين **4–6 مراحل عمل متسلسلة** موصوفة في القسم 6.

---

## 2) ما تم تأكيده من الكود المرفق

### 2.1 البنية المعمارية المرئية

```
apps/web/src/app/(main)/BREAKAPP/
├── (authenticated)/
│   └── layout.tsx           ← Auth Guard (لكن فارغ من محتوى محمي!)
├── crew/
│   └── menu/page.tsx        ← خارج الحماية
├── dashboard/page.tsx       ← خارج الحماية (يتحقق يدوياً)
├── director/page.tsx        ← خارج الحماية
├── docs/                    ← مستندات (يجب نقلها خارج مسار التطبيق)
├── login/qr/page.tsx        ← تسجيل دخول (صحيح أنه خارج الحماية)
├── runner/track/page.tsx    ← خارج الحماية
├── error.tsx
├── layout.tsx
├── loading.tsx
├── page.tsx                 ← موجّه ذكي
├── README.md                ← يجب نقله خارج مسار التطبيق
└── tsconfig.json
```

### 2.2 التدفقات الوظيفية الموجودة فعلياً

| التدفق | المسار | الحالة |
|---|---|---|
| مصادقة QR | `login/qr` → `dashboard` | مكتمل على مستوى الـ UI |
| لوحة توجيه حسب الدور | `dashboard` | مكتمل |
| تحديد موقع تصوير + موردين قريبين | `director` | مكتمل UI/UX |
| إنشاء جلسة يومية | `director` → `/geo/session` | مكتمل UI |
| تصفح قوائم الموردين + سلة + طلب | `crew/menu` | مكتمل UI |
| تتبع `GPS` لعامل التوصيل + WebSocket | `runner/track` | مكتمل UI |

### 2.3 العقود المُستنتجة للأنواع (من الاستدعاءات)

```typescript
// من الاستخدام في الكود المرفق
CurrentUser       = { userId, projectId, role }
AuthResponse      = { access_token, ... }
Vendor            = { id, name, is_mobile, fixed_location: {lat, lng}, distance? }
VendorMapData     = { id, name, lat, lng, distance? }
MenuItem          = { id, name, description?, available: boolean }
OrderItem         = { menuItemId, quantity }
Order             = { id, status: 'pending'|'processing'|'completed'|'cancelled',
                      items, created_at }
DeliveryTask      = { id, vendorName, items: number,
                      status: 'pending'|'in-progress'|'completed' }
QRTokenSchema     = zod schema
```

### 2.4 الـ endpoints المطلوبة من الفرونت (بصمة الباك-إند المطلوبة)

```
POST   /api/auth/scan-qr                    ← مصادقة QR
GET    /api/health                          ← فحص صحة (مذكور في docs)
GET    /api/vendors                         ← قائمة الموردين
GET    /api/vendors/:id/menu                ← قائمة طعام مورد
GET    /api/orders/my-orders                ← طلباتي (JWT-scoped)
POST   /api/orders                          ← تقديم طلب
GET    /api/geo/vendors/nearby              ← موردون قريبون (lat,lng,radius)
POST   /api/geo/session                     ← إنشاء جلسة يومية
POST   /api/orders/session/:sessionId/batch ← تجميع طلبات الجلسة
```

### 2.5 أحداث الـ WebSocket المطلوبة

```
CLIENT → SERVER:
  runner:register    { runnerId }
  runner:location    { runnerId, lat, lng, timestamp }
  order:status       { orderId, status }

SERVER → CLIENT:
  task:new           { id, vendorName, items, status }
```

### 2.6 المكونات الخارجية المُعتمد عليها

من حزمة `@the-copy/breakapp`:
```
api (axios instance)
getCurrentUser, isAuthenticated, storeToken, removeToken
scanQRAndLogin, generateDeviceHash, QRTokenSchema
components/ConnectionTest
components/maps/MapComponent
components/scanner/QRScanner
hooks/useGeolocation
hooks/useSocket
types: CurrentUser, AuthResponse, Vendor, VendorMapData,
       MenuItem, OrderItem, Order, DeliveryTask
```

من Aceternity UI (مُلتزَم به كقيد مطلق):
```
BackgroundBeams, NoiseBackground, CardSpotlight
DottedGlowBackground
```

---

## 3) الثغرات والنواقص المكتشفة

### 3.1 ثغرات حرجة (Critical — تمنع الإنتاج)

#### C1. كسر بنية الحماية — `Auth Guard` معزول عن الصفحات

**الدليل:**
- `(authenticated)/layout.tsx` يحتوي منطق
  `Auth Guard`
  كامل
- لكن الصفحات الحساسة (`dashboard`, `director`, `crew/menu`, `runner/track`) **ليست بداخل مجلد `(authenticated)`** — بل مباشرة في `BREAKAPP/`
- `dashboard/page.tsx` يكرر منطق التحقق يدوياً (دليل إضافي على أن الـ guard لا يعمل)

**الأثر:** أي مستخدم غير مصادق يستطيع فتح `/BREAKAPP/director` أو `/BREAKAPP/runner/track` مباشرة ورؤية الـ
`UI`
(وقد تفشل الاستدعاءات لاحقاً لكن تسرّب بنية التطبيق حدث).

**الإصلاح الجذري:** نقل كل الصفحات المحمية داخل مجموعة `(authenticated)` (انظر المرحلة 1).

#### C2. غياب تام لحماية الأدوار — `Role-Based Access Control`

**الدليل:** لا يوجد في أي ملف فحص `user.role` قبل عرض الصفحة.

**الأثر:**
- `crew` يستطيع فتح `/BREAKAPP/director`
- `runner` يستطيع فتح `/BREAKAPP/crew/menu`
- المخاطر الأمنية وتسريب بنية التطبيق لأدوار لا تحتاجها

#### C3. الباك-إند مفقود أو غير مكتمل

**الدليل:**
- `MERGE_RESOLUTION_REPORT.md` يذكر حرفياً: `❌ اتصال API: يحتاج المنصة أن تكون مشغلة`
- لا يوجد في المقتطفات أي إشارة لـ `apps/api` أو مجلد باك-إند

**الأثر:** التطبيق `UI-only` حالياً، لن يعمل حقيقياً.

#### C4. تخزين الـ `JWT` في `localStorage`

**الدليل:** `storeToken()` مُستورد من `@the-copy/breakapp` وواضح من استخدامه أنه يكتب للمتصفح.

**الأثر:** معرّض لهجمات
`XSS`
المتقاطعة. أي
`third-party script`
يستطيع سرقة الـ
`token`.

#### C5. معرّف Runner عشوائي مُخزَّن محلياً

**الدليل:** في `runner/track/page.tsx`:
```javascript
id = `runner-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
localStorage.setItem("runnerId", id);
```

**الأثر:** الـ
`runnerId`
غير مرتبط بالمستخدم المصادق، ولا بالباك-إند. أي مستخدم يستطيع انتحال أي
`runner`
بتعديل
`localStorage`.

#### C6. مستندات ومجلدات تطبيق (`docs/`, `README.md`) داخل مسار الراوتر

**الدليل:** `BREAKAPP/docs/DOCUMENTATION.md`, `BREAKAPP/README.md` — كلها داخل مسار `app router`.

**الأثر:**
- Next.js سيتجاهل هذه الملفات (لا تُبنى كصفحات)، لكنها تلوّث مسار التطبيق
- قد تُنشر عن طريق الخطأ
- تُصعّب التنقل في بنية الراوتر

---

### 3.2 نواقص بنيوية كبرى (Major — تحتاج بناء)

#### M1. صفحات ناقصة للوظائف الموعودة

| الصفحة الناقصة | الدور | الأهمية |
|---|---|---|
| `admin/vendors` | `admin` | إدارة الموردين (CRUD) |
| `admin/projects` | `admin` | إدارة المشاريع وتوليد QR |
| `admin/users` | `admin` | إدارة الأعضاء |
| `director/orders-live` | `director` | لوحة الطلبات الحية للجلسة |
| `director/runners-map` | `director` | خريطة تتبع عمال التوصيل الحية |
| `crew/orders/[id]` | `crew` | تفاصيل طلب + حالة حية |
| `runner/active-delivery` | `runner` | شاشة توصيل فعّالة مع ملاحة |
| `vendor/dashboard` | `vendor` | لوحة المورد لاستقبال الطلبات |
| `vendor/menu-editor` | `vendor` | محرر قائمة الطعام |
| `profile` | الكل | إعدادات المستخدم |
| `offline` | الكل | شاشة عند انقطاع الاتصال |

#### M2. دور `vendor` و `admin` غير مُعرَّفين في `ROLE_QUICK_LINKS`

**الدليل:** `ROLE_QUICK_LINKS` في `dashboard/page.tsx` يعرّف فقط `director`, `crew`, `runner`.

**الأثر:** أي مستخدم بدور آخر يرى لوحة تحكم فارغة.

#### M3. لا يوجد `Real-Time UI` للطلبات

**المتوقع:** `crew` يجب أن يرى حالة طلبه تتغير مباشرة (`pending → processing → completed`)، لكن كود الصفحة يعتمد على `fetchMyOrders()` يدوياً.

**الأثر:** تجربة مستخدم غير حديثة، والمستخدم لا يعرف متى يُحضَّر طلبه.

#### M4. غياب `Notifications` الدفعية

**المتوقع:** تنبيه عند وصول طلب جديد للمورد، عند وصول مهمة جديدة لـ
`runner`،
عند تغيّر حالة طلب للـ
`crew`.

**الموجود:** فقط `toast` داخلي، لا يصل للمستخدم إن أغلق التبويب.

#### M5. لا يوجد `Offline-First Strategy`

**السياق:** التطبيق ميداني (مواقع تصوير، تغطية شبكة متذبذبة).

**الناقص:**
- لا
  `Service Worker`
- لا
  `IndexedDB Queue`
  للطلبات المعلقة
- لا
  `Optimistic Updates`
  منظمة

#### M6. الخريطة ثنائية الاتجاه غير موجودة للمخرج

**الموجود:** المخرج يختار موقعاً ويرى الموردين.

**الناقص:** المخرج لا يرى عمال التوصيل (`Runners`) الأحياء على الخريطة، رغم أن الباك-إند يستقبل `runner:location` — فأين يُستهلك؟

#### M7. نظام `Pagination` و `Filter` و `Search` غائب تماماً

في `crew/menu` و `director` و `runner/track` كل القوائم تُعرض بالكامل.

---

### 3.3 نواقص تجربة المستخدم (UX — تحتاج تحسيناً)

| البند | الحالة | التأثير |
|---|---|---|
| `Loading Skeletons` | غائبة — مجرد spinner عام | تجربة أقل من معايير 2026 |
| `Empty States` | بدائية (نص فقط) | |
| `Error Boundaries` داخلية | فقط على مستوى الصفحة الجذرية | |
| `Toast` للعمليات الطويلة | غائب (بدون `progress`) | |
| `Form Validation` واضحة | ضعيفة (فقط `required` runtime) | |
| `Accessibility` (`a11y`) | `dir=rtl` موجود لكن لا `aria-live`, لا `focus management` | |
| `Keyboard Navigation` | لم يُختبر | |
| `Dark Mode` | الوحيد الموجود (لا يوجد `light`) | قد يكون متعمداً |
| Animations | غائبة غالباً رغم وجود Aceternity | |

---

### 3.4 نواقص الأمان (Security)

| الثغرة | الخطورة | المكان |
|---|---|---|
| `JWT` في `localStorage` | عالية | C4 أعلاه |
| لا `Refresh Token` | عالية | مستنتج من عدم وجود الاستدعاء |
| `Device Hash` قابل للانتحال | متوسطة | `generateDeviceHash` client-side |
| لا `Rate Limiting` مرئي | متوسطة | يحتاج فحصاً في الباك-إند |
| لا `CSRF Protection` | متوسطة | مستنتج |
| `projectId`, `sessionId` مُدخَلة يدوياً | منخفضة-متوسطة | نسخ ولصق معرّض للخطأ |
| `XSS` عبر أسماء الموردين | منخفضة | تستعمل React (مؤمّن افتراضياً) |

---

### 3.5 نواقص الجودة الهندسية (Engineering Quality)

| البند | الحالة |
|---|---|
| اختبارات وحدة (`Unit Tests`) | غائبة تماماً |
| اختبارات تكامل (`Integration`) | غائبة |
| اختبارات `E2E` (Playwright/Cypress) | غائبة |
| `Storybook` للمكونات | غير موجود |
| `Linting/Formatting` موحد | `tsconfig` صارم جداً، لكن لا `ESLint config` ظاهر |
| `CI/CD Pipeline` | غير معروف |
| `Observability` (`Sentry`, logging) | غير موجود ظاهرياً |
| `Feature Flags` | غير موجود |

---

## 4) خطة الاستكمال الشاملة

الخطة مُقسَّمة إلى **6 مراحل متسلسلة** مع **تبعيات واضحة**. كل مهمة مُرقَّمة `Mx.Ny` (المرحلة.المهمة) لسهولة الإحالة.

### المرحلة 1: الإصلاحات الحرجة (حظر الإنتاج يُرفَع)

#### M1.01 — إصلاح بنية حماية المسارات (Critical)

**المشكلة:** الصفحات الحساسة خارج مجموعة `(authenticated)`.

**العمل المطلوب:**
```
BREAKAPP/
├── (authenticated)/
│   ├── layout.tsx                ← موجود، لكن يُحدَّث لدعم الأدوار
│   ├── dashboard/page.tsx        ← نقل من خارج
│   ├── director/
│   │   ├── layout.tsx            ← جديد: حماية role=director
│   │   ├── page.tsx              ← نقل من خارج
│   │   ├── orders-live/page.tsx  ← جديد (M3.05)
│   │   └── runners-map/page.tsx  ← جديد (M3.06)
│   ├── crew/
│   │   ├── layout.tsx            ← جديد: حماية role=crew|director
│   │   ├── menu/page.tsx         ← نقل من خارج
│   │   └── orders/[id]/page.tsx  ← جديد (M3.07)
│   ├── runner/
│   │   ├── layout.tsx            ← جديد: حماية role=runner
│   │   ├── track/page.tsx        ← نقل من خارج
│   │   └── active-delivery/page.tsx ← جديد (M3.08)
│   ├── vendor/                   ← جديد كاملاً (M3.10)
│   ├── admin/                    ← جديد كاملاً (M3.11)
│   └── profile/page.tsx          ← جديد (M3.12)
├── (public)/                     ← جديد
│   └── login/qr/page.tsx         ← نقل من خارج
├── docs/                         ← ينتقل خارج app/
├── error.tsx
├── layout.tsx
├── loading.tsx
└── page.tsx
```

**التأثير الجانبي:** مسارات الـ
`URL`
لا تتغير (لأن `(authenticated)` و `(public)` هي
`route groups`
بين أقواس، لا تُعدّ جزءاً من المسار).

#### M1.02 — إضافة `Role Guard` لكل مسار فرعي

**الكود المقترح (`director/layout.tsx`):**
```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@the-copy/breakapp";

const ALLOWED_ROLES = ["director", "admin"] as const;

export default function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
      router.replace("/BREAKAPP/dashboard");
    }
  }, [router]);
  return <>{children}</>;
}
```

يُكرَّر المبدأ لباقي الأدوار. الأفضل استخراج دالة `createRoleGuard(roles)` في `@the-copy/breakapp`.

#### M1.03 — نقل المستندات خارج مسار `app/`

انقل `BREAKAPP/docs/` و `BREAKAPP/README.md` إلى:
```
docs/apps/web/breakapp/
  ├── README.md
  ├── DOCUMENTATION.md
  ├── MERGE_RESOLUTION_REPORT.md
  └── SUMMARY.md
```

#### M1.04 — إزالة الفحص اليدوي المكرر من `dashboard/page.tsx`

بعد نقله داخل `(authenticated)`، احذف الـ `useEffect` المكرر الذي يفحص `isAuthenticated()` — الـ layout يتولى ذلك الآن.

#### M1.05 — تحديث `page.tsx` الجذري ليوجّه حسب الدور

حالياً يوجّه كل المصادقين إلى `/BREAKAPP/dashboard`. الأفضل:
```
admin    → /BREAKAPP/admin
director → /BREAKAPP/director
crew     → /BREAKAPP/crew/menu
runner   → /BREAKAPP/runner/track
vendor   → /BREAKAPP/vendor/dashboard
```

---

### المرحلة 2: إكمال الباك-إند

افتراض: الباك-إند مبني بـ
`Node.js + TypeScript + Fastify أو NestJS`
(يناسب الأداء والـ
`DX` في مونوريبو).
إن كان موجوداً جزئياً، استخدم التقرير لفحص الفجوات.

#### M2.01 — Authentication Module كامل

```
apps/api/src/modules/auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.guard.ts
├── jwt.strategy.ts
├── device-hash.validator.ts
├── refresh-token.service.ts
└── dto/
    ├── scan-qr.dto.ts
    └── refresh-token.dto.ts
```

**Endpoints:**
- `POST /api/auth/scan-qr` — مصادقة QR + توليد `access_token` + `refresh_token`
- `POST /api/auth/refresh` — تجديد التوكن
- `POST /api/auth/logout` — إبطال التوكن (قائمة سوداء في Redis)
- `GET /api/auth/me` — المستخدم الحالي

**القرارات المعمارية الواجبة:**
- `JWT` + `Refresh Token Rotation`
- تخزين الـ
  `Refresh Token`
  في
  `httpOnly cookie`
  بدل `localStorage` (حل لـ C4)
- `Access Token`
  عمره قصير (15 دقيقة) ويُحفظ في الذاكرة فقط

#### M2.02 — QR Generation + Project Enrollment

**Endpoints للمسؤول (Admin):**
- `POST /api/admin/projects` — إنشاء مشروع
- `POST /api/admin/projects/:id/invites` — توليد رمز QR للدعوة
- `GET /api/admin/projects/:id/members` — قائمة الأعضاء

**بنية رمز الـ QR (مقترحة):**
```json
{
  "v": 1,
  "projectId": "uuid",
  "role": "crew",
  "inviteToken": "jwt-short-lived",
  "expiresAt": "iso-8601"
}
```

#### M2.03 — Vendors Module

```
POST   /api/admin/vendors           ← إنشاء مورد
PATCH  /api/admin/vendors/:id       ← تعديل
DELETE /api/admin/vendors/:id       ← حذف ناعم
GET    /api/vendors                  ← قائمة (مع pagination)
GET    /api/vendors/:id              ← تفاصيل مورد
GET    /api/vendors/:id/menu         ← قائمة الطعام
POST   /api/vendors/:id/menu         ← (vendor role) إضافة عنصر
PATCH  /api/vendors/:id/menu/:itemId ← (vendor role) تعديل
```

**قاعدة البيانات (PostgreSQL + PostGIS):**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  is_mobile BOOLEAN DEFAULT false,
  fixed_location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_vendors_location ON vendors USING GIST(fixed_location);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  name TEXT NOT NULL,
  description TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### M2.04 — Geo Module

```
GET  /api/geo/vendors/nearby   ← params: lat, lng, radius
POST /api/geo/session          ← إنشاء جلسة يومية
GET  /api/geo/session/:id      ← تفاصيل جلسة
GET  /api/geo/sessions/active  ← جلسات المستخدم النشطة
```

**استعلام `Nearby` في `PostGIS`:**
```sql
SELECT
  id, name, is_mobile,
  ST_Y(fixed_location::geometry) AS lat,
  ST_X(fixed_location::geometry) AS lng,
  ST_Distance(fixed_location, ST_MakePoint($lng, $lat)::geography) AS distance
FROM vendors
WHERE ST_DWithin(fixed_location, ST_MakePoint($lng, $lat)::geography, $radius)
  AND deleted_at IS NULL
ORDER BY distance
LIMIT 50;
```

#### M2.05 — Sessions Module

جلسة يومية
(`Daily Session`)
تربط
`projectId`
بـ
`location`
وبـ
`window of activity`
(عادة 12 ساعة).

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  director_user_id UUID NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### M2.06 — Orders Module

```
POST   /api/orders                              ← تقديم طلب
GET    /api/orders/my-orders                    ← طلبات المستخدم
GET    /api/orders/session/:sessionId           ← كل طلبات جلسة
POST   /api/orders/session/:sessionId/batch     ← تجميع للـ runners
PATCH  /api/orders/:id/status                   ← تحديث الحالة
GET    /api/orders/:id                          ← تفاصيل
```

**منطق الـ Batching:**
تجميع الطلبات حسب المورد ضمن جلسة واحدة لتقليل عدد التوصيلات. يُشغَّل دورياً أو عند طلب `runner`.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  user_id UUID NOT NULL,
  user_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE TABLE order_batches (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  vendor_id UUID REFERENCES vendors(id),
  runner_id UUID,
  total_items INT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### M2.07 — Runners Module

```
POST   /api/runners/register              ← تسجيل runner
POST   /api/runners/location              ← تحديث موقع (REST fallback)
GET    /api/runners/me/tasks              ← مهامي
PATCH  /api/runners/tasks/:id/status      ← تحديث حالة مهمة
GET    /api/runners/session/:sessionId    ← (للمخرج) كل الـ runners في الجلسة
```

#### M2.08 — WebSocket Gateway (`Socket.IO`)

```typescript
// namespaces/breakapp.gateway.ts (مقترح بنية NestJS)

@WebSocketGateway({ namespace: '/breakapp', cors: { origin: '*' } })
export class BreakappGateway {
  // مصادقة كل اتصال بـ JWT في handshake
  // rooms: session:<sessionId>, runner:<runnerId>

  handleConnection(socket: Socket)        // يتحقق من JWT
  'runner:register'                       // runner → room
  'runner:location'                       // بث لكل المخرجين في نفس session
  'order:status'                          // بث للعميل المالك + المخرج
  'task:new'                              // إرسال للـ runner المعني
  'session:started' / 'session:ended'     // بث للكل في جلسة
}
```

#### M2.09 — Rate Limiting + Security Middleware

```
- Helmet (HTTP headers)
- CORS (origin allowlist)
- Rate Limiter (Redis-based)
- Request Validation (Zod / class-validator)
- SQL Injection Protection (ORM parameterized queries)
- XSS Protection على inputs النصية
```

#### M2.10 — Observability

```
- Logger (Pino JSON logs)
- Metrics (Prometheus /metrics endpoint)
- Tracing (OpenTelemetry)
- Error Tracking (Sentry)
- Health check (/api/health, /api/ready)
```

---

### المرحلة 3: استكمال الفرونت-إند

#### M3.01 — إعادة هيكلة مجلد `(authenticated)` (منجز في M1.01)

#### M3.02 — إنشاء `RoleGuard HOC` في الحزمة المشتركة

```typescript
// packages/breakapp/src/guards/createRoleGuard.tsx
export function createRoleGuard(allowedRoles: readonly string[]) {
  return function RoleGuard({ children }: { children: React.ReactNode }) {
    /* منطق التحقق */
  };
}
```

#### M3.03 — نظام Navigation موحّد (`AppShell`)

مكون `AppShell` يحتوي:
- شريط علوي `Topbar` (user info + logout + notifications bell)
- شريط جانبي `Sidebar` (قابل للطي — مناسب للجوال)
- breadcrumb
- connection status indicator
- role badge

#### M3.04 — Profile Page (`/profile`)

- عرض معلومات المستخدم
- إعدادات الإشعارات
- تبديل `locale` (عربي/إنجليزي)
- تغيير `device binding`
- logout من كل الأجهزة

#### M3.05 — Director Orders Live (`/director/orders-live`)

لوحة تعرض كل طلبات الجلسة الحالية **في الوقت الحقيقي**:
- filter حسب المورد / الحالة / الوقت
- إمكانية تشغيل
  `batching`
  يدوياً
- إسناد batch لـ
  `runner`
  معين

#### M3.06 — Director Runners Map (`/director/runners-map`)

خريطة حية تعرض:
- موقع كل `runner` في الجلسة
- مسار كل `runner` (آخر 30 دقيقة)
- تقدير الـ `ETA` لكل مورد
- لون حسب الحالة (متاح / في مهمة / غير متصل)

**تقني:** `Leaflet` + `react-leaflet` + `Socket.IO client listener` يُحدّث `markers`.

#### M3.07 — Crew Order Details (`/crew/orders/[id]`)

- timeline لحالة الطلب
- توقع وقت الوصول
- إمكانية إلغاء (إذا `status = pending`)
- تواصل مع `runner` (chat لاحقاً)

#### M3.08 — Runner Active Delivery (`/runner/active-delivery`)

- كل المهام مرئية في صفحة واحدة مع trackابل للخريطة
- أزرار: "وصلت للمورد"، "استلمت"، "في الطريق"، "سلّمت"
- ملاحة إلى المورد ثم إلى موقع الجلسة
- rejection flow (رفض مهمة)

#### M3.09 — Connection Status Indicator (عالمي)

مكون `<ConnectionStatus />` يعيش في الـ
`AppShell`،
يعرض:
- متصل / غير متصل
- عدد الطلبات المؤجلة (من قائمة الانتظار المحلية)
- زر "إعادة المزامنة"

#### M3.10 — Vendor Dashboard (دور جديد)

```
vendor/
├── dashboard/page.tsx     ← طلبات واردة + إحصائيات
├── menu-editor/page.tsx   ← CRUD لعناصر القائمة
└── orders/[id]/page.tsx   ← تفاصيل طلب + أزرار الحالة
```

#### M3.11 — Admin Panel

```
admin/
├── page.tsx                    ← overview
├── projects/
│   ├── page.tsx                ← قائمة المشاريع
│   ├── new/page.tsx            ← إنشاء مشروع
│   └── [id]/
│       ├── page.tsx            ← تفاصيل
│       ├── invites/page.tsx    ← توليد QR
│       └── members/page.tsx    ← الأعضاء
├── vendors/
│   ├── page.tsx                ← قائمة
│   ├── new/page.tsx
│   └── [id]/page.tsx
└── users/page.tsx
```

#### M3.12 — Offline Support (`Service Worker`)

```typescript
// next.config.ts → إضافة next-pwa
// public/sw.js → cache strategy

استراتيجية:
- Assets: Cache First
- API GET: Stale While Revalidate
- API POST/PATCH: Background Sync Queue
- Map Tiles: Cache First مع حد زمني
```

**قائمة الطلبات المعلقة** في `IndexedDB` مع `Background Sync` عند عودة الشبكة.

#### M3.13 — Notifications (`Web Push`)

- طلب إذن عند الدخول لأول مرة
- اشتراك `Push Subscription` مع الباك-إند
- معالجة push events في `Service Worker`
- إشعارات داخل التطبيق كـ fallback

#### M3.14 — Loading Skeletons + Empty States متقدمة

استبدال كل `animate-spin` بـ
`shimmer skeletons`
مخصصة لكل صفحة، واستخدام `Aceternity UI` للحركات (يتناسب مع القيد المطلق).

#### M3.15 — Form Validation مع `React Hook Form` + `Zod`

كل الإدخالات الحرة (`sessionId`, `projectId`) تُستبدل بـ:
- QR-based selection حيثما أمكن
- dropdowns من API
- validation في الزمن الحقيقي

#### M3.16 — i18n (`next-intl`)

حالياً النصوص مكتوبة بالعربية مباشرة في الـ
`JSX`.
استخراجها إلى ملفات
`ar.json` / `en.json`.

#### M3.17 — تحسين `a11y`

- `aria-live` للتحديثات الفورية (الطلبات الجديدة)
- `aria-label` للأزرار الأيقونية
- `focus trap` في الحوارات
- تباين ألوان مطابق لـ `WCAG 2.2 AA`
- keyboard navigation كامل

---

### المرحلة 4: ميزات متقدمة

#### M4.01 — نظام `Analytics` للمخرج

- عدد الطلبات حسب المورد
- متوسط زمن التسليم
- `Runner Efficiency Score`
- تكلفة تقديرية للجلسة

#### M4.02 — نظام `Ratings`

- تقييم المورد (طعام)
- تقييم الـ `runner` (سرعة/أدب)
- عرض متوسط التقييم

#### M4.03 — `In-App Chat`

- قناة بين `crew` ↔ `runner` للطلبية
- قناة عامة للجلسة

#### M4.04 — `Budget Tracking`

- ميزانية يومية للجلسة
- تنبيه عند اقتراب الحد

#### M4.05 — Export / Reports

- تصدير كل طلبات الجلسة كـ `CSV`/`PDF`
- تقرير نهاية الجلسة للمخرج

#### M4.06 — `Multi-Session` Mode

- دعم عدة جلسات نشطة لنفس المشروع (مخرجين مختلفين في مواقع مختلفة)
- تبديل سريع بين الجلسات

---

### المرحلة 5: الأمان والأداء

#### M5.01 — نقل الـ `Refresh Token` إلى `httpOnly Cookie`

(يحل C4)

#### M5.02 — ربط `Device Hash` بالحساب في الباك-إند

- تسجيل الجهاز عند أول دخول
- رفض محاولات الدخول من أجهزة غير مسجلة بدون تأكيد إضافي

#### M5.03 — `Content Security Policy` صارم

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.tile.openstreetmap.org;
connect-src 'self' wss://...;
```

#### M5.04 — `Rate Limiting` على مستوى الـ `IP` + المستخدم

#### M5.05 — `Audit Log`

كل عملية حساسة تُسجَّل (إنشاء جلسة، حذف مورد، تغيير دور مستخدم).

#### M5.06 — Performance Optimizations

- `Image Optimization` (`next/image`)
- `Dynamic imports` للمكونات الثقيلة (الخريطة، الماسح)
- `Bundle Analysis` (`@next/bundle-analyzer`)
- `React.memo` + `useMemo` حيث يلزم
- `Virtual Scrolling` للقوائم الطويلة (`TanStack Virtual`)

#### M5.07 — `Database Indexing` + `Query Optimization`

- فهارس على الأعمدة المستعلَمة
- `EXPLAIN ANALYZE` للاستعلامات البطيئة
- `Connection Pooling` (`PgBouncer`)
- `Redis Caching` للـ `vendors list` و `menu`

---

### المرحلة 6: الاختبار والنشر

#### M6.01 — `Unit Tests` (`Vitest`)

- 80%+ coverage للدوال المنطقية في `@the-copy/breakapp`
- اختبار جميع `hooks` (`useSocket`, `useGeolocation`)

#### M6.02 — `Integration Tests`

- `Auth flow` كامل
- `Order flow` كامل
- `WebSocket flow`

#### M6.03 — `E2E Tests` (`Playwright`)

سيناريوهات حرجة:
1. تسجيل دخول QR → لوحة التحكم
2. المخرج ينشئ جلسة → Crew يطلب → Runner يوصّل
3. انقطاع الشبكة والاستعادة

#### M6.04 — `CI Pipeline` (`GitHub Actions`)

```yaml
jobs:
  lint:     eslint, prettier, tsc --noEmit
  test:     vitest run + coverage
  e2e:      playwright test
  build:    next build
  deploy:   (manual approval) → Vercel + Fly.io
```

#### M6.05 — النشر

- **Frontend**: `Vercel` (أو أي منصة Next.js)
- **Backend**: `Fly.io` / `Railway` / `Render`
- **Database**: `Neon` / `Supabase` (Postgres مُدار)
- **Redis**: `Upstash`
- **Storage**: `Cloudflare R2` (صور القوائم)

#### M6.06 — مراقبة ما بعد النشر

- `Sentry` للأخطاء
- `PostHog` / `Umami` للـ `analytics`
- `Better Stack` / `UptimeRobot` للـ `uptime`
- dashboard في `Grafana` للمقاييس

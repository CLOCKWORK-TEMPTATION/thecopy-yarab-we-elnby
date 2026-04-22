# كتالوج مكونات الفرونت اند — النسخة

> آخر تحديث: مارس 2026
> التطبيق: `apps/web`
> المسار الجذر للمكونات: `apps/web/src/components/`

---

## نظرة عامة

| الفئة                          | العدد    |
| ------------------------------ | -------- |
| مكونات shadcn/ui المثبتة       | 35       |
| مكونات Aceternity UI           | 3        |
| مكونات مخصصة (جذر components/) | ~25      |
| مكونات واجهة مخصصة (ui/)       | ~20      |
| مكونات الصفحات (app/)          | ~120+    |
| **المجموع التقريبي**           | **200+** |

**نمط التصميم:** نظام تصميم هجين يجمع بين:

- **shadcn/ui** (النمط: `default`) مع ألوان CSS variables ومتغير أساسي `neutral`
- **Aceternity UI** لتأثيرات الحركة المتقدمة
- **Tailwind CSS** للتصميم
- **Framer Motion** للرسوم المتحركة
- واجهة عربية RTL بامتياز، مع دعم كامل لاتجاه `dir="rtl"`
- ألوان ذهبية `#FFD700` كلون أساسي للمنصة

---

## 1. مكونات shadcn/ui المثبتة

المسار: `apps/web/src/components/ui/`
الإعداد: `apps/web/components.json`

| المكوّن             | الملف                      | الوصف                                                                        |
| ------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| `Accordion`         | `accordion.tsx`            | قائمة قابلة للطي، تُستخدم في الأسئلة الشائعة والتفاصيل                       |
| `AlertDialog`       | `alert-dialog.tsx`         | حوار تأكيد يوقف التفاعل حتى الرد (destructive actions)                       |
| `Alert`             | `alert.tsx`                | رسائل تنبيه بأنواع: default / destructive                                    |
| `Avatar`            | `avatar.tsx`               | صورة مستخدم مع fallback نصي                                                  |
| `Badge`             | `badge.tsx`                | بطاقة صغيرة للتصنيفات والحالات                                               |
| `Button`            | `button.tsx`               | زر متعدد الأشكال: default / destructive / outline / secondary / ghost / link |
| `Calendar`          | `calendar.tsx`             | تقويم تفاعلي مبني على `react-day-picker`                                     |
| `Card`              | `card.tsx`                 | حاوية بطاقة مع Header / Content / Footer / Title / Description               |
| `Carousel`          | `carousel.tsx`             | عرض منزلق أفقي/عمودي مع تنقل بالأسهم                                         |
| `Chart`             | `chart.tsx`                | حاوية رسوم بيانية مبنية على `recharts` مع config للألوان                     |
| `Checkbox`          | `checkbox.tsx`             | خانة اختيار مع دعم الحالة غير المحددة                                        |
| `Collapsible`       | `collapsible.tsx`          | عنصر قابل للإخفاء/الإظهار                                                    |
| `Command`           | `command-palette.tsx`      | لوحة أوامر (مخصصة، راجع قسم المكونات المخصصة)                                |
| `Dialog`            | `dialog.tsx`               | نافذة حوارية modal مع backdrop                                               |
| `DropdownMenu`      | `dropdown-menu.tsx`        | قائمة منسدلة مع submenus وcheckbox items                                     |
| `Form`              | `form.tsx`                 | نظام نماذج مبني على `react-hook-form` مع validation                          |
| `Input`             | `input.tsx`                | حقل إدخال نصي مع variants                                                    |
| `Label`             | `label.tsx`                | تسمية حقل مرتبطة بـ htmlFor                                                  |
| `Menubar`           | `menubar.tsx`              | شريط قوائم أفقي على طراز تطبيقات سطح المكتب                                  |
| `Popover`           | `popover.tsx`              | نافذة منبثقة صغيرة (calendar, color picker...)                               |
| `Progress`          | `progress.tsx`             | شريط تقدم مع قيمة `0-100`                                                    |
| `RadioGroup`        | `radio-group.tsx`          | مجموعة أزرار اختيار حصري                                                     |
| `ScrollArea`        | `scroll-area.tsx`          | منطقة تمرير مخصصة بـ scrollbar مُنسقة                                        |
| `Select`            | `select.tsx`               | قائمة اختيار مفردة مع trigger / content / item                               |
| `Separator`         | `separator.tsx`            | فاصل أفقي/عمودي                                                              |
| `Sheet`             | `sheet.tsx`                | درج جانبي ينزلق من الحواف الأربع                                             |
| `Sidebar`           | `sidebar.tsx`              | شريط جانبي كامل مع دعم الطي والتنقل                                          |
| `Skeleton`          | `skeleton.tsx`             | عنصر تحميل skeleton مبسط                                                     |
| `Slider`            | `slider.tsx`               | شريط تمرير لاختيار قيمة رقمية                                                |
| `Switch`            | `switch.tsx`               | زر تبديل on/off                                                              |
| `Table`             | `table.tsx`                | جدول بيانات كامل: Header / Body / Row / Cell / Caption                       |
| `Tabs`              | `tabs.tsx`                 | تبويبات مع TabsList / TabsTrigger / TabsContent                              |
| `Textarea`          | `textarea.tsx`             | حقل نص متعدد الأسطر                                                          |
| `Toast` + `Toaster` | `toast.tsx`, `toaster.tsx` | إشعارات toast مؤقتة                                                          |
| `Tooltip`           | `tooltip.tsx`              | تلميح نصي عند المرور بالمؤشر                                                 |

---

## 2. مكونات Aceternity UI

المسار: `apps/web/src/components/aceternity/`

تأثيرات بصرية متقدمة مبنية بـ Framer Motion وCanvas.

---

### `BackgroundBeams`

**الملف:** `apps/web/src/components/aceternity/background-beams.tsx`

**الوصف:** خلفية متحركة تعرض أشعة ضوئية ذهبية تتدفق عبر SVG paths بتدرجات لونية متحركة. لا تقبل props.

**Props:** لا توجد

```tsx
import { BackgroundBeams } from "@/components/aceternity/background-beams";

<div className="relative h-screen">
  <BackgroundBeams />
  <div className="relative z-10">المحتوى فوق الأشعة</div>
</div>;
```

**ملاحظات:**

- تستخدم `pointer-events-none` لتجنب تعارض التفاعل
- مُحسَّنة بـ `React.memo`

---

### `CardSpotlight`

**الملف:** `apps/web/src/components/aceternity/card-spotlight.tsx`

**الوصف:** حاوية بطاقة تتتبع موضع الفأرة وتعرض توهجاً ذهبياً في نقطة التقاطع.

**Props:**

```typescript
interface CardSpotlightProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
```

```tsx
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

<CardSpotlight className="rounded-2xl border border-white/10 p-6">
  <h2>محتوى البطاقة</h2>
</CardSpotlight>;
```

---

### `TextRevealByWord`

**الملف:** `apps/web/src/components/aceternity/text-reveal.tsx`

**الوصف:** يكشف النص كلمة بكلمة عند التمرير، بانتقال opacity مرتبط بـ scroll progress.

**Props:**

```typescript
interface TextRevealByWordProps {
  text: string; // النص المراد عرضه
  className?: string;
}
```

```tsx
import { TextRevealByWord } from "@/components/aceternity/text-reveal";

<TextRevealByWord
  text="هذا النص سيظهر تدريجياً عند التمرير"
  className="text-4xl font-bold"
/>;
```

**ملاحظات:**

- تعتمد على `useScroll` و`useTransform` من Framer Motion
- يجب أن يكون العنصر الأب ذا ارتفاع كافٍ للتمرير

---

### `NoiseBackground`

**الملف:** `apps/web/src/components/aceternity/noise-background.tsx`

**الوصف:** طبقة ضجيج فيلمية دقيقة متحركة مرسومة على `<canvas>`. تُستخدم لإضافة texture سينمائية.

**Props:** لا توجد

```tsx
import { NoiseBackground } from "@/components/aceternity/noise-background";

// في layout رئيسي
<NoiseBackground />;
```

**ملاحظات:**

- `opacity: 0.015` — تأثير خفيف جداً
- `z-index: 1`، لا تتداخل مع المحتوى
- تتغير أبعاد الـ canvas تلقائياً مع حجم النافذة

---

## 3. المكونات المخصصة الأساسية

المسار: `apps/web/src/components/` (المستوى الجذر وتحت مجلدات فرعية)

---

### `HeroAnimation`

**الملف:** `apps/web/src/components/HeroAnimation.tsx`

**الوصف:** حركة الصفحة الرئيسية الكاملة. تعرض مجموعة كروت V-Shape مع نص "النسخة" وتأثيرات GSAP للتمرير، تفتح `IntroVideoModal` عند الضغط.

**Props:** لا توجد (تقرأ البيانات من `@/lib/images` و`useHeroAnimation`)

**المكونات الداخلية المستخدمة:**

- `VideoTextMask` — طبقة الفيديو الأولى
- `ImageWithFallback` — كروت V-Shape
- `IntroVideoModal` — نافذة الفيديو

```tsx
import { HeroAnimation } from "@/components/HeroAnimation";

// في الصفحة الرئيسية فقط
<HeroAnimation />;
```

---

### `VideoTextMask`

**الملف:** `apps/web/src/components/VideoTextMask.tsx`

**الوصف:** يعرض فيديو خلف كلمة نصية كبيرة (تأثير clip-path). عند فشل الفيديو يختفي بلطف.

**Props:**

```typescript
interface VideoTextMaskProps {
  videoSrc: string; // مسار الفيديو (URL)
  text: string; // النص الذي يُستخدم كـ mask
  className?: string;
}
```

```tsx
import { VideoTextMask } from "@/components/VideoTextMask";

<VideoTextMask
  videoSrc="https://example.com/video.mp4"
  text="النسخة"
  className="w-full h-screen"
/>;
```

**ملاحظات:**

- يستخدم `forwardRef` لتمرير ref للعنصر الخارجي
- الفيديو: `autoPlay`, `loop`, `muted`, `playsInline`

---

### `IntroVideoModal`

**الملف:** `apps/web/src/components/IntroVideoModal.tsx`

**الوصف:** نافذة modal لعرض فيديو تعريفي. تدعم إغلاق بـ `Escape` أو النقر خارج الحدود. مُحسَّنة للإمكانية (focus trap، aria attributes).

**Props:**

```typescript
interface IntroVideoModalProps {
  open: boolean; // حالة الفتح/الإغلاق
  onClose: () => void; // callback عند الإغلاق
  videoSrc: string; // مسار الفيديو
  title?: string; // عنوان النافذة (افتراضي: "فيديو تعريفي")
}
```

```tsx
import { IntroVideoModal } from "@/components/IntroVideoModal";

const [open, setOpen] = useState(false);

<IntroVideoModal
  open={open}
  onClose={() => setOpen(false)}
  videoSrc="https://example.com/intro.mp4"
  title="فيديو تعريفي عن النسخة"
/>;
```

---

### `LauncherCenterCard`

**الملف:** `apps/web/src/components/LauncherCenterCard.tsx`

**الوصف:** بطاقة مشغّل مركزية (Landing Card) تعرض شكل V-Shape من 7 صور مع عنوان "النسخة" وزر "افتح المحرر". عند الضغط تنتقل إلى `/editor`.

**Props:**

```typescript
interface LauncherCenterCardProps {
  className?: string;
}
```

```tsx
import LauncherCenterCard from "@/components/LauncherCenterCard";

<LauncherCenterCard className="h-96" />;
```

**ملاحظات:**

- تستخدم `ResizeObserver` للتكيف مع الحجم
- `useElementSize` hook داخلي
- تحسب مواضع الكروت بناءً على `V_LAYOUT` الثابتة

---

### `AppGrid`

**الملف:** `apps/web/src/components/AppGrid.tsx`

**الوصف:** شبكة التطبيقات الرئيسية للمنصة. تقرأ قائمة التطبيقات من `@/config/apps.config` وتعرضها في grid متجاوب مع Framer Motion entry animations.

**Props:** لا توجد

```tsx
import { AppGrid } from "@/components/AppGrid";

<AppGrid />;
```

**ملاحظات:**

- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- تأثير Stagger: `delay: index * 0.1`

---

### `ErrorBoundary`

**الملف:** `apps/web/src/components/ErrorBoundary.tsx`

**الوصف:** حد خطأ React Class Component مدمج مع Sentry. يعرض واجهة fallback افتراضية عند وقوع خطأ، مع زر "حاول مجدداً".

**Props:**

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  // مكوّن fallback مخصص (اختياري)
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
}
```

```tsx
import ErrorBoundary from "@/components/ErrorBoundary";

<ErrorBoundary
  fallback={({ error, resetError }) => (
    <div>
      <p>حدث خطأ: {error.message}</p>
      <button onClick={resetError}>إعادة المحاولة</button>
    </div>
  )}
>
  <MyRiskyComponent />
</ErrorBoundary>;
```

**ملاحظات:**

- يرسل الأخطاء تلقائياً إلى Sentry مع `componentStack`
- يُصدَّر مُغلَّفاً بـ `Sentry.withErrorBoundary`

---

### `LoadingState` (مجموعة مكونات)

**الملف:** `apps/web/src/components/LoadingState.tsx`

**الوصف:** مجموعة مكونات تحميل متكاملة ومُحسَّنة للإمكانية.

#### `LoadingSpinner`

```typescript
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"; // افتراضي: "md"
  className?: string;
  label?: string; // نص للـ screen readers (افتراضي: "جاري التحميل...")
}
```

#### `LoadingOverlay`

```typescript
interface LoadingOverlayProps {
  message?: string; // افتراضي: "جاري التحميل..."
  fullScreen?: boolean; // fixed أو absolute (افتراضي: true)
}
```

#### `Skeleton`

```typescript
interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular"; // افتراضي: "rectangular"
}
```

#### `LoadingCard`

```typescript
interface LoadingCardProps {
  count?: number; // عدد بطاقات skeleton (افتراضي: 1)
}
```

#### `ProgressBar`

```typescript
interface ProgressBarProps {
  value: number; // القيمة الحالية
  max?: number; // القيمة القصوى (افتراضي: 100)
  label?: string; // تسمية العرض
  className?: string;
}
```

```tsx
import { LoadingSpinner, LoadingCard, ProgressBar } from "@/components/LoadingState";

// دوّار صغير
<LoadingSpinner size="sm" />

// بطاقتان skeleton
<LoadingCard count={2} />

// شريط تقدم
<ProgressBar value={65} label="اكتمال التحليل" />
```

---

### `FileUpload`

**الملف:** `apps/web/src/components/file-upload.tsx`

**الوصف:** منطقة رفع ملفات تدعم Drag & Drop مع استخراج نص من PDF/DOCX/TXT. تعرض قائمة الملفات المرفوعة مع شريط تقدم وحالة كل ملف.

**Props:**

```typescript
interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  accept?: string; // افتراضي: ".pdf,.docx,.txt"
  maxSize?: number; // بـ MB، افتراضي: 10
  className?: string;
}
```

```tsx
import FileUpload from "@/components/file-upload";

<FileUpload
  onFileContent={(content, name) => {
    console.log(`محتوى ${name}:`, content);
  }}
  accept=".pdf,.txt"
  maxSize={20}
/>;
```

**ملاحظات:**

- PDF: يستخدم `pdfjs-dist@4.4.168`
- DOCX: يستخدم `mammoth`
- يدعم رفع ملفات متعددة في آن واحد

---

### `MainNav`

**الملف:** `apps/web/src/components/main-nav.tsx`

**الوصف:** قائمة التنقل الرئيسية داخل الـ Sidebar. تعرض 7 روابط للتطبيقات مع أيقوناتها وتظليل المسار النشط تلقائياً.

**Props:** لا توجد

```tsx
import { MainNav } from "@/components/main-nav";

// داخل مكوّن Sidebar
<MainNav />;
```

**ملاحظات:**

- تستخدم `usePathname` لتحديد الرابط النشط
- مبنية على `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton`

---

### `Logo`

**الملف:** `apps/web/src/components/logo.tsx`

**الوصف:** شعار المنصة "النسخة" كرابط للصفحة الرئيسية.

**Props:** لا توجد

```tsx
import { Logo } from "@/components/logo";

<Logo />;
```

---

### `PerformanceOptimizer`

**الملف:** `apps/web/src/components/PerformanceOptimizer.tsx`

**الوصف:** مكوّن غير مرئي (`return null`) يتتبع أداء الصفحة ويفعّل lazy loading للصور عند كل تغيير في المسار.

**Props:** لا توجد
**يُرجع:** `null`

```tsx
import { PerformanceOptimizer } from "@/components/PerformanceOptimizer";

// في layout الجذر
<PerformanceOptimizer />;
```

**المكونات المصاحبة:**

```tsx
import { PreloadResources } from "@/components/PerformanceOptimizer";
// يُضاف في <head> لـ preload الخطوط
<PreloadResources />;
```

---

### `WebVitalsReporter`

**الملف:** `apps/web/src/components/WebVitalsReporter.tsx`

**الوصف:** مكوّن غير مرئي يُهيئ تتبع Core Web Vitals (CLS, INP, FCP, LCP, TTFB) عبر Sentry عند تحميل الصفحة.

**Props:** لا توجد
**يُرجع:** `null`

```tsx
import WebVitalsReporter from "@/components/WebVitalsReporter";

// في root layout
<WebVitalsReporter />;
```

---

### `DynamicParticleBackground`

**الملف:** `apps/web/src/components/dynamic-particle-background.tsx`

**الوصف:** غلاف `next/dynamic` يحمّل `particle-background.tsx` بشكل كسول (lazy) مع SSR=false لتجنب رفع Three.js في bundle الأولي (~600KB).

**Props:** لا توجد

```tsx
import DynamicParticleBackground from "@/components/dynamic-particle-background";

<DynamicParticleBackground />;
```

---

### `V0ParticleAnimation` (particle-background)

**الملف:** `apps/web/src/components/particle-background.tsx`

**الوصف:** أنيميشن جزيئات تفاعلي ثلاثي الأبعاد مبني على Three.js. يرسم حروف "النسخة" (عربي + إنجليزي) باستخدام SDF (Signed Distance Fields). يستجيب للفأرة وإيماءات اللمس. يدعم LOD تلقائي بناءً على قدرة الجهاز.

**Props:** لا توجد

**الميزات التقنية:**

- SDF geometry لرسم الحروف العربية والإنجليزية
- نظام LOD يحدد عدد الجزيئات تلقائياً
- تأثيرات: default / spark / wave / vortex
- تنظيف تلقائي للذاكرة بعد 5 دقائق

---

### مكونات المصادقة

#### `ZKLoginForm`

**الملف:** `apps/web/src/components/auth/ZKLoginForm.tsx`

**الوصف:** نموذج تسجيل دخول Zero-Knowledge. يشتق `authVerifier` محلياً من كلمة المرور ثم يرسله للسيرفر بدلاً من كلمة المرور نفسها.

**Props:** لا توجد

**التدفق:**

1. جلب `kdfSalt` من `/api/auth/zk-login-init`
2. اشتقاق `authVerifier` محلياً
3. إرسال `authVerifier` إلى `/api/auth/zk-login-verify`
4. حفظ KEK في الذاكرة عبر `getKeyManager()`

```tsx
import { ZKLoginForm } from "@/components/auth/ZKLoginForm";

<ZKLoginForm />;
```

---

#### `ZKSignupForm`

**الملف:** `apps/web/src/components/auth/ZKSignupForm.tsx`

**الوصف:** نموذج تسجيل Zero-Knowledge بخطوتين: إنشاء الحساب ثم عرض Recovery Key. كلمة المرور لا تُرسل للسيرفر أبداً.

**Props:** لا توجد

**التدفق:**

1. اشتقاق KEK و authVerifier من كلمة المرور
2. توليد Recovery Key عشوائي
3. إرسال authVerifier فقط إلى `/api/auth/zk-signup`
4. عرض Recovery Key للمستخدم

```tsx
import { ZKSignupForm } from "@/components/auth/ZKSignupForm";

<ZKSignupForm />;
```

---

#### `BYOAPISettings`

**الملف:** `apps/web/src/components/auth/BYOAPISettings.tsx`

**الوصف:** واجهة إدارة مفاتيح API الخاصة بالمستخدم (Bring Your Own API). المفاتيح مشفرة ومخزنة محلياً فقط.

**Props:** لا توجد

**الميزات:**

- عرض قائمة المزودين المحفوظين
- إضافة مزود جديد مع اختبار الاتصال
- حذف مزود
- لا يتصل بأي خادم خارجي

```tsx
import { BYOAPISettings } from "@/components/auth/BYOAPISettings";

<BYOAPISettings />;
```

---

### مكونات التقارير

#### `AgentReportViewer`

**الملف:** `apps/web/src/components/agent-report-viewer.tsx`

**الوصف:** عارض تقارير الوكلاء في Dialog. يعرض التحليل ومستوى الثقة والملاحظات مع خيار التصدير كملف `.txt`.

**Props:**

```typescript
interface AgentReportViewerProps {
  report: AgentReport; // بيانات التقرير
  trigger?: React.ReactNode; // عنصر التفعيل (افتراضي: زر "عرض التقرير")
}

interface AgentReport {
  agentName: string;
  agentId: string;
  text: string;
  confidence: number; // 0 إلى 1
  notes?: string[];
  timestamp?: string;
  metadata?: Record<string, any>;
}
```

```tsx
import { AgentReportViewer } from "@/components/agent-report-viewer";

<AgentReportViewer
  report={{
    agentName: "وكيل تحليل النص",
    agentId: "text-analyzer",
    text: "نتائج التحليل...",
    confidence: 0.85,
    notes: ["ملاحظة 1", "ملاحظة 2"],
  }}
/>;
```

---

#### `AgentReportsExporter`

**الملف:** `apps/web/src/components/agent-report-viewer.tsx`

**الوصف:** زر تصدير شامل لجميع تقارير الوكلاء في ملف `.txt` واحد مع ملخص تنفيذي.

**Props:**

```typescript
interface AgentReportsExporterProps {
  reports: AgentReport[];
  projectTitle?: string;
}
```

```tsx
import { AgentReportsExporter } from "@/components/agent-report-viewer";

<AgentReportsExporter
  reports={allReports}
  projectTitle="مشروع الفيلم الجديد"
/>;
```

---

### `AnalysisSubmitButton`

**الملف:** `apps/web/src/components/analysis-submit-button.tsx`

**الوصف:** زر إرسال نماذج يستخدم `useFormStatus` من React DOM. يُعطّل نفسه ويعرض spinner عند حالة `pending`.

**Props:**

```typescript
interface AnalysisSubmitButtonProps {
  children: React.ReactNode;
}
```

```tsx
import { AnalysisSubmitButton } from "@/components/analysis-submit-button";

<form action={myServerAction}>
  <AnalysisSubmitButton>تحليل النص</AnalysisSubmitButton>
</form>;
```

**ملاحظات:**

- يجب استخدامه داخل `<form>` مع React Server Actions

---

### `NotificationProvider`

**الملف:** `apps/web/src/components/providers/notification-provider.tsx`

**الوصف:** Provider يُغلّف التطبيق ويربط `useNotificationStore` بـ `NotificationCenter`.

**Props:**

```typescript
interface NotificationProviderProps {
  children: React.ReactNode;
}
```

```tsx
import { NotificationProvider } from "@/components/providers/notification-provider";

// في root layout
<NotificationProvider>{children}</NotificationProvider>;
```

---

### `ExternalAppFrame`

**الملف:** `apps/web/src/components/common/ExternalAppFrame.tsx`

**الوصف:** iframe آمن لتضمين تطبيقات خارجية مع حالات التحميل والخطأ.

**Props:**

```typescript
interface ExternalAppFrameProps {
  title: string; // عنوان الـ iframe (accessibility)
  url: string; // رابط التطبيق الخارجي
}
```

```tsx
import ExternalAppFrame from "@/components/common/ExternalAppFrame";

<ExternalAppFrame title="أداة تحليل خارجية" url="https://tool.example.com" />;
```

**ملاحظات:**

- `sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"`
- يعرض رسالة خطأ عربية عند فشل التحميل

---

### `ImageWithFallback`

**الملف:** `apps/web/src/components/figma/ImageWithFallback.tsx`

**الوصف:** صورة مع fallback SVG شفاف عند فشل التحميل. يقبل جميع خصائص `<img>` القياسية.

**Props:** `React.ImgHTMLAttributes<HTMLImageElement>`

```tsx
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

<ImageWithFallback
  src="/path/to/image.jpg"
  alt="وصف الصورة"
  className="w-full h-full object-cover"
/>;
```

---

## 4. مكونات واجهة المستخدم المخصصة (ui/)

مكونات في `apps/web/src/components/ui/` تتجاوز shadcn الأصلي:

---

### `NotificationCenter`

**الملف:** `apps/web/src/components/ui/notification-center.tsx`

**الوصف:** مركز الإشعارات المنبثقة مع Framer Motion. يدعم 5 أنواع ومواقع ظهور متعددة.

**Props:**

```typescript
interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  maxVisible?: number; // افتراضي: 3
}

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info" | "ai";
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}
```

---

### `CommandPalette`

**الملف:** `apps/web/src/components/ui/command-palette.tsx`

**الوصف:** لوحة أوامر ذكية تُفعَّل بـ `Ctrl/Cmd+K`. تتضمن بحثاً، سجل أوامر حديثة، اقتراحات AI، ودعم البحث الصوتي.

```typescript
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands?: CommandItem[];
}
```

---

### `InfiniteCanvas`

**الملف:** `apps/web/src/components/ui/infinite-canvas.tsx`

**الوصف:** لوحة رسم لا نهائية للعصف الذهني. تدعم إضافة nodes وتوصيلها بخطوط Bezier مع Pan/Zoom.

```typescript
interface InfiniteCanvasProps {
  nodes?: IdeaNode[];
  onNodesChange?: (nodes: IdeaNode[]) => void;
  className?: string;
}
```

---

### `VirtualizedGrid`

**الملف:** `apps/web/src/components/ui/virtualized-grid.tsx`

**الوصف:** شبكة مُحسَّنة للأداء تعرض عدداً كبيراً من العناصر مع Virtualization.

```typescript
interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount?: number; // افتراضي: 3
  itemHeight?: number; // افتراضي: 400
  itemWidth?: number; // افتراضي: 350
  gap?: number; // افتراضي: 16
  className?: string;
  overscanRowCount?: number; // افتراضي: 2
}
```

---

### `ViewTransition`

**الملف:** `apps/web/src/components/ui/view-transition.tsx`

**الوصف:** غلاف يستخدم View Transitions API للانتقالات السلسة بين الصفحات مع fallback للمتصفحات غير الداعمة.

**المُصدَّرات:**

- `ViewTransition` — مكوّن wrapper
- `useViewTransition()` — hook للتحكم البرمجي
- `ViewTransitionLink` — رابط مع انتقال تلقائي

```typescript
interface ViewTransitionProps {
  children: React.ReactNode;
  className?: string;
}
```

---

### `DynamicChart`

**الملف:** `apps/web/src/components/ui/dynamic-chart.tsx`

**الوصف:** نسخ كسولة (lazy-loaded) من مكونات `recharts` لتقليل الـ bundle الأولي.

**المُصدَّرات:**

- `DynamicChartContainer`
- `DynamicChartTooltip`
- وغيرها من مكونات recharts

---

### `DynamicMotion`

**الملف:** `apps/web/src/components/ui/dynamic-motion.tsx`

**الوصف:** تحميل كسول لمكونات `framer-motion` لتقليل الـ bundle.

---

## 5. تصنيف المكونات

### التخطيط (Layout)

| المكوّن                | المسار                                           |
| ---------------------- | ------------------------------------------------ |
| `NotificationProvider` | `components/providers/notification-provider.tsx` |
| `ExternalAppFrame`     | `components/common/ExternalAppFrame.tsx`         |
| `ViewTransition`       | `components/ui/view-transition.tsx`              |
| `Sidebar` (shadcn)     | `components/ui/sidebar.tsx`                      |
| `Sheet` (shadcn)       | `components/ui/sheet.tsx`                        |
| `Separator` (shadcn)   | `components/ui/separator.tsx`                    |

### التنقل (Navigation)

| المكوّن                 | المسار                              |
| ----------------------- | ----------------------------------- |
| `MainNav`               | `components/main-nav.tsx`           |
| `Logo`                  | `components/logo.tsx`               |
| `CommandPalette`        | `components/ui/command-palette.tsx` |
| `Menubar` (shadcn)      | `components/ui/menubar.tsx`         |
| `Tabs` (shadcn)         | `components/ui/tabs.tsx`            |
| `DropdownMenu` (shadcn) | `components/ui/dropdown-menu.tsx`   |

### النماذج (Forms)

| المكوّن                | المسار                                  |
| ---------------------- | --------------------------------------- |
| `ZKLoginForm`          | `components/auth/ZKLoginForm.tsx`       |
| `ZKSignupForm`         | `components/auth/ZKSignupForm.tsx`      |
| `BYOAPISettings`       | `components/auth/BYOAPISettings.tsx`    |
| `FileUpload`           | `components/file-upload.tsx`            |
| `AnalysisSubmitButton` | `components/analysis-submit-button.tsx` |
| `Form` (shadcn)        | `components/ui/form.tsx`                |
| `Input` (shadcn)       | `components/ui/input.tsx`               |
| `Textarea` (shadcn)    | `components/ui/textarea.tsx`            |
| `Select` (shadcn)      | `components/ui/select.tsx`              |
| `Checkbox` (shadcn)    | `components/ui/checkbox.tsx`            |
| `RadioGroup` (shadcn)  | `components/ui/radio-group.tsx`         |
| `Switch` (shadcn)      | `components/ui/switch.tsx`              |
| `Slider` (shadcn)      | `components/ui/slider.tsx`              |

### عرض البيانات (Data Display)

| المكوّن                | المسار                               |
| ---------------------- | ------------------------------------ |
| `AgentReportViewer`    | `components/agent-report-viewer.tsx` |
| `AgentReportsExporter` | `components/agent-report-viewer.tsx` |
| `VirtualizedGrid`      | `components/ui/virtualized-grid.tsx` |
| `DynamicChart`         | `components/ui/dynamic-chart.tsx`    |
| `InfiniteCanvas`       | `components/ui/infinite-canvas.tsx`  |
| `Table` (shadcn)       | `components/ui/table.tsx`            |
| `Card` (shadcn)        | `components/ui/card.tsx`             |
| `Badge` (shadcn)       | `components/ui/badge.tsx`            |
| `Avatar` (shadcn)      | `components/ui/avatar.tsx`           |
| `Accordion` (shadcn)   | `components/ui/accordion.tsx`        |
| `Carousel` (shadcn)    | `components/ui/carousel.tsx`         |
| `ScrollArea` (shadcn)  | `components/ui/scroll-area.tsx`      |

### التغذية الراجعة (Feedback)

| المكوّن                      | المسار                                  |
| ---------------------------- | --------------------------------------- |
| `ErrorBoundary`              | `components/ErrorBoundary.tsx`          |
| `LoadingSpinner`             | `components/LoadingState.tsx`           |
| `LoadingOverlay`             | `components/LoadingState.tsx`           |
| `LoadingCard`                | `components/LoadingState.tsx`           |
| `ProgressBar`                | `components/LoadingState.tsx`           |
| `NotificationCenter`         | `components/ui/notification-center.tsx` |
| `Alert` (shadcn)             | `components/ui/alert.tsx`               |
| `AlertDialog` (shadcn)       | `components/ui/alert-dialog.tsx`        |
| `Toast` + `Toaster` (shadcn) | `components/ui/toast.tsx`               |
| `Progress` (shadcn)          | `components/ui/progress.tsx`            |
| `Skeleton` (shadcn)          | `components/ui/skeleton.tsx`            |

### الحركة والرسوم (Animation)

| المكوّن            | المسار                                       |
| ------------------ | -------------------------------------------- |
| `HeroAnimation`    | `components/HeroAnimation.tsx`               |
| `VideoTextMask`    | `components/VideoTextMask.tsx`               |
| `TextRevealByWord` | `components/aceternity/text-reveal.tsx`      |
| `BackgroundBeams`  | `components/aceternity/background-beams.tsx` |
| `CardSpotlight`    | `components/aceternity/card-spotlight.tsx`   |
| `DynamicMotion`    | `components/ui/dynamic-motion.tsx`           |
| `AppGrid`          | `components/AppGrid.tsx`                     |

### ثلاثي الأبعاد (3D)

| المكوّن                     | المسار                                       |
| --------------------------- | -------------------------------------------- |
| `V0ParticleAnimation`       | `components/particle-background.tsx`         |
| `DynamicParticleBackground` | `components/dynamic-particle-background.tsx` |

### البنية التحتية / الأداء (Infrastructure)

| المكوّن                | المسار                                       |
| ---------------------- | -------------------------------------------- |
| `PerformanceOptimizer` | `components/PerformanceOptimizer.tsx`        |
| `WebVitalsReporter`    | `components/WebVitalsReporter.tsx`           |
| `ImageWithFallback`    | `components/figma/ImageWithFallback.tsx`     |
| `NoiseBackground`      | `components/aceternity/noise-background.tsx` |

---

## 6. كيفية إنشاء مكوّن جديد

### الخطوة 1: تحديد نوع المكوّن

| النوع             | المسار المناسب                            |
| ----------------- | ----------------------------------------- |
| مكوّن shadcn جديد | `src/components/ui/`                      |
| مكوّن مشترك عام   | `src/components/shared/`                  |
| مكوّن مصادقة      | `src/components/auth/`                    |
| مكوّن خاص بصفحة   | `src/app/(main)/<اسم-الصفحة>/components/` |
| Provider/Context  | `src/components/providers/`               |

### الخطوة 2: إضافة مكوّن shadcn

```bash
# من مجلد apps/web
pnpm dlx shadcn@latest add <component-name>
```

المكوّن سيُضاف تلقائياً إلى `src/components/ui/`.

### الخطوة 3: إنشاء مكوّن مخصص

نموذج للمكوّن المخصص (`src/components/MyComponent.tsx`):

```tsx
"use client"; // فقط إذا كان يستخدم state أو browser APIs

import * as React from "react";
import { cn } from "@/lib/utils";

// 1. تعريف Props بـ TypeScript
interface MyComponentProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

// 2. تصدير مسمى (Named Export)
export function MyComponent({
  title,
  description,
  className,
  children,
}: MyComponentProps) {
  return (
    <div className={cn("base-classes", className)} dir="rtl">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
```

### الخطوة 4: قواعد يجب اتباعها

1. **اتجاه النص:** أضف `dir="rtl"` على الحاويات الرئيسية لمحتوى عربي
2. **تسمية الملفات:** `kebab-case` للملفات، `PascalCase` للمكونات
3. **التصدير:** استخدم Named Exports (`export function`) وليس Default Export إلا عند الضرورة
4. **cn utility:** استخدم `cn()` من `@/lib/utils` لدمج className
5. **"use client":** أضفه فقط عند الحاجة (state, effects, browser APIs)
6. **إمكانية الوصول:** أضف `aria-*` attributes للعناصر التفاعلية
7. **الأداء:** للمكونات الثقيلة استخدم `next/dynamic` مع `ssr: false`
8. **الأخطاء:** غلّف المكونات الخطرة بـ `ErrorBoundary`

### الخطوة 5: نموذج مكوّن مع dynamic loading

```tsx
// src/components/HeavyFeature.tsx
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("./HeavyComponentImpl"), {
  loading: () => <div>جاري التحميل...</div>,
  ssr: false,
});

export default HeavyComponent;
```

### الخطوة 6: إضافة الإشعارات

```tsx
import { useNotificationStore } from "@/hooks/use-notifications";

function MyComponent() {
  const { addNotification } = useNotificationStore();

  const handleSuccess = () => {
    addNotification({
      id: Date.now().toString(),
      type: "success",
      title: "تم بنجاح",
      message: "اكتملت العملية",
    });
  };
}
```

---

## ملاحظات مهمة

- **نسخة مكررة:** بعض المكونات موجودة في `components/` و`components/shared/` في آن واحد. الإصدار الرسمي هو ما في المسار الجذر (`components/`).
- **مكونات BUDGET:** تحتوي `apps/web/src/app/(main)/BUDGET/components/ui/` على نسخ محلية من shadcn مستقلة عن المكتبة الرئيسية.
- **الدعم العربي:** جميع المكونات المخصصة مبنية مع RTL أصيل. استخدم `dir="rtl"` و`space-x-reverse` عند الحاجة.
- **الثيم:** اللون الذهبي `#FFD700` هو اللون المميز للمنصة، يُستخدم في التوهجات والحدود والزخارف.

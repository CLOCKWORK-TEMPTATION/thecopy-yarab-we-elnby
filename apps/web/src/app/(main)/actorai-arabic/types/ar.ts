/**
 * @fileoverview أنواع AR/MR (الواقع المعزز/المختلط)
 */

/**
 * حالة ميزة AR
 */
export type ARFeatureStatus = "ready" | "coming_soon";

/**
 * واجهة ميزة الواقع المعزز
 * @description تمثل ميزة واحدة من ميزات AR/MR
 */
export interface ARFeature {
  /** المعرف الفريد للميزة */
  id: string;
  /** اسم الميزة */
  name: string;
  /** وصف الميزة */
  description: string;
  /** رمز الميزة (إيموجي) */
  icon: string;
  /** حالة الميزة */
  status: ARFeatureStatus;
}

/**
 * موضع التلقين النصي
 */
export type TeleprompterPosition = "top" | "center" | "bottom";

/**
 * واجهة إعدادات جهاز التلقين
 * @description إعدادات عرض النص على التلقين الافتراضي
 */
export interface TeleprompterSettings {
  /** سرعة التمرير (0-100) */
  speed: number;
  /** حجم الخط */
  fontSize: number;
  /** شفافية الخلفية (0-100) */
  opacity: number;
  /** موضع النص على الشاشة */
  position: TeleprompterPosition;
}

/**
 * واجهة علامة الحركة (Blocking)
 * @description علامة موضعية على الأرض لتحديد مواقع الحركة
 */
export interface BlockingMark {
  /** المعرف الفريد للعلامة */
  id: string;
  /** الموضع الأفقي (%) */
  x: number;
  /** الموضع الرأسي (%) */
  y: number;
  /** تسمية العلامة */
  label: string;
  /** لون العلامة */
  color: string;
}

/**
 * نوع اللقطة السينمائية
 */
export type ShotType = "closeup" | "medium" | "wide" | "extreme_wide";

/**
 * نسبة العرض للكاميرا
 */
export type AspectRatio = "16:9" | "2.35:1" | "4:3" | "1:1";

/**
 * واجهة إعدادات عين الكاميرا
 * @description إعدادات الكاميرا الافتراضية لفهم التكوين
 */
export interface CameraEyeSettings {
  /** البعد البؤري (مم) */
  focalLength: number;
  /** نوع اللقطة */
  shotType: ShotType;
  /** نسبة العرض */
  aspectRatio: AspectRatio;
}

/**
 * واجهة الشريك الهولوغرافي
 * @description إعدادات الشريك الافتراضي للتدريب
 */
export interface HolographicPartner {
  /** اسم الشخصية */
  character: string;
  /** المشاعر الحالية */
  emotion: string;
  /** شدة المشاعر (0-100) */
  intensity: number;
  /** هل الشريك نشط */
  isActive: boolean;
}

/**
 * نوع التحكم بالإيماءات
 */
export type GestureType = "eye" | "hand" | "head" | "voice";

/**
 * واجهة التحكم بالإيماءات
 * @description تعريف إيماءة تحكم واحدة
 */
export interface GestureControl {
  /** المعرف الفريد */
  id: string;
  /** اسم الإيماءة */
  name: string;
  /** أيقونة الإيماءة */
  icon: string;
  /** نوع الإيماءة */
  type: GestureType;
  /** الإجراء المرتبط */
  action: string;
  /** هل الإيماءة مفعلة */
  enabled: boolean;
}

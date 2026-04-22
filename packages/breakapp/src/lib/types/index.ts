/**
 * أنواع BREAKAPP المشتركة
 * 
 * @description
 * يجمع كل تعريفات الأنواع المستخدمة في تطبيق إدارة الإنتاج السينمائي
 * لضمان سلامة النوعية في جميع أنحاء التطبيق
 */

import { z } from 'zod';

// ==================== مخططات التحقق (Validation Schemas) ====================

/**
 * مخطط التحقق من بيانات JWT المُستخرجة
 * 
 * @description
 * يُستخدم للتحقق من صحة البيانات المُستخرجة من رمز JWT
 */
export const JWTPayloadSchema = z.object({
  /** معرّف المستخدم الفريد */
  sub: z.string(),
  /** معرّف المشروع المرتبط */
  projectId: z.string(),
  /** دور المستخدم في المشروع */
  role: z.string(),
  /** وقت انتهاء صلاحية الرمز (بالثواني منذ Unix Epoch) */
  exp: z.number(),
  /** وقت إصدار الرمز (اختياري) */
  iat: z.number().optional(),
});

/**
 * مخطط التحقق من رمز QR
 * 
 * @description
 * يتحقق من صيغة رمز QR قبل إرساله للمصادقة
 */
export const QRTokenSchema = z.string()
  .min(1, 'رمز QR مطلوب')
  .refine(
    (val) => val.split(':').length === 3,
    'صيغة رمز QR غير صالحة - يجب أن يحتوي على ثلاثة أجزاء'
  );

/**
 * مخطط التحقق من بيانات المصادقة
 */
export const AuthResponseSchema = z.object({
  access_token: z.string(),
  user: z.object({
    id: z.string(),
    projectId: z.string(),
    role: z.string(),
    email: z.string().optional(),
  }),
});

/**
 * مخطط التحقق من طلب مسح QR
 */
export const ScanQRRequestSchema = z.object({
  qr_token: z.string().min(1),
  device_hash: z.string().min(1),
});

// ==================== أنواع TypeScript ====================

/**
 * بيانات JWT المُستخرجة
 */
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

/**
 * استجابة المصادقة من الخادم
 */
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * بيانات المستخدم الحالي
 */
export interface CurrentUser {
  /** معرّف المستخدم الفريد */
  userId: string;
  /** معرّف المشروع المرتبط */
  projectId: string;
  /** دور المستخدم في المشروع */
  role: string;
}

/**
 * حالة الاتصال
 */
export type ConnectionState = 'connected' | 'disconnected' | 'checking';

/**
 * حالة اتصال كاملة
 */
export interface ConnectionStatus {
  /** حالة اتصال API */
  api: ConnectionState;
  /** حالة اتصال WebSocket */
  socket: ConnectionState;
  /** رسالة حالة API */
  apiMessage?: string;
  /** رسالة حالة Socket */
  socketMessage?: string;
}

/**
 * خيارات اتصال Socket
 */
export interface SocketConnectionOptions {
  /** عنوان URL للخادم */
  url?: string;
  /** الاتصال التلقائي عند التحميل */
  autoConnect?: boolean;
  /** تضمين رمز المصادقة */
  auth?: boolean;
}

/**
 * بيانات الموقع الجغرافي
 */
export interface LocationPosition {
  /** خط العرض */
  latitude: number;
  /** خط الطول */
  longitude: number;
  /** دقة الموقع بالمتر */
  accuracy: number;
  /** الطابع الزمني للقياس */
  timestamp: number;
}

/**
 * خيارات Geolocation
 */
export interface GeolocationOptions {
  /** تفعيل الدقة العالية */
  enableHighAccuracy?: boolean;
  /** مهلة الانتظار بالملي ثانية */
  timeout?: number;
  /** الحد الأقصى لعمر البيانات المخزنة */
  maximumAge?: number;
}

/**
 * بائع/مورد
 */
export interface Vendor {
  /** معرّف البائع */
  id: string;
  /** اسم البائع */
  name: string;
  /** الموقع الثابت */
  fixed_location: { lat: number; lng: number };
  /** المسافة من موقع التصوير (اختياري) */
  distance?: number;
  /** هل هو متنقل */
  is_mobile?: boolean;
}

/**
 * بيانات البائع للخريطة
 */
export interface VendorMapData {
  /** معرّف البائع */
  id: string;
  /** اسم البائع */
  name: string;
  /** خط العرض */
  lat: number;
  /** خط الطول */
  lng: number;
  /** المسافة (اختياري) */
  distance?: number;
}

/**
 * عنصر قائمة الطعام
 */
export interface MenuItem {
  /** معرّف العنصر */
  id: string;
  /** اسم العنصر */
  name: string;
  /** الوصف */
  description?: string;
  /** هل متوفر */
  available: boolean;
  /** بيانات البائع */
  vendor?: {
    name: string;
  };
}

/**
 * عنصر في سلة الطلبات
 */
export interface OrderItem {
  /** معرّف عنصر القائمة */
  menuItemId: string;
  /** الكمية */
  quantity: number;
}

/**
 * طلب كامل
 */
export interface Order {
  /** معرّف الطلب */
  id: string;
  /** حالة الطلب */
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  /** تاريخ الإنشاء */
  created_at: string;
  /** عناصر الطلب */
  items: OrderItem[];
}

/**
 * مهمة التوصيل
 */
export interface DeliveryTask {
  /** معرّف المهمة */
  id: string;
  /** اسم البائع */
  vendorName: string;
  /** عدد العناصر */
  items: number;
  /** حالة المهمة */
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * خطأ API
 */
export interface ApiError {
  /** رسالة الخطأ */
  message: string;
  /** رمز الخطأ */
  code?: string;
  /** تفاصيل إضافية */
  details?: Record<string, unknown>;
}

/**
 * نوع استجابة API عامة
 */
export interface ApiResponse<T> {
  /** هل نجحت العملية */
  success: boolean;
  /** البيانات في حالة النجاح */
  data?: T;
  /** رسالة الخطأ في حالة الفشل */
  error?: string;
}

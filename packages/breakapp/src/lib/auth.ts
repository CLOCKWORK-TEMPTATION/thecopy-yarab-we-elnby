/**
 * خدمة المصادقة - Authentication Service
 * 
 * @description
 * توفر وظائف إدارة جلسات المستخدم والتحقق من الهوية
 * عبر رموز JWT ومسح QR للانضمام للمشاريع
 * 
 * السبب: نظام المصادقة القائم على QR يسمح لأعضاء الفريق
 * بالانضمام للمشروع بسرعة دون الحاجة لإنشاء حسابات
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  type CurrentUser,
  type AuthResponse,
  JWTPayloadSchema,
  QRTokenSchema,
} from "./types";

const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] ||
  process.env['NEXT_PUBLIC_BREAKAPP_API_URL'] ||
  "/api/breakapp";
let inMemoryAccessToken: string | null = null;

/**
 * مثيل Axios مُهيأ للتواصل مع الخادم
 * 
 * @description
 * يتضمن interceptors لإضافة رمز المصادقة تلقائياً لكل طلب
 */
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// إضافة interceptor لتضمين رمز المصادقة في كل طلب
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    config.withCredentials = true;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

/**
 * حفظ رمز JWT في الذاكرة فقط
 * 
 * @description
 * يعتمد استمرار الجلسة على الكوكي الآمن من الخادم
 * ويحتفظ بالرمز في الذاكرة فقط للطلبات الحالية
 * 
 * @param token - رمز JWT المراد تخزينه
 */
export function storeToken(token: string): void {
  inMemoryAccessToken = token;
}

/**
 * استرجاع رمز JWT من الذاكرة
 * 
 * @description
 * يجلب الرمز المؤقت للتحقق من المصادقة
 * أو لإرفاقه مع الطلبات الحالية
 * 
 * @returns رمز JWT أو null إذا لم يكن موجوداً
 */
export function getToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * حذف رمز JWT من الذاكرة
 * 
 * @description
 * يُستخدم عند تسجيل الخروج أو انتهاء صلاحية الجلسة
 */
export function removeToken(): void {
  inMemoryAccessToken = null;
}

function decodeCurrentPayload(): CurrentUser | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) {
      return null;
    }

    const decodedPayload = JSON.parse(atob(payloadBase64));
    const parsed = JWTPayloadSchema.safeParse(decodedPayload);
    if (!parsed.success) {
      return null;
    }

    return {
      userId: parsed.data.sub,
      projectId: parsed.data.projectId,
      role: parsed.data.role,
    };
  } catch {
    return null;
  }
}

/**
 * التحقق من حالة المصادقة
 * 
 * @description
 * يفحص وجود رمز JWT صالح وغير منتهي الصلاحية
 * للتأكد من أن المستخدم لا يزال مُصادقاً عليه
 * 
 * @returns true إذا كان المستخدم مُصادقاً عليه
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) {
      return false;
    }
    const decodedPayload = JSON.parse(atob(payloadBase64));
    const parsed = JWTPayloadSchema.safeParse(decodedPayload);
    if (!parsed.success) {
      return false;
    }

    return Date.now() < parsed.data.exp * 1000;
  } catch {
    return false;
  }
}

/**
 * استخراج بيانات المستخدم الحالي من الرمز
 * 
 * @description
 * يفك تشفير JWT ويستخرج معلومات المستخدم الأساسية
 * دون الحاجة للتواصل مع الخادم
 * 
 * @returns بيانات المستخدم أو null إذا لم يكن مُصادقاً
 */
export function getCurrentUser(): CurrentUser | null {
  return decodeCurrentPayload();
}

/**
 * مسح رمز QR والمصادقة
 * 
 * @description
 * يرسل رمز QR المُمسوح وبصمة الجهاز للخادم
 * للحصول على رمز JWT للوصول
 * 
 * السبب: يتيح للمستخدمين الانضمام للمشروع بمسح رمز QR
 * مما يُسهل إدارة أذونات الفريق
 * 
 * @param qrToken - رمز QR المُمسوح
 * @param deviceHash - بصمة الجهاز للتعرف عليه
 * @returns بيانات المصادقة بما فيها رمز الوصول
 * @throws خطأ إذا فشلت المصادقة
 */
export async function scanQRAndLogin(
  qrToken: string,
  deviceHash: string
): Promise<AuthResponse> {
  const validation = QRTokenSchema.safeParse(qrToken);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message || "رمز QR غير صالح");
  }

  const response = await api.post<AuthResponse>("/auth/scan-qr", {
    qr_token: qrToken,
    device_hash: deviceHash,
  });
  
  return response.data;
}

/**
 * التحقق من صلاحية رمز JWT
 * 
 * @description
 * يُرسل الرمز للخادم للتحقق من صلاحيته
 * ويُرجع بيانات الحمولة إذا كان صالحاً
 * 
 * @param token - رمز JWT للتحقق منه
 * @returns نتيجة التحقق وبيانات الحمولة
 */
export async function verifyToken(
  token: string
): Promise<{ valid: boolean; payload: CurrentUser | null }> {
  const response = await api.post<{
    valid: boolean;
    payload: CurrentUser | null;
  }>("/auth/verify", { token });
  return response.data;
}

/**
 * توليد بصمة الجهاز
 * 
 * @description
 * يُنشئ معرّف فريد للجهاز بناءً على خصائص المتصفح
 * لتتبع الأجهزة المصرح لها بالوصول
 * 
 * السبب: يمنع استخدام نفس رمز QR من أجهزة متعددة
 * غير مصرح لها
 * 
 * @returns سلسلة نصية تمثل بصمة الجهاز
 * @throws خطأ إذا تم استدعاؤها على جانب الخادم
 */
export function generateDeviceHash(): string {
  if (typeof window === "undefined") {
    throw new Error("توليد بصمة الجهاز متاح فقط على جانب العميل");
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
  ].join("|");

  let hash = 0;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash = (hash << 5) - hash + fingerprint.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}

export { api };

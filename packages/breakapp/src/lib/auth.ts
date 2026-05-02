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
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { type CurrentUser, type AuthResponse } from "./types";

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ||
  process.env["NEXT_PUBLIC_BREAKAPP_API_URL"] ||
  "/api/breakapp";
let inMemoryAccessToken: string | null = null;

/**
 * علامة تمنع لا نهائية الاستدعاء المتكرر لـ refresh عند رفض الخادم
 *
 * @description
 * السبب: لو فشل الـ refresh نفسه بـ 401 ما يجب أن نكرر محاولة refresh أخرى
 * إلى ما لا نهاية. هذه العلامة تضمن محاولة واحدة فقط لكل طلب أصلي.
 */
const RETRY_FLAG = Symbol("breakapp.auth.retry");

/**
 * نوع مُمتد للطلب الداخلي يحمل علامة إعادة المحاولة
 *
 * @description
 * يوسع InternalAxiosRequestConfig بخاصية رمزية تُستخدم فقط داخل هذا الملف
 * لمنع إعادة محاولة الطلب أكثر من مرة بعد refresh.
 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  [RETRY_FLAG]?: boolean;
}

interface DecodedJwtPayload {
  sub: string;
  projectId: string;
  role: string;
  exp: number;
  iat?: number;
}

/**
 * طابور مُنتظرين أثناء جريان refresh واحد
 *
 * @description
 * السبب: إذا وصلت عدة طلبات في نفس اللحظة ورجعت كلها 401، يجب أن يستدعي
 * واحد فقط /auth/refresh وباقي الطلبات تنتظر النتيجة بدل أن تُحدث
 * refresh متوازي ينتج عنه cookie جديد لكل محاولة.
 */
let refreshInFlight: Promise<string | null> | null = null;

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
  withCredentials: true,
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
  (error: AxiosError) => Promise.reject(error),
);

/**
 * معالج ما بعد الاستجابة لإعادة إصدار الطلب بعد refresh
 *
 * @description
 * السبب: الخادم يُصدر access_token قصير العمر ويحتفظ بـ refreshToken
 * في httpOnly cookie. عند رد 401 أول مرة، نحاول الحصول على access_token
 * جديد ثم نُعيد الطلب الأصلي مرة واحدة فقط. إن فشل refresh نمسح الذاكرة
 * ونُبلغ طبقة React بالتحويل إلى شاشة QR.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalConfig || status !== 401) {
      return Promise.reject(error);
    }

    // لا نُعيد محاولة طلب /auth/refresh نفسه لتجنب الحلقة اللانهائية
    const requestUrl = originalConfig.url ?? "";
    if (
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    if (originalConfig[RETRY_FLAG]) {
      return Promise.reject(error);
    }

    originalConfig[RETRY_FLAG] = true;

    const newToken = await refreshAccessToken();
    if (!newToken) {
      removeToken();
      notifyAuthExpired();
      return Promise.reject(error);
    }

    if (originalConfig.headers) {
      originalConfig.headers.Authorization = `Bearer ${newToken}`;
    }

    return api.request(originalConfig);
  },
);

/**
 * بث حدث انتهاء الجلسة لطبقة React
 *
 * @description
 * السبب: الحزمة لا تعرف Router مباشرةً؛ نُطلق CustomEvent يلتقطه AppShell
 * أو أي hook عالمي ويقرر وجهة التحويل (`/BREAKAPP/login/qr`).
 */
function notifyAuthExpired(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("breakapp:auth-expired"));
}

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

function parseJwtPayload(payload: unknown): DecodedJwtPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (
    typeof record["sub"] !== "string" ||
    typeof record["projectId"] !== "string" ||
    typeof record["role"] !== "string" ||
    typeof record["exp"] !== "number"
  ) {
    return null;
  }

  if (record["iat"] !== undefined && typeof record["iat"] !== "number") {
    return null;
  }

  return {
    sub: record["sub"],
    projectId: record["projectId"],
    role: record["role"],
    exp: record["exp"],
    ...(record["iat"] !== undefined ? { iat: record["iat"] } : {}),
  };
}

function decodeCurrentPayload(): DecodedJwtPayload | null {
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
    return parseJwtPayload(decodedPayload);
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
  const payload = decodeCurrentPayload();
  return payload ? Date.now() < payload.exp * 1000 : false;
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
  const payload = decodeCurrentPayload();
  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    projectId: payload.projectId,
    role: payload.role,
  };
}

/**
 * استخراج زمن انتهاء صلاحية الرمز الحالي بالملّي ثانية
 *
 * @description
 * يستخرج الحقل `exp` من JWT ويُحوّله إلى ms. يُستخدم من قِبَل `useAuthRefresh`
 * لجدولة الاستدعاء التلقائي قبل انتهاء الصلاحية.
 *
 * السبب: تجنُّب فشل 401 بالأساس عبر refresh استباقي أفضل بكثير من انتظار فشل
 * الطلب ثم التعويض.
 *
 * @returns زمن الانتهاء بالملّي ثانية منذ epoch، أو null إن لم يكن هناك توكن صالح
 */
export function getTokenExpiryMs(): number | null {
  const payload = decodeCurrentPayload();
  return payload ? payload.exp * 1000 : null;
}

/**
 * تجديد access_token باستخدام httpOnly cookie
 *
 * @description
 * يستدعي `/auth/refresh` مع `withCredentials` (مُعطى أصلاً على المثيل) ليقرأ
 * الخادم `refreshToken` cookie ويُصدر access_token جديد. عند الفشل يُرجع null
 * ولا يرمي استثناء حتى يُدار التحويل إلى شاشة QR على مستوى الاستدعاء.
 *
 * السبب: الـ access_token قصير العمر وإعادة مصادقة QR ثقيلة؛ refresh صامت
 * يحافظ على الجلسة دون تدخّل المستخدم.
 *
 * @returns التوكن الجديد أو null عند الفشل
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<string | null> => {
    try {
      const response = await api.post<{ access_token: string }>(
        "/auth/refresh",
        {},
      );
      const token = response.data?.access_token;
      if (typeof token !== "string" || token.length === 0) {
        return null;
      }
      storeToken(token);
      return token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * ضمان وجود مستخدم مصادق عليه قبل قرارات التحويل
 *
 * @description
 * يفحص الرمز الحالي أولاً، ثم يحاول تجديد access_token من كوكي التجديد
 * الآمن قبل اعتبار الجلسة منتهية. هذا يحافظ على استمرار الجلسة بعد تحديث
 * الصفحة دون تخزين الرمز في localStorage.
 */
export async function ensureAuthenticated(): Promise<CurrentUser | null> {
  if (isAuthenticated()) {
    return getCurrentUser();
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    removeToken();
    return null;
  }

  const user = getCurrentUser();
  if (!user) {
    removeToken();
    return null;
  }

  return user;
}

/**
 * إنهاء الجلسة محلياً وعلى الخادم
 *
 * @description
 * يستدعي `/auth/logout` ليطلب من الخادم مسح `refreshToken` cookie ثم يُنظّف
 * التوكن من الذاكرة. يبتلع أخطاء الشبكة ليضمن مسح الذاكرة المحلية في كل الحالات.
 *
 * السبب: لا يجب أن تبقى جلسة العميل إذا فشل استدعاء الخادم — السلوك الافتراضي
 * هو "اخرج دائماً" من المنظور المحلي.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout", {});
  } catch {
    // نتجاهل الخطأ — مسح الذاكرة أولوية مطلقة
  } finally {
    removeToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("breakapp:auth-logged-out"));
    }
  }
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
  deviceHash: string,
): Promise<AuthResponse> {
  if (!qrToken) {
    throw new Error("رمز QR مطلوب");
  }
  if (qrToken.split(":").length !== 3) {
    throw new Error("صيغة رمز QR غير صالحة - يجب أن يحتوي على ثلاثة أجزاء");
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
  token: string,
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

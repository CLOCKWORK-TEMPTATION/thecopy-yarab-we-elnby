"use client";

/**
 * صفحة تسجيل الدخول بـ QR - QR Login Page
 *
 * @description
 * تتيح للمستخدمين الانضمام للمشروع بمسح رمز QR
 * بدلاً من إنشاء حساب تقليدي
 *
 * السبب: تسريع عملية إضافة أعضاء الفريق للمشروع
 * خاصة في بيئات التصوير الميدانية السريعة
 */

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  QRTokenSchema,
  generateDeviceHash,
  scanQRAndLogin,
  storeToken,
  type AuthResponse,
} from "@the-copy/breakapp";
import type { QRScannerErrorDetail } from "@the-copy/breakapp/components/scanner/QRScanner";
import { toast } from "@/hooks/use-toast";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const QRScanner = dynamic(
  () => import("@the-copy/breakapp/components/scanner/QRScanner"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[22px] border border-white/8 bg-white/6 backdrop-blur-xl p-6 text-center text-sm text-white/55">
        جارٍ تحميل ماسح QR...
      </div>
    ),
  }
);

/**
 * عناوين الأخطاء العربية لكل سبب فشل ممكن
 * السبب: تقديم عنوان مناسب للمستخدم بدل رسالة عامة موحدة
 * المفاتيح مطابقة لـ QRCameraFailureReason + أسباب المكون الإضافية
 */
const ERROR_TITLES: Record<QRScannerErrorDetail["reason"], string> = {
  "insecure-context": "اتصال غير آمن",
  "mediadevices-unavailable": "المتصفح غير مدعوم",
  "permissions-policy-blocked": "الكاميرا محجوبة بواسطة سياسة الموقع",
  "permission-denied": "رفض الإذن للكاميرا",
  "no-camera-device": "لا توجد كاميرا",
  "device-in-use": "الكاميرا مستخدمة من تطبيق آخر",
  overconstrained: "إعدادات الكاميرا غير مدعومة",
  "manual-entry-invalid": "صيغة الرمز غير صحيحة",
  "image-decode-failed": "تعذر استخراج الرمز من الصورة",
  unknown: "خطأ غير متوقع",
};

/**
 * استجابة خطأ API
 */
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

/**
 * صفحة تسجيل الدخول بمسح QR
 */
export default function QRLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * معالجة مسح رمز QR
   */
  const handleQRScan = useCallback(
    async (qrToken: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        // التحقق من صيغة الرمز
        const validation = QRTokenSchema.safeParse(qrToken);
        if (!validation.success) {
          setError("صيغة رمز QR غير صالحة");
          toast({
            title: "خطأ في المسح",
            description: "صيغة رمز QR غير صالحة",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // توليد بصمة الجهاز
        const deviceHash = generateDeviceHash();

        // المصادقة مع الخادم
        const result: AuthResponse = await scanQRAndLogin(qrToken, deviceHash);

        // تخزين الرمز
        storeToken(result.access_token);

        // إظهار النجاح
        setSuccess(true);
        toast({
          title: "تم بنجاح",
          description: "تم المصادقة بنجاح، جارٍ التوجيه...",
        });

        // التوجيه للوحة التحكم — مسار صحيح
        setTimeout(() => {
          router.push("/BREAKAPP/dashboard");
        }, 1500);
      } catch (err: unknown) {
        const apiError = err as ApiErrorResponse;
        const errorMsg =
          apiError?.response?.data?.message ||
          apiError?.message ||
          "فشلت عملية المصادقة";
        setError(errorMsg);
        toast({
          title: "فشل المصادقة",
          description: errorMsg,
          variant: "destructive",
        });
        setLoading(false);
      }
    },
    [router]
  );

  /**
   * معالجة خطأ المسح القادم من QRScanner
   * يستقبل detail يحتوي على سبب الفشل والرسالة العربية الموجّهة
   * السبب: توفير تجربة خطأ متسقة عبر مسارات الكاميرا والرفع والإدخال اليدوي
   */
  const handleScanError = useCallback((detail: QRScannerErrorDetail): void => {
    const title = ERROR_TITLES[detail.reason] ?? "خطأ في المسح";
    setError(detail.message);
    toast({
      title,
      description: detail.message,
      variant: "destructive",
    });
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center bg-black/8 backdrop-blur-xl p-4"
    >
      <CardSpotlight className="max-w-md w-full overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-8">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
            Break Break
          </h1>
          <p className="text-white/55 font-cairo">
            امسح رمز QR للانضمام لمشروعك
          </p>
        </div>

        {success ? (
          /* حالة النجاح */
          <div className="text-center p-8">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-cairo">
              نجاح!
            </h2>
            <p className="text-white/55 font-cairo">
              جارٍ التوجيه للوحة التحكم...
            </p>
          </div>
        ) : (
          <>
            {/* ماسح QR */}
            <QRScanner onScan={handleQRScan} onError={handleScanError} />

            {/* مؤشر التحميل */}
            {loading && (
              <div className="mt-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
                <p className="mt-2 text-sm text-white/55 font-cairo">
                  جارٍ المصادقة...
                </p>
              </div>
            )}

            {/* رسالة الخطأ */}
            {error && (
              <div className="mt-6 p-4 bg-white/6 text-white/85 rounded-[22px] border border-white/8">
                <p className="text-sm font-medium font-cairo">فشلت المصادقة</p>
                <p className="text-sm mt-1 font-cairo">{error}</p>
              </div>
            )}
          </>
        )}
      </CardSpotlight>

      {/* تعليمات */}
      <div className="mt-8 text-center text-sm text-white/55">
        <p className="font-cairo">تأكد من منح إذن الوصول للكاميرا</p>
      </div>
    </div>
  );
}

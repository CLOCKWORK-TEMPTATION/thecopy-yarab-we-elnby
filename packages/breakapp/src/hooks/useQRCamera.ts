'use client';

/**
 * ============================================================================
 * useQRCamera — Hook إدارة كاميرا QR بمستوى إنتاج حقيقي
 * ============================================================================
 *
 * @description
 * يغلّف كامل دورة حياة الوصول إلى الكاميرا لمسح رموز QR، ويحدد الحالات التالية:
 *   - idle: البدء قبل أي محاولة
 *   - checking-environment: فحص البيئة (SecureContext / mediaDevices / الأجهزة)
 *   - prompting-permission: المتصفح يعرض نافذة طلب الصلاحية على المستخدم
 *   - ready-to-start: البيئة صالحة والصلاحية ممنوحة ويمكن بدء المسح
 *   - scanning: stream فعلي يعمل ومسح نشط
 *   - stopped: تم الإيقاف يدوياً
 *   - unsupported: البيئة غير مدعومة (No SecureContext / No mediaDevices)
 *   - permission-denied: المستخدم رفض الصلاحية
 *   - no-device: لا يوجد كاميرا فعلياً
 *   - error: خطأ عام مع تفاصيل
 *
 * السبب الهندسي:
 *   المكون السابق كان يستدعي Html5Qrcode.start مباشرة دون تحقق من البيئة،
 *   فكانت رسائل الفشل عامة وغير قابلة للتصرف، ولم يكن هناك مسار بديل.
 *   هذا الـ hook يفصل منطق البيئة عن منطق العرض، ويوفر واجهة محسوبة
 *   تسمح بالمعالجة البديلة (إدخال يدوي / رفع صورة) بشكل منضبط.
 *
 * @example
 * ```tsx
 * const camera = useQRCamera({
 *   elementId: 'qr-viewport',
 *   onDecoded: (code) => console.log(code),
 * });
 *
 * if (camera.status === 'unsupported') return <ManualEntryFallback />;
 * if (camera.status === 'permission-denied') return <ImageUploadFallback />;
 * ```
 * ============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * الحالات المحددة لآلة حالة الكاميرا
 */
export type QRCameraStatus =
  | 'idle'
  | 'checking-environment'
  | 'prompting-permission'
  | 'ready-to-start'
  | 'scanning'
  | 'stopped'
  | 'unsupported'
  | 'permission-denied'
  | 'no-device'
  | 'error';

/**
 * تصنيف سبب الفشل لمعالجة بديلة منضبطة
 */
export type QRCameraFailureReason =
  | 'insecure-context'
  | 'mediadevices-unavailable'
  | 'permissions-policy-blocked'
  | 'permission-denied'
  | 'no-camera-device'
  | 'device-in-use'
  | 'overconstrained'
  | 'unknown';

/**
 * خصائص إنشاء Hook الكاميرا
 */
export interface UseQRCameraOptions {
  /** معرّف عنصر DOM الذي ستُعرض فيه معاينة الكاميرا */
  elementId: string;
  /** دالة تُستدعى عند قراءة رمز QR بنجاح */
  onDecoded: (text: string) => void;
  /** وضع الكاميرا المفضل (الافتراضي: خلفية للهاتف) */
  facingMode?: 'environment' | 'user';
  /** معدل الإطارات في الثانية (الافتراضي: 10) */
  fps?: number;
  /** حجم مربع المسح */
  qrbox?: { width: number; height: number };
  /** تمكين التسجيل التفصيلي */
  verboseLogging?: boolean;
}

/**
 * القيمة المُرجعة من الـ hook
 */
export interface UseQRCameraReturn {
  status: QRCameraStatus;
  failureReason: QRCameraFailureReason | null;
  errorMessage: string | null;
  isSecureContext: boolean;
  hasMediaDevicesApi: boolean;
  hasCameraDevice: boolean | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  retry: () => Promise<void>;
  scanImageFile: (file: File) => Promise<string>;
}

/**
 * ترجمة رسائل الخطأ الفنية إلى رسائل عربية قابلة للتصرف
 */
function translateMediaError(
  err: unknown
): { reason: QRCameraFailureReason; message: string } {
  const name = (err as { name?: string })?.name ?? '';
  const rawMessage = (err as { message?: string })?.message ?? '';

  // NotAllowedError — رفض الصلاحية أو حظر الـ policy
  if (name === 'NotAllowedError' || /permission/i.test(rawMessage)) {
    // التمييز بين رفض صريح من المستخدم وحظر policy
    if (/policy/i.test(rawMessage) || /disabled/i.test(rawMessage)) {
      return {
        reason: 'permissions-policy-blocked',
        message:
          'الكاميرا محجوبة بواسطة سياسة أذونات الموقع. يلزم تحديث إعدادات الخادم لتفعيلها.',
      };
    }
    return {
      reason: 'permission-denied',
      message:
        'لم يتم منح صلاحية الكاميرا. يمكنك إعادة المحاولة بعد السماح، أو استخدام رفع صورة QR أو الإدخال اليدوي.',
    };
  }

  // NotFoundError — لا يوجد كاميرا
  if (name === 'NotFoundError' || /not found/i.test(rawMessage)) {
    return {
      reason: 'no-camera-device',
      message:
        'لا توجد كاميرا متاحة على هذا الجهاز. يرجى استخدام رفع صورة QR أو الإدخال اليدوي.',
    };
  }

  // NotReadableError — الكاميرا مستخدمة من تطبيق آخر
  if (name === 'NotReadableError' || /in use/i.test(rawMessage)) {
    return {
      reason: 'device-in-use',
      message:
        'الكاميرا مستخدمة من تطبيق آخر. أغلق التطبيقات الأخرى ثم أعد المحاولة.',
    };
  }

  // OverconstrainedError — القيود المطلوبة غير متوفرة
  if (name === 'OverconstrainedError' || /constraint/i.test(rawMessage)) {
    return {
      reason: 'overconstrained',
      message:
        'الكاميرا المتاحة لا تدعم الإعدادات المطلوبة. جارٍ المحاولة بإعدادات مرنة...',
    };
  }

  return {
    reason: 'unknown',
    message: rawMessage || 'تعذر تشغيل الكاميرا لسبب غير معروف.',
  };
}

/**
 * واجهة مبسطة لمكتبة html5-qrcode لتفادي استيرادها على الخادم
 */
interface Html5QrcodeLike {
  start: (
    cameraIdOrConfig: MediaTrackConstraints | string,
    config: { fps: number; qrbox?: { width: number; height: number } },
    onSuccess: (decoded: string) => void,
    onError: (err: string) => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
  scanFile: (file: File, showImage?: boolean) => Promise<string>;
  isScanning: boolean;
}

/**
 * ============================================================================
 * Hook الرئيسي: useQRCamera
 * ============================================================================
 */
export function useQRCamera(options: UseQRCameraOptions): UseQRCameraReturn {
  const {
    elementId,
    onDecoded,
    facingMode = 'environment',
    fps = 10,
    qrbox = { width: 250, height: 250 },
    verboseLogging = false,
  } = options;

  const [status, setStatus] = useState<QRCameraStatus>('idle');
  const [failureReason, setFailureReason] =
    useState<QRCameraFailureReason | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [hasMediaDevicesApi, setHasMediaDevicesApi] = useState<boolean>(true);
  const [hasCameraDevice, setHasCameraDevice] = useState<boolean | null>(null);

  const scannerRef = useRef<Html5QrcodeLike | null>(null);
  const isMountedRef = useRef<boolean>(true);

  /**
   * تسجيل منظّم (بدلاً من console.log المباشر)
   */
  const log = useCallback(
    (level: 'debug' | 'warn' | 'error', message: string, extra?: unknown) => {
      if (!verboseLogging && level === 'debug') return;
      if (typeof window === 'undefined') return;
      const logger = (
        window as unknown as { __breakappLogger?: (data: unknown) => void }
      ).__breakappLogger;
      if (logger) {
        logger({ scope: 'useQRCamera', level, message, extra });
      } else if (level === 'error') {
        window.dispatchEvent(
          new CustomEvent('breakapp:log', {
            detail: { scope: 'useQRCamera', level, message, extra },
          })
        );
      }
    },
    [verboseLogging]
  );

  /**
   * فحص البيئة: SecureContext + mediaDevices + وجود كاميرا
   */
  const checkEnvironment = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return false;
    }

    setStatus('checking-environment');

    // فحص SecureContext (HTTPS / localhost)
    const secure = window.isSecureContext === true;
    setIsSecureContext(secure);
    if (!secure) {
      log('warn', 'سياق غير آمن — getUserMedia لن يعمل');
      setFailureReason('insecure-context');
      setErrorMessage(
        'الموقع يعمل على اتصال غير آمن. الكاميرا تتطلب HTTPS.'
      );
      setStatus('unsupported');
      return false;
    }

    // فحص توفر mediaDevices API
    const hasApi =
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia);
    setHasMediaDevicesApi(hasApi);
    if (!hasApi) {
      log('warn', 'mediaDevices API غير متوفر');
      setFailureReason('mediadevices-unavailable');
      setErrorMessage(
        'المتصفح لا يدعم الوصول إلى الكاميرا. جرّب متصفحاً أحدث.'
      );
      setStatus('unsupported');
      return false;
    }

    // محاولة تعداد الأجهزة (لا يتطلب صلاحية، لكن يعيد labels فارغة قبل المنح)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      setHasCameraDevice(cameras.length > 0);
      if (cameras.length === 0) {
        log('warn', 'لا توجد أجهزة كاميرا');
        setFailureReason('no-camera-device');
        setErrorMessage(
          'لم يُكتشف أي جهاز كاميرا. استخدم رفع الصورة أو الإدخال اليدوي.'
        );
        setStatus('no-device');
        return false;
      }
    } catch (err) {
      log('warn', 'فشل تعداد الأجهزة — سنكمل مع ذلك', err);
      // لا نفشل كلياً — بعض المتصفحات ترفض enumerate قبل منح الصلاحية
      setHasCameraDevice(null);
    }

    return true;
  }, [log]);

  /**
   * استيراد كسول لـ html5-qrcode فقط عند الحاجة وعلى جانب العميل
   */
  const createScanner = useCallback(async (): Promise<Html5QrcodeLike> => {
    if (scannerRef.current) return scannerRef.current;
    const mod = await import('html5-qrcode');
    const Html5Qrcode = mod.Html5Qrcode;
    const instance = new Html5Qrcode(elementId) as unknown as Html5QrcodeLike;
    scannerRef.current = instance;
    return instance;
  }, [elementId]);

  /**
   * الإيقاف الآمن — يتحقق من الحالة قبل الإيقاف
   */
  const stop = useCallback(async (): Promise<void> => {
    const instance = scannerRef.current;
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      await instance.clear().catch(() => undefined);
    } catch (err) {
      log('warn', 'فشل إيقاف الكاميرا بنعومة', err);
    } finally {
      if (isMountedRef.current) {
        setStatus('stopped');
      }
    }
  }, [log]);

  /**
   * البدء الآمن — يمر بجميع الفحوصات قبل طلب stream
   */
  const start = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setFailureReason(null);
    setErrorMessage(null);

    const envOk = await checkEnvironment();
    if (!envOk) return;

    setStatus('prompting-permission');

    try {
      const instance = await createScanner();
      await instance.start(
        { facingMode },
        { fps, qrbox },
        (decoded: string) => {
          if (!isMountedRef.current) return;
          onDecoded(decoded);
          // الإيقاف التلقائي بعد النجاح لتحرير الكاميرا
          stop().catch(() => undefined);
        },
        () => {
          // أخطاء المسح المتكررة طبيعية — نتجاهلها بصمت
        }
      );

      if (isMountedRef.current) {
        setStatus('scanning');
      }
    } catch (err) {
      const { reason, message } = translateMediaError(err);
      log('error', 'فشل تشغيل الكاميرا', { reason, raw: err });
      if (!isMountedRef.current) return;
      setFailureReason(reason);
      setErrorMessage(message);
      if (reason === 'permission-denied' || reason === 'permissions-policy-blocked') {
        setStatus('permission-denied');
      } else if (reason === 'no-camera-device') {
        setStatus('no-device');
      } else {
        setStatus('error');
      }
    }
  }, [checkEnvironment, createScanner, facingMode, fps, onDecoded, qrbox, stop, log]);

  /**
   * إعادة المحاولة — تُعيد ضبط الحالة ثم تحاول البدء مجدداً
   */
  const retry = useCallback(async (): Promise<void> => {
    await stop();
    setStatus('idle');
    setFailureReason(null);
    setErrorMessage(null);
    await start();
  }, [start, stop]);

  /**
   * مسح رمز QR من ملف صورة — مسار fallback رسمي
   */
  const scanImageFile = useCallback(
    async (file: File): Promise<string> => {
      if (!file) {
        throw new Error('لم يتم اختيار ملف');
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('الملف المختار ليس صورة صالحة');
      }
      const instance = await createScanner();
      // توقف أي stream نشط قبل scanFile لتجنب تعارض الموارد
      if (instance.isScanning) {
        await instance.stop().catch(() => undefined);
      }
      const decoded = await instance.scanFile(file, false);
      return decoded;
    },
    [createScanner]
  );

  /**
   * التنظيف عند unmount — حرج لمنع stream شبح
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const instance = scannerRef.current;
      if (instance?.isScanning) {
        instance.stop().catch(() => undefined);
      }
      instance?.clear().catch(() => undefined);
      scannerRef.current = null;
    };
  }, []);

  return {
    status,
    failureReason,
    errorMessage,
    isSecureContext,
    hasMediaDevicesApi,
    hasCameraDevice,
    start,
    stop,
    retry,
    scanImageFile,
  };
}

'use client';

/**
 * ============================================================================
 * QRScanner — مكون مسح QR بمستوى إنتاج كامل
 * ============================================================================
 *
 * @description
 * يقدم ثلاث مسارات مُعتمدة رسمياً:
 *   1) الكاميرا الحية (المسار الأساسي)
 *   2) رفع صورة تحتوي رمز QR (fallback أول)
 *   3) إدخال الرمز يدوياً (fallback ثانٍ)
 *
 * المسار البديل ليس التفافاً — هو جزء رسمي من تجربة المنتج
 * لضمان عدم حجب المستخدم مهما كانت ظروف الكاميرا.
 *
 * التصميم:
 *   - آلة حالة واضحة (useQRCamera)
 *   - رسائل خطأ عربية قابلة للتصرف
 *   - أزرار بديلة ظاهرة في كل الحالات المحجوبة
 *   - تنظيف stream آمن عند unmount
 * ============================================================================
 */

import { useCallback, useRef, useState } from 'react';
import { useQRCamera, type QRCameraFailureReason } from '../../hooks/useQRCamera';

/**
 * مخرجات الخطأ إلى الأعلى
 */
export interface QRScannerErrorDetail {
  reason: QRCameraFailureReason | 'manual-entry-invalid' | 'image-decode-failed';
  message: string;
}

/**
 * خصائص المكون
 */
export interface QRScannerProps {
  /** يُستدعى عند نجاح أي من مسارات المسح الثلاثة */
  onScan: (decodedText: string) => void;
  /** يُستدعى عند حدوث خطأ ملموس — اختياري */
  onError?: (detail: QRScannerErrorDetail) => void;
  /** معرّف اختبار لعنصر الحاوية الجذر — يساعد Playwright */
  testId?: string;
}

const VIEWPORT_ELEMENT_ID = 'qr-scanner-viewport';

/**
 * مكون مسح QR الرئيسي
 */
export default function QRScanner({
  onScan,
  onError,
  testId = 'qr-scanner',
}: QRScannerProps) {
  const camera = useQRCamera({
    elementId: VIEWPORT_ELEMENT_ID,
    onDecoded: onScan,
  });

  const [manualValue, setManualValue] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * تسليم الإدخال اليدوي
   * يتوقع صيغة "a:b:c" وفق QRTokenSchema — التحقق النهائي في الصفحة الأم
   */
  const submitManual = useCallback((): void => {
    const trimmed = manualValue.trim();
    if (trimmed.length === 0) {
      setManualError('أدخل رمز QR قبل التأكيد');
      return;
    }
    if (trimmed.split(':').length !== 3) {
      setManualError('صيغة الرمز غير صحيحة — يجب أن يحتوي على ثلاثة أجزاء مفصولة بنقطتين');
      onError?.({
        reason: 'manual-entry-invalid',
        message: 'صيغة الرمز اليدوي غير صحيحة',
      });
      return;
    }
    setManualError(null);
    onScan(trimmed);
  }, [manualValue, onError, onScan]);

  /**
   * معالجة رفع صورة QR — fallback أول
   */
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadError(null);
      setUploadBusy(true);
      try {
        const decoded = await camera.scanImageFile(file);
        onScan(decoded);
      } catch (err) {
        const message =
          (err as Error)?.message ||
          'تعذر استخراج QR من الصورة — تأكد من وضوح الرمز في الصورة';
        setUploadError(message);
        onError?.({ reason: 'image-decode-failed', message });
      } finally {
        setUploadBusy(false);
        // إعادة تعيين الـ input ليتيح رفع نفس الصورة مرة أخرى
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [camera, onError, onScan]
  );

  /**
   * هل نعرض مسارات fallback؟
   * نعرضها دائماً، لكن بعناوين مناسبة عندما تكون الكاميرا محجوبة
   */
  const isCameraBlocked =
    camera.status === 'unsupported' ||
    camera.status === 'permission-denied' ||
    camera.status === 'no-device' ||
    camera.status === 'error';

  return (
    <div
      data-testid={testId}
      data-status={camera.status}
      className="flex flex-col items-center gap-4 w-full"
    >
      {/* منطقة معاينة الكاميرا */}
      <div
        id={VIEWPORT_ELEMENT_ID}
        data-testid="qr-scanner-viewport"
        className="w-full max-w-md rounded-lg overflow-hidden bg-black/20"
        style={{
          minHeight: camera.status === 'scanning' ? '300px' : '0',
        }}
      />

      {/* أزرار الكاميرا الأساسية */}
      <div className="flex flex-wrap gap-2 justify-center">
        {camera.status !== 'scanning' && !isCameraBlocked && (
          <button
            type="button"
            data-testid="qr-start-camera"
            onClick={() => {
              void camera.start();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            بدء المسح بالكاميرا
          </button>
        )}

        {camera.status === 'scanning' && (
          <button
            type="button"
            data-testid="qr-stop-camera"
            onClick={() => {
              void camera.stop();
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            إيقاف المسح
          </button>
        )}

        {isCameraBlocked && (
          <button
            type="button"
            data-testid="qr-retry-camera"
            onClick={() => {
              void camera.retry();
            }}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
          >
            إعادة محاولة تشغيل الكاميرا
          </button>
        )}
      </div>

      {/* إظهار السبب وكيفية التصرف */}
      {isCameraBlocked && camera.errorMessage && (
        <div
          role="alert"
          data-testid="qr-camera-error"
          className="p-4 bg-amber-500/10 text-amber-200 rounded-lg max-w-md w-full border border-amber-500/30"
        >
          <p className="text-sm font-medium">الكاميرا غير متاحة الآن</p>
          <p className="text-sm mt-1">{camera.errorMessage}</p>
          <p className="text-xs mt-2 opacity-80">
            استخدم أحد المسارات البديلة أدناه لإكمال الدخول.
          </p>
        </div>
      )}

      {/* تعليمات أثناء المسح */}
      {camera.status === 'scanning' && (
        <div className="text-sm text-white/70 text-center max-w-md">
          <p>ضع رمز QR داخل الإطار</p>
          <p className="text-xs mt-1">تأكد من وجود إضاءة جيدة وأن الرمز واضح</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* fallback #1 — رفع صورة تحتوي على QR                      */}
      {/* ======================================================== */}
      <div
        data-testid="qr-fallback-upload"
        className="w-full max-w-md border-t border-white/10 pt-4"
      >
        <label
          htmlFor="qr-image-upload-input"
          className="block text-sm text-white/70 mb-2 cursor-pointer"
        >
          أو ارفع صورة تحتوي على رمز QR
        </label>
        <input
          id="qr-image-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          data-testid="qr-image-upload"
          disabled={uploadBusy}
          onChange={(event) => {
            void handleFileChange(event);
          }}
          className="block w-full text-sm text-white/85 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-blue-600/20 file:text-blue-200 hover:file:bg-blue-600/30"
        />
        {uploadBusy && (
          <p className="text-xs text-white/55 mt-2">
            جارٍ تحليل الصورة...
          </p>
        )}
        {uploadError && (
          <p
            role="alert"
            data-testid="qr-upload-error"
            className="text-xs text-red-300 mt-2"
          >
            {uploadError}
          </p>
        )}
      </div>

      {/* ======================================================== */}
      {/* fallback #2 — إدخال الرمز يدوياً                          */}
      {/* ======================================================== */}
      <div
        data-testid="qr-fallback-manual"
        className="w-full max-w-md border-t border-white/10 pt-4"
      >
        <label
          htmlFor="qr-manual-input"
          className="block text-sm text-white/70 mb-2"
        >
          أو أدخل رمز QR يدوياً (صيغة مثل: <code className="text-xs">projectId:userId:nonce</code>)
        </label>
        <div className="flex gap-2">
          <input
            id="qr-manual-input"
            type="text"
            data-testid="qr-manual-entry"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="projectId:userId:nonce"
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            data-testid="qr-manual-submit"
            onClick={submitManual}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            تأكيد
          </button>
        </div>
        {manualError && (
          <p
            role="alert"
            data-testid="qr-manual-error"
            className="text-xs text-red-300 mt-2"
          >
            {manualError}
          </p>
        )}
      </div>
    </div>
  );
}

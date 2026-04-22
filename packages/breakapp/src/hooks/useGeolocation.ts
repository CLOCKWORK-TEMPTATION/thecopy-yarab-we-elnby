'use client';

/**
 * خطاف تتبع الموقع الجغرافي - Geolocation Hook
 * 
 * @description
 * يوفر واجهة React للوصول إلى موقع المستخدم الجغرافي
 * مع تتبع مستمر للتحديثات وإدارة الأخطاء
 * 
 * السبب: تتبع موقع Runner ضروري لإظهار موقعه
 * على الخريطة للمخرج وتحسين توزيع المهام
 */

import { useState, useEffect, useMemo } from 'react';
import type { LocationPosition, GeolocationOptions } from '../lib/types';

/**
 * قيمة الإرجاع من خطاف useGeolocation
 * 
 * @description
 * يحتوي على حالة تتبع الموقع الجغرافي بما في ذلك
 * بيانات الموقع الفعلية وحالة التحميل والأخطاء
 */
interface UseGeolocationReturn {
  /** بيانات الموقع الحالي */
  position: LocationPosition | null;
  /** رسالة الخطأ إن وُجدت */
  error: string | null;
  /** هل جاري تحميل الموقع */
  loading: boolean;
}

/**
 * خطاف تتبع الموقع الجغرافي
 * 
 * @description
 * يستخدم Geolocation API للحصول على موقع المستخدم
 * ويُحدّث الموقع تلقائياً عند تغيره
 * 
 * @param options - خيارات التتبع
 * @returns بيانات الموقع وحالة التحميل والخطأ
 * 
 * @example
 * ```tsx
 * const { position, error, loading } = useGeolocation({
 *   enableHighAccuracy: true,
 *   timeout: 5000,
 * });
 * 
 * if (loading) return <p>جاري تحديد الموقع...</p>;
 * if (error) return <p>خطأ: {error}</p>;
 * return <p>الموقع: {position?.latitude}, {position?.longitude}</p>;
 * ```
 */
export function useGeolocation(options: GeolocationOptions = {}): UseGeolocationReturn {
  const [position, setPosition] = useState<LocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // تثبيت الخيارات لتجنب إعادة الإنشاء غير الضرورية
  const geoOptions = useMemo(() => ({
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    timeout: options.timeout ?? 10000,
    maximumAge: options.maximumAge ?? 0,
  }), [options.enableHighAccuracy, options.timeout, options.maximumAge]);

  useEffect(() => {
    // التحقق من دعم المتصفح
    if (!navigator.geolocation) {
      setError('متصفحك لا يدعم تحديد الموقع الجغرافي');
      setLoading(false);
      return;
    }

    /**
     * معالج نجاح الحصول على الموقع
     */
    const handleSuccess = (pos: GeolocationPosition): void => {
      setPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      setError(null);
      setLoading(false);
    };

    /**
     * معالج خطأ الحصول على الموقع
     */
    const handleError = (err: GeolocationPositionError): void => {
      let errorMessage: string;
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'تم رفض إذن الوصول للموقع';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'معلومات الموقع غير متاحة';
          break;
        case err.TIMEOUT:
          errorMessage = 'انتهت مهلة طلب الموقع';
          break;
        default:
          errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    };

    // بدء تتبع الموقع
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    // التنظيف عند إلغاء التحميل
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [geoOptions]);

  return { position, error, loading };
}

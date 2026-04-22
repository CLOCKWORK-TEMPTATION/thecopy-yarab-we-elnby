'use client';

/**
 * مكون الخريطة - Map Component
 * 
 * @description
 * يعرض خريطة تفاعلية لتحديد موقع التصوير
 * وعرض مواقع الموردين القريبين
 * 
 * السبب: المخرج يحتاج لرؤية موقع التصوير والموردين
 * على خريطة واحدة لتسهيل اتخاذ قرارات التموين
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { VendorMapData } from '../../lib/types';

// إصلاح مسار أيقونات Leaflet الافتراضية
if (typeof window !== 'undefined') {
  const iconPrototype = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown };
  delete iconPrototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/**
 * خصائص مكون الخريطة
 */
interface MapComponentProps {
  /** مركز الخريطة [خط العرض، خط الطول] */
  center?: [number, number];
  /** مستوى التكبير الافتراضي */
  zoom?: number;
  /** دالة تُستدعى عند اختيار موقع على الخريطة */
  onLocationSelect?: (lat: number, lng: number) => void;
  /** قائمة الموردين لعرضهم على الخريطة */
  vendors?: VendorMapData[];
  /** فئات CSS إضافية */
  className?: string;
}

/**
 * مكون خريطة تفاعلية
 * 
 * @description
 * يعرض خريطة OpenStreetMap مع إمكانية:
 * - اختيار موقع بالنقر
 * - عرض علامات الموردين
 * - عرض المسافة من موقع التصوير
 * 
 * @example
 * ```tsx
 * <MapComponent
 *   center={[24.7136, 46.6753]}
 *   zoom={12}
 *   onLocationSelect={(lat, lng) => console.log(lat, lng)}
 *   vendors={vendorsData}
 * />
 * ```
 */
export default function MapComponent({
  center = [24.7136, 46.6753], // الرياض، المملكة العربية السعودية
  zoom = 12,
  onLocationSelect,
  vendors = [],
  className = '',
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const vendorMarkersRef = useRef<L.Marker[]>([]);

  /**
   * أيقونة الموردين
   */
  const vendorIcon = useMemo(() => L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  }), []);

  /**
   * معالج النقر على الخريطة
   */
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!onLocationSelect || !mapRef.current) return;
    
    const { lat, lng } = e.latlng;
    onLocationSelect(lat, lng);

    // تحديث أو إنشاء علامة الموقع المحدد
    if (markerRef.current) {
      markerRef.current.setLatLng(e.latlng);
    } else {
      markerRef.current = L.marker(e.latlng)
        .addTo(mapRef.current)
        .bindPopup('الموقع المحدد')
        .openPopup();
    }
  }, [onLocationSelect]);

  // تهيئة الخريطة
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapRef.current = map;

    // إضافة طبقة خرائط OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // إضافة معالج النقر
    if (onLocationSelect) {
      map.on('click', handleMapClick);
    }

    // التنظيف عند إلغاء تحميل المكون
    return () => {
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, onLocationSelect, handleMapClick]);

  // تحديث علامات الموردين
  useEffect(() => {
    if (!mapRef.current) return;

    // حذف العلامات القديمة
    vendorMarkersRef.current.forEach((marker) => marker.remove());
    vendorMarkersRef.current = [];

    // إضافة علامات جديدة
    vendors.forEach((vendor) => {
      if (!mapRef.current) return;

      const marker = L.marker([vendor.lat, vendor.lng], { icon: vendorIcon })
        .addTo(mapRef.current)
        .bindPopup(
          `<strong>${vendor.name}</strong><br/>` +
          (vendor.distance ? `المسافة: ${Math.round(vendor.distance)} متر` : '')
        );

      vendorMarkersRef.current.push(marker);
    });
  }, [vendors, vendorIcon]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full min-h-[400px] rounded-lg ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}

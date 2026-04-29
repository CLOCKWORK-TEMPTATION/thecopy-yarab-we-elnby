"use client";

/**
 * لوحة تحكم المخرج - Director Dashboard
 *
 * @description
 * تتيح للمخرج تحديد موقع التصوير اليومي
 * وعرض الموردين القريبين وإنشاء جلسات الطلب
 *
 * السبب: المخرج يحتاج لإدارة مركزية لموقع التصوير
 * والموردين المتاحين لتسهيل عملية التموين للفريق
 */

import { api, type Vendor, type VendorMapData } from "@the-copy/breakapp";
import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

// تحميل ديناميكي لمكون الخريطة لتجنب مشاكل SSR
const MapComponent = dynamic(
  () => import("@the-copy/breakapp/components/maps/MapComponent"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-white/6 rounded-[22px] flex items-center justify-center border border-white/8">
        <p className="text-white/55 font-cairo">جارٍ تحميل الخريطة...</p>
      </div>
    ),
  }
);

/**
 * استجابة إنشاء الجلسة
 */
interface SessionResponse {
  id: string;
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface NearbyVendorsListProps {
  vendors: Vendor[];
}

function NearbyVendorsList({ vendors }: NearbyVendorsListProps) {
  if (vendors.length === 0) return null;
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        الموردون القريبون ({vendors.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((vendor: Vendor) => (
          <div
            key={vendor.id}
            className="border border-white/8 rounded-[22px] p-4 hover:bg-white/8 transition-all bg-white/[0.02]"
          >
            <h3 className="font-semibold text-white font-cairo">
              {vendor.name}
            </h3>
            {vendor.distance && (
              <p className="text-sm text-white/55 mt-1 font-cairo">
                المسافة: {Math.round(vendor.distance)} متر
              </p>
            )}
            <p className="text-xs text-white/45 mt-2">
              {vendor.fixed_location.lat.toFixed(4)},{" "}
              {vendor.fixed_location.lng.toFixed(4)}
            </p>
          </div>
        ))}
      </div>
    </CardSpotlight>
  );
}

interface MapSectionProps {
  selectedLocation: { lat: number; lng: number } | null;
  vendorsForMap: VendorMapData[];
  loading: boolean;
  projectId: string;
  sessionId: string | null;
  onLocationSelect: (lat: number, lng: number) => void;
  onCreateSession: () => void;
}

function MapSection({
  selectedLocation,
  vendorsForMap,
  loading,
  projectId,
  sessionId,
  onLocationSelect,
  onCreateSession,
}: MapSectionProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        اختر موقع التصوير
      </h2>
      <MapComponent
        {...(selectedLocation
          ? {
              center: [selectedLocation.lat, selectedLocation.lng] as [
                number,
                number,
              ],
            }
          : {})}
        onLocationSelect={onLocationSelect}
        vendors={vendorsForMap}
        className="mb-4"
      />

      {selectedLocation && (
        <div className="mt-4 p-4 bg-white/6 rounded-[22px] border border-white/8">
          <p className="text-sm text-white/85 font-cairo">
            <strong>الموقع المحدد:</strong> {selectedLocation.lat.toFixed(6)},{" "}
            {selectedLocation.lng.toFixed(6)}
          </p>
          <button
            onClick={onCreateSession}
            disabled={loading || !projectId}
            className="mt-2 px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
          >
            {loading ? "جارٍ الإنشاء..." : "إنشاء جلسة يومية"}
          </button>
        </div>
      )}

      {sessionId && (
        <div className="mt-4 p-4 bg-white/8 rounded-[22px] border border-white/12">
          <p className="text-sm text-white/85 font-cairo">
            <strong>تم إنشاء الجلسة!</strong> معرّف الجلسة: {sessionId}
          </p>
        </div>
      )}
    </CardSpotlight>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DirectorDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");

  const handleLocationSelect = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      setSelectedLocation({ lat, lng });
      setLoading(true);

      try {
        const response = await api.get<Vendor[]>("/geo/vendors/nearby", {
          params: { lat, lng, radius: 3000 },
        });
        setVendors(response.data);
      } catch (error: unknown) {
        const axiosError = error as { message?: string };
        toast({
          title: "خطأ في جلب الموردين",
          description: axiosError.message ?? "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleCreateSession = useCallback(async (): Promise<void> => {
    if (!selectedLocation || !projectId) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار موقع وإدخال معرّف المشروع",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<SessionResponse>("/geo/session", {
        projectId,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });

      setSessionId(response.data.id);
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الجلسة اليومية بنجاح!",
      });
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "فشل إنشاء الجلسة",
        description: axiosError.message ?? "حدث خطأ أثناء إنشاء الجلسة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, projectId]);

  const vendorsForMap: VendorMapData[] = useMemo(
    () =>
      vendors.map((v: Vendor) => {
        const vendorMapData: VendorMapData = {
          id: v.id,
          name: v.name,
          lat: v.fixed_location.lat,
          lng: v.fixed_location.lng,
        };
        if (typeof v.distance === "number") {
          vendorMapData.distance = v.distance;
        }
        return vendorMapData;
      }),
    [vendors]
  );

  const handleProjectIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setProjectId(e.target.value);
    },
    []
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              لوحة تحكم المخرج
            </h1>
            <p className="text-white/55 font-cairo">
              حدد موقع التصوير اليوم واعرض الموردين القريبين
            </p>
          </div>
          <a
            href="/BREAKAPP/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة للوحة التحكم
          </a>
        </div>

        <nav
          aria-label="تبويبات المخرج"
          className="mb-6 flex items-center gap-3"
        >
          <span
            className="px-4 py-2 text-sm bg-white/8 text-white font-cairo rounded-[22px] border border-white/12"
            aria-current="page"
          >
            الجلسة والموقع
          </span>
          <a
            href="/BREAKAPP/director/orders-live"
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            الطلبات الحيّة
          </a>
          <a
            href="/BREAKAPP/director/runners-map"
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            خريطة الـ Runners
          </a>
        </nav>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <label
            htmlFor="field-page-1"
            className="block text-sm font-medium text-white mb-2 font-cairo"
          >
            معرّف المشروع
          </label>
          <input
            id="field-page-1"
            type="text"
            value={projectId}
            onChange={handleProjectIdChange}
            placeholder="أدخل معرّف المشروع"
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
          />
        </CardSpotlight>

        <MapSection
          selectedLocation={selectedLocation}
          vendorsForMap={vendorsForMap}
          loading={loading}
          projectId={projectId}
          sessionId={sessionId}
          onLocationSelect={(lat, lng) => void handleLocationSelect(lat, lng)}
          onCreateSession={() => void handleCreateSession()}
        />

        <NearbyVendorsList vendors={vendors} />
      </div>
    </div>
  );
}

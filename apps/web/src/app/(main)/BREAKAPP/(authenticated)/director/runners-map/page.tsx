"use client";

/**
 * خريطة الـ Runners للمخرج - Director Runners Map
 *
 * @description
 * تعرض مواقع الـ runners داخل الجلسة على خريطة تفاعليّة
 * مع تحديث لحظي عبر WebSocket وفلترة لحالة offline
 *
 * السبب: المخرج يحتاج رؤية مكانيّة حيّة لعناصر فريق التوصيل
 * لاتخاذ قرارات الإسناد بذكاء
 */

import { api, getCurrentUser, type VendorMapData } from "@the-copy/breakapp";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

// تحميل ديناميكي لمكوّن الخريطة لتفادي SSR
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
 * حالة runner متاحة من الباك-إند
 */
type RunnerStatus = "available" | "busy" | "offline";

/**
 * سجل runner كما يصل من الـ API أو عبر WebSocket
 */
interface RunnerRecord {
  runnerId: string;
  name?: string;
  lat: number;
  lng: number;
  recordedAt: string;
  status: RunnerStatus;
}

interface RunnerPathPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

const SESSION_STORAGE_KEY = "breakapp.director.currentSessionId";
const RUNNER_TRAIL_WINDOW_MS = 30 * 60 * 1000;

const STATUS_LABEL_MAP: Record<RunnerStatus, string> = {
  available: "متاح",
  busy: "مشغول",
  offline: "غير متصل",
};

const STATUS_TONE_MAP: Record<RunnerStatus, string> = {
  available: "bg-emerald-500/25 text-emerald-200 border-emerald-400/30",
  busy: "bg-amber-500/25 text-amber-200 border-amber-400/30",
  offline: "bg-white/6 text-white/55 border-white/10",
};

/**
 * صفحة خريطة الـ Runners
 */
export default function DirectorRunnersMapPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionDraft, setSessionDraft] = useState<string>("");
  const [runners, setRunners] = useState<RunnerRecord[]>([]);
  const [showOffline, setShowOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const runnerTrailRef = useRef<Map<string, RunnerPathPoint[]>>(new Map());

  const { connected, on, off } = useSocket({ auth: true });

  // معرّف المستخدم الحالي (للسجلات فقط)
  useEffect(() => {
    const user = getCurrentUser();
    userIdRef.current = user?.userId ?? null;
  }, []);

  const appendRunnerTrail = useCallback((runner: RunnerRecord): void => {
    const recordedAtMs = new Date(runner.recordedAt).getTime();
    const cutoff = Number.isNaN(recordedAtMs)
      ? Date.now() - RUNNER_TRAIL_WINDOW_MS
      : recordedAtMs - RUNNER_TRAIL_WINDOW_MS;
    const existing = runnerTrailRef.current.get(runner.runnerId) ?? [];
    const next = [
      ...existing,
      {
        lat: runner.lat,
        lng: runner.lng,
        recordedAt: runner.recordedAt,
      },
    ].filter((point) => new Date(point.recordedAt).getTime() >= cutoff);
    runnerTrailRef.current.set(runner.runnerId, next);
  }, []);

  const resetRunnerTrails = useCallback((records: RunnerRecord[]): void => {
    const next = new Map<string, RunnerPathPoint[]>();
    for (const runner of records) {
      next.set(runner.runnerId, [
        {
          lat: runner.lat,
          lng: runner.lng,
          recordedAt: runner.recordedAt,
        },
      ]);
    }
    runnerTrailRef.current = next;
  }, []);

  // استرجاع آخر sessionId محفوظ محلياً
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      setSessionDraft(stored);
    }
  }, []);

  /**
   * جلب لقطة أولى لمواقع الـ runners
   */
  const fetchRunners = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await api.get<RunnerRecord[]>(
        `/breakapp/runners/session/${sessionId}`
      );
      resetRunnerTrails(response.data);
      setRunners(response.data);
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب الـ Runners",
        description: axiosError.message ?? "تعذّر تحميل مواقع الـ runners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [resetRunnerTrails, sessionId]);

  // مزامنة أوليّة عند اختيار الجلسة
  useEffect(() => {
    if (!sessionId) return;
    void fetchRunners();
  }, [sessionId, fetchRunners]);

  // الاستماع لتحديثات الموقع اللحظيّة
  useEffect(() => {
    if (!connected || !sessionId) return;

    const handleLocationUpdate = (...args: unknown[]): void => {
      const [payload] = args;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("runnerId" in payload) ||
        !("lat" in payload) ||
        !("lng" in payload)
      ) {
        return;
      }
      const evt = payload as Partial<RunnerRecord> & {
        runnerId: string;
        lat: number;
        lng: number;
      };

      setRunners((prev) => {
        const idx = prev.findIndex((r) => r.runnerId === evt.runnerId);
        const nextStatus: RunnerStatus = evt.status ?? "available";
        const nextRecordedAt = evt.recordedAt ?? new Date().toISOString();
        if (idx === -1) {
          const created: RunnerRecord = {
            runnerId: evt.runnerId,
            lat: evt.lat,
            lng: evt.lng,
            status: nextStatus,
            recordedAt: nextRecordedAt,
            ...(evt.name !== undefined ? { name: evt.name } : {}),
          };
          appendRunnerTrail(created);
          return [...prev, created];
        }
        const existing = prev[idx];
        if (!existing) return prev;
        const updated: RunnerRecord = {
          ...existing,
          lat: evt.lat,
          lng: evt.lng,
          status: nextStatus,
          recordedAt: nextRecordedAt,
          ...(evt.name !== undefined ? { name: evt.name } : {}),
        };
        appendRunnerTrail(updated);
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
    };

    on("runner:location:update", handleLocationUpdate);
    return () => {
      off("runner:location:update", handleLocationUpdate);
    };
  }, [appendRunnerTrail, connected, sessionId, on, off]);

  /**
   * تثبيت معرّف الجلسة المُدخل
   */
  const handleApplySession = useCallback((): void => {
    const trimmed = sessionDraft.trim();
    if (!trimmed) return;
    setSessionId(trimmed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STORAGE_KEY, trimmed);
    }
  }, [sessionDraft]);

  const handleSessionDraftChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setSessionDraft(e.target.value);
    },
    []
  );

  const handleToggleOffline = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setShowOffline(e.target.checked);
    },
    []
  );

  // الـ runners بعد تطبيق فلتر الـ offline
  const visibleRunners = useMemo<RunnerRecord[]>(
    () =>
      showOffline ? runners : runners.filter((r) => r.status !== "offline"),
    [runners, showOffline]
  );

  /**
   * تمثيل الـ runners كـ markers للخريطة مع لون الحالة ومسار آخر 30 دقيقة.
   */
  const markers = useMemo<VendorMapData[]>(
    () =>
      visibleRunners.map((r) => {
        const label = r.name ?? r.runnerId;
        const trail = runnerTrailRef.current.get(r.runnerId) ?? [];
        const data: VendorMapData = {
          id: r.runnerId,
          name: `${label} — ${STATUS_LABEL_MAP[r.status]}`,
          lat: r.lat,
          lng: r.lng,
          markerTone: r.status,
          statusLabel: STATUS_LABEL_MAP[r.status],
          path: trail.map((point) => ({
            lat: point.lat,
            lng: point.lng,
          })),
        };
        return data;
      }),
    [visibleRunners]
  );

  // مركز الخريطة: أول runner متاح إن وُجد، وإلا الرياض افتراضياً
  const mapCenter = useMemo<[number, number] | null>(() => {
    const first = visibleRunners[0];
    if (!first) return null;
    return [first.lat, first.lng];
  }, [visibleRunners]);

  const statusCounts = useMemo(() => {
    const counts: Record<RunnerStatus, number> = {
      available: 0,
      busy: 0,
      offline: 0,
    };
    for (const r of runners) {
      counts[r.status] += 1;
    }
    return counts;
  }, [runners]);

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              خريطة الـ Runners
            </h1>
            <p className="text-white/55 font-cairo">
              عرض لحظي لمواقع عناصر فريق التوصيل داخل الجلسة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs rounded-full font-cairo ${connected ? "bg-white/8 text-white" : "bg-white/6 text-white/55"}`}
            >
              {connected ? "متصل لحظيّاً" : "غير متصل"}
            </span>
            <a
              href="/BREAKAPP/director"
              className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
            >
              رجوع للمخرج
            </a>
          </div>
        </div>

        {/* شريط تبويبات المخرج */}
        <nav
          aria-label="تبويبات المخرج"
          className="mb-6 flex items-center gap-3"
        >
          <a
            href="/BREAKAPP/director"
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            الجلسة والموقع
          </a>
          <a
            href="/BREAKAPP/director/orders-live"
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            الطلبات الحيّة
          </a>
          <span
            className="px-4 py-2 text-sm bg-white/8 text-white font-cairo rounded-[22px] border border-white/12"
            aria-current="page"
          >
            خريطة الـ Runners
          </span>
        </nav>

        {/* محدّد الجلسة */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="field-page-1"
                className="block text-sm font-medium text-white mb-2 font-cairo"
              >
                معرّف الجلسة الحاليّة
              </label>
              <input
                id="field-page-1"
                type="text"
                value={sessionDraft}
                onChange={handleSessionDraftChange}
                placeholder="أدخل معرّف الجلسة"
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
              />
            </div>
            <button
              onClick={handleApplySession}
              disabled={!sessionDraft.trim()}
              className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
            >
              تثبيت
            </button>
            <button
              onClick={() => void fetchRunners()}
              disabled={!sessionId || loading}
              className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
            >
              {loading ? "جارٍ التحديث..." : "تحديث"}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-white/85 font-cairo cursor-pointer">
              <input
                type="checkbox"
                checked={showOffline}
                onChange={handleToggleOffline}
                className="w-4 h-4 accent-white/80"
              />
              إظهار الـ runners غير المتصلين
            </label>

            <div className="flex items-center gap-3 text-xs font-cairo">
              <span className="px-2 py-1 rounded-full border bg-emerald-500/25 text-emerald-200 border-emerald-400/30">
                متاح: {statusCounts.available}
              </span>
              <span className="px-2 py-1 rounded-full border bg-amber-500/25 text-amber-200 border-amber-400/30">
                مشغول: {statusCounts.busy}
              </span>
              <span className="px-2 py-1 rounded-full border bg-white/6 text-white/55 border-white/10">
                غير متصل: {statusCounts.offline}
              </span>
            </div>
          </div>
        </CardSpotlight>

        {/* الخريطة */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            عرض الخريطة
          </h2>
          <div className="w-full h-[600px]">
            <MapComponent
              {...(mapCenter ? { center: mapCenter } : {})}
              zoom={13}
              vendors={markers}
              className="h-full"
            />
          </div>
        </CardSpotlight>

        {/* قائمة جانبية تفصيلية للـ runners */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            الـ Runners ({visibleRunners.length})
          </h2>

          {!sessionId ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              حدّد معرّف الجلسة لعرض الـ runners
            </p>
          ) : visibleRunners.length === 0 ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              لا يوجد runners مطابقون للعرض الحالي
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-4">
              {visibleRunners.map((runner) => (
                <li
                  key={runner.runnerId}
                  className="border border-white/8 rounded-[22px] p-4 bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white font-cairo">
                      {runner.name ?? runner.runnerId}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full border font-cairo ${STATUS_TONE_MAP[runner.status]}`}
                    >
                      {STATUS_LABEL_MAP[runner.status]}
                    </span>
                  </div>
                  <p className="text-xs text-white/55 font-cairo">
                    آخر تحديث:{" "}
                    {new Date(runner.recordedAt).toLocaleTimeString("ar-EG")}
                  </p>
                  <p className="text-xs text-white/45 mt-1 font-mono">
                    {runner.lat.toFixed(5)}, {runner.lng.toFixed(5)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardSpotlight>
      </div>
    </div>
  );
}

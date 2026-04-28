"use client";

/**
 * صفحة التوصيل النشط للـ Runner - Runner Active Delivery Page
 *
 * @description
 * تعرض المهمة النشطة الحالية للـ runner مع معلومات المورد،
 * الموقع الحالي، الملاحة، وأزرار تحديث الحالة.
 * تبث موقع runner عبر WebSocket وتعرض قائمة جانبية بباقي المهام.
 *
 * السبب: الـ runner يحتاج تركيزاً على مهمة واحدة نشطة مع
 * وصول سريع لقائمة المهام المتبقية وتحديث حالة المهمة لحظياً.
 */

import {
  api,
  getCurrentUser,
  type DeliveryTask,
  type CurrentUser,
} from "@the-copy/breakapp";
import { useGeolocation } from "@the-copy/breakapp/hooks/useGeolocation";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { useState, useEffect, useCallback, useMemo } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

/**
 * مهمة التوصيل الموسّعة القادمة من الباك-إند
 *
 * @description
 * يُرجع الباك-إند حقولاً إضافية (موقع المورد) لا تظهر في نوع
 * DeliveryTask الأساسي. نُعلن هذه كحقول optional محلية لاحترام
 * exactOptionalPropertyTypes بدون كسر عقد الحزمة.
 */
interface DeliveryTaskWithLocation extends DeliveryTask {
  vendorLat?: number;
  vendorLng?: number;
  vendorId?: string;
}

/**
 * الحالات الموسّعة المُرسلة للباك-إند عبر PATCH
 *
 * @description
 * العقد يسمح بـ in-progress | completed | rejected. الحزمة تعرف
 * pending | in-progress | completed فقط؛ نتعامل مع rejected كحالة
 * خاصة تُزيل المهمة من القائمة المحلية بعد نجاح النداء.
 */
type StatusUpdate = "in-progress" | "completed" | "rejected";

export default function RunnerActiveDeliveryPage(): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasks, setTasks] = useState<DeliveryTaskWithLocation[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const { position, error: geoError } = useGeolocation();
  const { connected, emit } = useSocket({ auth: true });

  /**
   * إصلاح C5: runnerId من JWT — لا localStorage
   */
  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const runnerId = currentUser?.userId ?? "";

  /**
   * جلب مهام runner من الخادم
   */
  const fetchTasks = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response =
        await api.get<DeliveryTaskWithLocation[]>("/runners/me/tasks");
      setTasks(response.data);
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب المهام",
        description: axiosError.message ?? "تعذّر تحميل مهام التوصيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks().catch(() => {
      toast({
        title: "خطأ في جلب المهام",
        description: "تعذّر تحميل مهام التوصيل",
        variant: "destructive",
      });
    });
  }, [fetchTasks]);

  /**
   * اختيار المهمة الأولى غير المكتملة كمهمة نشطة تلقائياً
   */
  useEffect(() => {
    if (activeTaskId) return;
    const firstOpen = tasks.find(
      (task: DeliveryTaskWithLocation) => task.status !== "completed"
    );
    if (firstOpen) {
      setActiveTaskId(firstOpen.id);
    }
  }, [tasks, activeTaskId]);

  /**
   * تسجيل runner وبث الموقع عند تغيره
   */
  useEffect(() => {
    if (!connected || !runnerId) return;
    emit("runner:register", { runnerId });
  }, [connected, runnerId, emit]);

  useEffect(() => {
    if (!connected || !runnerId || !position) return;
    emit("runner:location", {
      runnerId,
      lat: position.latitude,
      lng: position.longitude,
      timestamp: position.timestamp,
    });
  }, [connected, runnerId, position, emit]);

  const activeTask = useMemo<DeliveryTaskWithLocation | null>(
    () =>
      tasks.find(
        (task: DeliveryTaskWithLocation) => task.id === activeTaskId
      ) ?? null,
    [tasks, activeTaskId]
  );

  /**
   * تحديث حالة المهمة على الخادم
   */
  const updateStatus = useCallback(
    async (taskId: string, status: StatusUpdate): Promise<void> => {
      setUpdatingStatus(true);
      try {
        await api.patch(`/runners/tasks/${taskId}/status`, { status });

        if (status === "rejected") {
          // إزالة المهمة من القائمة المحلية
          setTasks((prev: DeliveryTaskWithLocation[]) =>
            prev.filter((task: DeliveryTaskWithLocation) => task.id !== taskId)
          );
          if (activeTaskId === taskId) {
            setActiveTaskId(null);
          }
        } else {
          setTasks((prev: DeliveryTaskWithLocation[]) =>
            prev.map((task: DeliveryTaskWithLocation) =>
              task.id === taskId ? { ...task, status } : task
            )
          );
        }

        if (connected) {
          emit("order:status", { orderId: taskId, status });
        }

        const labels: Record<StatusUpdate, string> = {
          "in-progress": "قيد التنفيذ",
          completed: "مكتمل",
          rejected: "مرفوض",
        };
        toast({
          title: "تحديث الحالة",
          description: `تم تغيير حالة المهمة إلى: ${labels[status]}`,
        });
      } catch (error: unknown) {
        const axiosError = error as { message?: string };
        toast({
          title: "فشل تحديث الحالة",
          description: axiosError.message ?? "تعذّر تحديث حالة المهمة",
          variant: "destructive",
        });
      } finally {
        setUpdatingStatus(false);
      }
    },
    [activeTaskId, connected, emit]
  );

  const navigationHref = useMemo<string | null>(() => {
    if (activeTask?.vendorLat == null || activeTask?.vendorLng == null) {
      return null;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${activeTask.vendorLat},${activeTask.vendorLng}`;
  }, [activeTask]);

  const directionText = useMemo<string>(() => {
    if (
      !position ||
      activeTask?.vendorLat == null ||
      activeTask?.vendorLng == null
    ) {
      return "—";
    }
    const dLat = activeTask.vendorLat - position.latitude;
    const dLng = activeTask.vendorLng - position.longitude;
    const ns = dLat > 0 ? "شمالاً" : dLat < 0 ? "جنوباً" : "";
    const ew = dLng > 0 ? "شرقاً" : dLng < 0 ? "غرباً" : "";
    return [ns, ew].filter(Boolean).join(" / ") || "عند الهدف";
  }, [position, activeTask]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto">
        {/* العنوان */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              التوصيل النشط
            </h1>
            <p className="text-white/55 font-cairo">
              مهامك الحالية وموقعك المباشر
            </p>
          </div>
          <a
            href="/BREAKAPP/runner/track"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            لوحة التتبع
          </a>
        </div>

        {!currentUser ? (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <p className="text-white/85 text-center font-cairo">
              جلسة غير صالحة. أعد تسجيل الدخول.
            </p>
          </CardSpotlight>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/40" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* المهمة النشطة */}
            <div className="lg:col-span-2 space-y-6">
              {activeTask ? (
                <>
                  <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white font-cairo">
                        المهمة النشطة
                      </h2>
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-cairo ${activeTask.status === "completed" ? "bg-white/8 text-white" : activeTask.status === "in-progress" ? "bg-white/8 text-white" : "bg-white/6 text-white/55"}`}
                      >
                        {activeTask.status === "completed"
                          ? "مكتمل"
                          : activeTask.status === "in-progress"
                            ? "قيد التنفيذ"
                            : "معلق"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-white/55 font-cairo">
                          المورد:
                        </span>
                        <p className="text-white font-cairo text-lg">
                          {activeTask.vendorName}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-white/55 font-cairo">
                          عدد العناصر:
                        </span>
                        <p className="text-white font-cairo">
                          {activeTask.items} عنصر
                        </p>
                      </div>
                      {activeTask.vendorLat != null &&
                      activeTask.vendorLng != null ? (
                        <div>
                          <span className="text-sm text-white/55 font-cairo">
                            موقع المورد:
                          </span>
                          <p className="text-white font-mono text-sm">
                            {activeTask.vendorLat.toFixed(6)},{" "}
                            {activeTask.vendorLng.toFixed(6)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </CardSpotlight>

                  {/* الموقع والملاحة */}
                  <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
                      الموقع والملاحة
                    </h2>
                    {geoError ? (
                      <div className="p-4 bg-white/6 text-white/85 rounded-[22px] mb-4 font-cairo border border-white/8">
                        خطأ: {geoError}
                      </div>
                    ) : position ? (
                      <div className="space-y-3 mb-4">
                        <div>
                          <span className="text-sm text-white/55 font-cairo">
                            موقعك الحالي:
                          </span>
                          <p className="text-white font-mono text-sm">
                            {position.latitude.toFixed(6)},{" "}
                            {position.longitude.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-white/55 font-cairo">
                            الاتجاه للمورد:
                          </span>
                          <p className="text-white font-cairo">
                            {directionText}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-white/55 mb-4 font-cairo">
                        جارٍ تحديد الموقع...
                      </p>
                    )}

                    {navigationHref ? (
                      <a
                        href={navigationHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 font-semibold font-cairo transition"
                      >
                        فتح في خرائط Google
                      </a>
                    ) : null}
                  </CardSpotlight>

                  {/* أزرار الحالة */}
                  <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
                      تحديث الحالة
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() =>
                          updateStatus(activeTask.id, "in-progress")
                        }
                        disabled={
                          updatingStatus ||
                          activeTask.status === "completed" ||
                          activeTask.status === "in-progress"
                        }
                        className="px-4 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
                      >
                        وصلت للمورد
                      </button>
                      <button
                        onClick={() =>
                          updateStatus(activeTask.id, "in-progress")
                        }
                        disabled={
                          updatingStatus || activeTask.status === "completed"
                        }
                        className="px-4 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
                      >
                        استلمت وفي الطريق
                      </button>
                      <button
                        onClick={() => updateStatus(activeTask.id, "completed")}
                        disabled={
                          updatingStatus || activeTask.status === "completed"
                        }
                        className="px-4 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
                      >
                        سلّمت
                      </button>
                      <button
                        onClick={() => updateStatus(activeTask.id, "rejected")}
                        disabled={updatingStatus}
                        className="px-4 py-3 bg-white/6 text-white/85 rounded-[22px] hover:bg-white/8 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
                      >
                        رفض
                      </button>
                    </div>
                  </CardSpotlight>
                </>
              ) : (
                <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
                  <p className="text-white/85 text-center font-cairo">
                    لا توجد مهمة نشطة حالياً.
                  </p>
                </CardSpotlight>
              )}
            </div>

            {/* القائمة الجانبية: كل المهام */}
            <div>
              <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
                <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
                  كل المهام ({tasks.length})
                </h2>
                {tasks.length === 0 ? (
                  <p className="text-white/55 text-center py-4 font-cairo">
                    لا توجد مهام.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...tasks]
                      .sort(
                        (
                          a: DeliveryTaskWithLocation,
                          b: DeliveryTaskWithLocation
                        ) => {
                          const order: Record<DeliveryTask["status"], number> =
                            {
                              "in-progress": 0,
                              pending: 1,
                              completed: 2,
                            };
                          return order[a.status] - order[b.status];
                        }
                      )
                      .map((task: DeliveryTaskWithLocation) => {
                        const isActive = task.id === activeTaskId;
                        return (
                          <button
                            key={task.id}
                            onClick={() => setActiveTaskId(task.id)}
                            className={`w-full text-right p-3 rounded-[22px] border transition ${isActive ? "border-white/20 bg-white/8" : "border-white/8 bg-white/[0.02] hover:bg-white/4"}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-cairo text-sm">
                                {task.vendorName}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full font-cairo ${task.status === "completed" ? "bg-white/8 text-white" : task.status === "in-progress" ? "bg-white/8 text-white" : "bg-white/6 text-white/55"}`}
                              >
                                {task.status === "completed"
                                  ? "مكتمل"
                                  : task.status === "in-progress"
                                    ? "قيد التنفيذ"
                                    : "معلق"}
                              </span>
                            </div>
                            <span className="text-xs text-white/55 font-cairo">
                              {task.items} عنصر
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </CardSpotlight>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

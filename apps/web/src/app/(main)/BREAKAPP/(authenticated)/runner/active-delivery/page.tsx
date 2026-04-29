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

interface DeliveryTaskWithLocation extends DeliveryTask {
  vendorLat?: number;
  vendorLng?: number;
  vendorId?: string;
}

type StatusUpdate = "in-progress" | "completed" | "rejected";

// ── Helper functions ─────────────────────────────────────────────────────────

function getTaskStatusLabel(
  status: DeliveryTask["status"] | "rejected"
): string {
  const labels: Record<string, string> = {
    completed: "مكتمل",
    "in-progress": "قيد التنفيذ",
    pending: "معلق",
    rejected: "مرفوض",
  };
  return labels[status] ?? "معلق";
}

function getTaskStatusClass(status: DeliveryTask["status"]): string {
  return status === "completed" || status === "in-progress"
    ? "bg-white/8 text-white"
    : "bg-white/6 text-white/55";
}

function computeDirectionText(
  position: { latitude: number; longitude: number } | null,
  task: DeliveryTaskWithLocation | null
): string {
  if (!position || task?.vendorLat == null || task?.vendorLng == null)
    return "—";
  const dLat = task.vendorLat - position.latitude;
  const dLng = task.vendorLng - position.longitude;
  const ns = dLat > 0 ? "شمالاً" : dLat < 0 ? "جنوباً" : "";
  const ew = dLng > 0 ? "شرقاً" : dLng < 0 ? "غرباً" : "";
  return [ns, ew].filter(Boolean).join(" / ") || "عند الهدف";
}

const STATUS_UPDATE_LABELS: Record<StatusUpdate, string> = {
  "in-progress": "قيد التنفيذ",
  completed: "مكتمل",
  rejected: "مرفوض",
};

interface UpdateStatusContext {
  activeTaskId: string | null;
  connected: boolean;
  emit: (event: string, data: unknown) => void;
  setTasks: (
    fn: (prev: DeliveryTaskWithLocation[]) => DeliveryTaskWithLocation[]
  ) => void;
  setActiveTaskId: (v: string | null) => void;
  setUpdatingStatus: (v: boolean) => void;
}

async function doUpdateStatus(
  taskId: string,
  status: StatusUpdate,
  context: UpdateStatusContext
): Promise<void> {
  const {
    activeTaskId,
    connected,
    emit,
    setTasks,
    setActiveTaskId,
    setUpdatingStatus,
  } = context;
  setUpdatingStatus(true);
  try {
    await api.patch(`/runners/tasks/${taskId}/status`, { status });
    if (status === "rejected") {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (activeTaskId === taskId) setActiveTaskId(null);
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    }
    if (connected) emit("order:status", { orderId: taskId, status });
    toast({
      title: "تحديث الحالة",
      description: `تم تغيير حالة المهمة إلى: ${STATUS_UPDATE_LABELS[status]}`,
    });
  } catch (e: unknown) {
    toast({
      title: "فشل تحديث الحالة",
      description:
        (e as { message?: string }).message ?? "تعذّر تحديث حالة المهمة",
      variant: "destructive",
    });
  } finally {
    setUpdatingStatus(false);
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface ActiveTaskCardProps {
  activeTask: DeliveryTaskWithLocation;
}

function ActiveTaskCard({ activeTask }: ActiveTaskCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white font-cairo">
          المهمة النشطة
        </h2>
        <span
          className={`px-3 py-1 text-xs rounded-full font-cairo ${getTaskStatusClass(activeTask.status)}`}
        >
          {getTaskStatusLabel(activeTask.status)}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-white/55 font-cairo">المورد:</span>
          <p className="text-white font-cairo text-lg">
            {activeTask.vendorName}
          </p>
        </div>
        <div>
          <span className="text-sm text-white/55 font-cairo">عدد العناصر:</span>
          <p className="text-white font-cairo">{activeTask.items} عنصر</p>
        </div>
        {activeTask.vendorLat != null && activeTask.vendorLng != null && (
          <div>
            <span className="text-sm text-white/55 font-cairo">
              موقع المورد:
            </span>
            <p className="text-white font-mono text-sm">
              {activeTask.vendorLat.toFixed(6)},{" "}
              {activeTask.vendorLng.toFixed(6)}
            </p>
          </div>
        )}
      </div>
    </CardSpotlight>
  );
}

interface NavigationCardProps {
  geoError: string | null;
  position: { latitude: number; longitude: number; timestamp: number } | null;
  directionText: string;
  navigationHref: string | null;
}

function NavigationCard({
  geoError,
  position,
  directionText,
  navigationHref,
}: NavigationCardProps) {
  return (
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
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </p>
          </div>
          <div>
            <span className="text-sm text-white/55 font-cairo">
              الاتجاه للمورد:
            </span>
            <p className="text-white font-cairo">{directionText}</p>
          </div>
        </div>
      ) : (
        <p className="text-white/55 mb-4 font-cairo">جارٍ تحديد الموقع...</p>
      )}
      {navigationHref && (
        <a
          href={navigationHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 font-semibold font-cairo transition"
        >
          فتح في خرائط Google
        </a>
      )}
    </CardSpotlight>
  );
}

interface StatusButtonsCardProps {
  activeTask: DeliveryTaskWithLocation;
  updatingStatus: boolean;
  updateStatus: (taskId: string, status: StatusUpdate) => void;
}

function StatusButtonsCard({
  activeTask,
  updatingStatus,
  updateStatus,
}: StatusButtonsCardProps) {
  const isCompleted = activeTask.status === "completed";
  const isInProgress = activeTask.status === "in-progress";
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        تحديث الحالة
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => updateStatus(activeTask.id, "in-progress")}
          disabled={updatingStatus || isCompleted || isInProgress}
          className="px-4 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
        >
          وصلت للمورد
        </button>
        <button
          onClick={() => updateStatus(activeTask.id, "in-progress")}
          disabled={updatingStatus || isCompleted}
          className="px-4 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
        >
          استلمت وفي الطريق
        </button>
        <button
          onClick={() => updateStatus(activeTask.id, "completed")}
          disabled={updatingStatus || isCompleted}
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
  );
}

interface TasksSidebarProps {
  tasks: DeliveryTaskWithLocation[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string) => void;
}

function TasksSidebar({
  tasks,
  activeTaskId,
  setActiveTaskId,
}: TasksSidebarProps) {
  const statusOrder: Record<DeliveryTask["status"], number> = {
    "in-progress": 0,
    pending: 1,
    completed: 2,
  };
  const sorted = [...tasks].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );
  return (
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
          {sorted.map((task) => (
            <button
              key={task.id}
              onClick={() => setActiveTaskId(task.id)}
              className={`w-full text-right p-3 rounded-[22px] border transition ${task.id === activeTaskId ? "border-white/20 bg-white/8" : "border-white/8 bg-white/[0.02] hover:bg-white/4"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-cairo text-sm">
                  {task.vendorName}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-cairo ${getTaskStatusClass(task.status)}`}
                >
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>
              <span className="text-xs text-white/55 font-cairo">
                {task.items} عنصر
              </span>
            </button>
          ))}
        </div>
      )}
    </CardSpotlight>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function RunnerActiveDeliveryPage(): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasks, setTasks] = useState<DeliveryTaskWithLocation[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const { position, error: geoError } = useGeolocation();
  const { connected, emit } = useSocket({ auth: true });

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const runnerId = currentUser?.userId ?? "";

  const fetchTasks = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res =
        await api.get<DeliveryTaskWithLocation[]>("/runners/me/tasks");
      setTasks(res.data);
    } catch (e: unknown) {
      toast({
        title: "خطأ في جلب المهام",
        description:
          (e as { message?: string }).message ?? "تعذّر تحميل مهام التوصيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (activeTaskId) return;
    const first = tasks.find((t) => t.status !== "completed");
    if (first) setActiveTaskId(first.id);
  }, [tasks, activeTaskId]);

  useEffect(() => {
    if (connected && runnerId) emit("runner:register", { runnerId });
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
    () => tasks.find((t) => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const updateStatus = useCallback(
    async (taskId: string, status: StatusUpdate): Promise<void> => {
      await doUpdateStatus(taskId, status, {
        activeTaskId,
        connected,
        emit,
        setTasks,
        setActiveTaskId,
        setUpdatingStatus,
      });
    },
    [activeTaskId, connected, emit]
  );

  const navigationHref = useMemo<string | null>(() => {
    if (activeTask?.vendorLat == null || activeTask?.vendorLng == null)
      return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${activeTask.vendorLat},${activeTask.vendorLng}`;
  }, [activeTask]);

  const directionText = useMemo<string>(
    () => computeDirectionText(position, activeTask),
    [position, activeTask]
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto">
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
            <div className="lg:col-span-2 space-y-6">
              {activeTask ? (
                <>
                  <ActiveTaskCard activeTask={activeTask} />
                  <NavigationCard
                    geoError={geoError}
                    position={position}
                    directionText={directionText}
                    navigationHref={navigationHref}
                  />
                  <StatusButtonsCard
                    activeTask={activeTask}
                    updatingStatus={updatingStatus}
                    updateStatus={updateStatus}
                  />
                </>
              ) : (
                <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
                  <p className="text-white/85 text-center font-cairo">
                    لا توجد مهمة نشطة حالياً.
                  </p>
                </CardSpotlight>
              )}
            </div>
            <div>
              <TasksSidebar
                tasks={tasks}
                activeTaskId={activeTaskId}
                setActiveTaskId={setActiveTaskId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

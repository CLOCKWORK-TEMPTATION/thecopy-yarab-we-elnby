"use client";

/**
 * صفحة تتبع Runner - Runner Track Page
 *
 * @description
 * تتيح لعامل التوصيل (Runner) تتبع موقعه
 * وإدارة مهام التوصيل المُسندة إليه
 *
 * السبب: تتبع موقع Runner ضروري لتوفير معلومات
 * دقيقة للمخرج عن توقيت وصول الطلبات
 */

import { api, getCurrentUser, type DeliveryTask } from "@the-copy/breakapp";
import { useGeolocation } from "@the-copy/breakapp/hooks/useGeolocation";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { useState, useEffect, useCallback } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface BatchTaskResponse {
  vendorId: string;
  vendorName: string;
  totalItems: number;
}

// ── Helper functions ─────────────────────────────────────────────────────────

function getTaskStatusLabel(status: DeliveryTask["status"]): string {
  const labels: Record<DeliveryTask["status"], string> = {
    completed: "مكتمل",
    "in-progress": "قيد التنفيذ",
    pending: "معلق",
  };
  return labels[status] ?? "معلق";
}

function getTaskStatusClass(status: DeliveryTask["status"]): string {
  return status === "completed" || status === "in-progress"
    ? "bg-white/8 text-white"
    : "bg-white/6 text-white/55";
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  "in-progress": "قيد التنفيذ",
  completed: "مكتمل",
};

async function loadBatchedTasks(sessionId: string): Promise<DeliveryTask[]> {
  const res = await api.post<BatchTaskResponse[]>(
    `/orders/session/${sessionId}/batch`,
    {}
  );
  return res.data.map((b) => ({
    id: b.vendorId,
    vendorName: b.vendorName,
    items: b.totalItems,
    status: "pending" as const,
  }));
}

function buildNewTaskHandler(
  setTasks: (fn: (prev: DeliveryTask[]) => DeliveryTask[]) => void
) {
  return (...args: unknown[]): void => {
    const [task] = args;
    if (
      !task ||
      typeof task !== "object" ||
      !("id" in task) ||
      !("vendorName" in task) ||
      !("items" in task) ||
      !("status" in task)
    )
      return;
    const deliveryTask = task as DeliveryTask;
    setTasks((prev) => [...prev, deliveryTask]);
    toast({
      title: "مهمة جديدة",
      description: `تم إسناد مهمة توصيل جديدة من ${deliveryTask.vendorName}`,
    });
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface RunnerInfoCardProps {
  runnerId: string;
  connected: boolean;
}

function RunnerInfoCard({ runnerId, connected }: RunnerInfoCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        معلومات Runner
      </h2>
      <div className="space-y-2">
        <div>
          <span className="text-sm text-white/55 font-cairo">
            معرّف Runner:
          </span>
          {runnerId ? (
            <p className="font-mono text-sm text-white">{runnerId}</p>
          ) : (
            <p className="text-sm text-white/85 font-cairo">جلسة غير صالحة</p>
          )}
        </div>
        <div>
          <span className="text-sm text-white/55 font-cairo">
            حالة الاتصال:
          </span>
          <span
            className={`mr-2 px-2 py-1 text-xs rounded-full ${connected ? "bg-white/8 text-white" : "bg-white/6 text-white/55"}`}
          >
            {connected ? "متصل" : "غير متصل"}
          </span>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface SessionInputCardProps {
  sessionId: string;
  loadingTasks: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFetch: () => void;
}

function SessionInputCard({
  sessionId,
  loadingTasks,
  onChange,
  onFetch,
}: SessionInputCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <label
        htmlFor="field-page-1"
        className="block text-sm font-medium text-white mb-2 font-cairo"
      >
        معرّف الجلسة
      </label>
      <div className="flex gap-2">
        <input
          id="field-page-1"
          type="text"
          value={sessionId}
          onChange={onChange}
          placeholder="أدخل معرّف الجلسة"
          className="flex-1 px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
        />
        <button
          onClick={onFetch}
          disabled={loadingTasks}
          className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
        >
          {loadingTasks ? "جارٍ التحميل..." : "تحميل المهام"}
        </button>
      </div>
    </CardSpotlight>
  );
}

interface LocationTrackingCardProps {
  geoError: string | null;
  position: { latitude: number; longitude: number; accuracy: number } | null;
  isTracking: boolean;
  connected: boolean;
  onStart: () => void;
  onStop: () => void;
}

function LocationTrackingCard({
  geoError,
  position,
  isTracking,
  connected,
  onStart,
  onStop,
}: LocationTrackingCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        تتبع الموقع
      </h2>
      {geoError ? (
        <div className="p-4 bg-white/6 text-white/85 rounded-[22px] mb-4 font-cairo border border-white/8">
          خطأ: {geoError}
        </div>
      ) : position ? (
        <div className="space-y-2 mb-4">
          <div>
            <span className="text-sm text-white/55 font-cairo">خط العرض:</span>
            <p className="font-mono text-white">
              {position.latitude.toFixed(6)}
            </p>
          </div>
          <div>
            <span className="text-sm text-white/55 font-cairo">خط الطول:</span>
            <p className="font-mono text-white">
              {position.longitude.toFixed(6)}
            </p>
          </div>
          <div>
            <span className="text-sm text-white/55 font-cairo">الدقة:</span>
            <p className="text-white font-cairo">
              {Math.round(position.accuracy)} متر
            </p>
          </div>
        </div>
      ) : (
        <p className="text-white/55 mb-4 font-cairo">جارٍ تحديد الموقع...</p>
      )}
      <button
        onClick={isTracking ? onStop : onStart}
        disabled={!connected}
        className="w-full px-6 py-3 text-white rounded-[22px] font-semibold font-cairo transition bg-white/8 hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed"
      >
        {isTracking ? "إيقاف التتبع" : "بدء التتبع"}
      </button>
    </CardSpotlight>
  );
}

interface TasksListCardProps {
  tasks: DeliveryTask[];
  updateTaskStatus: (
    taskId: string,
    status: "pending" | "in-progress" | "completed"
  ) => void;
}

function TasksListCard({ tasks, updateTaskStatus }: TasksListCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        مهام التوصيل ({tasks.length})
      </h2>
      {tasks.length === 0 ? (
        <p className="text-white/55 text-center py-8 font-cairo">
          لا توجد مهام مُسندة بعد
        </p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task: DeliveryTask) => (
            <div
              key={task.id}
              className="border border-white/8 rounded-[22px] p-4 bg-white/[0.02]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-white font-cairo">
                    {task.vendorName}
                  </h3>
                  <p className="text-sm text-white/55 mt-1 font-cairo">
                    {task.items} عنصر للجمع
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getTaskStatusClass(task.status)}`}
                >
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateTaskStatus(task.id, "in-progress")}
                  disabled={task.status !== "pending"}
                  className="flex-1 px-4 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed text-sm font-cairo transition"
                >
                  بدء
                </button>
                <button
                  onClick={() => updateTaskStatus(task.id, "completed")}
                  disabled={task.status === "completed"}
                  className="flex-1 px-4 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed text-sm font-cairo transition"
                >
                  إتمام
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardSpotlight>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function RunnerTrackPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [loadingTasks, setLoadingTasks] = useState(false);
  const { position, error: geoError } = useGeolocation();
  const { connected, emit, on, off } = useSocket();
  const runnerId = getCurrentUser()?.userId ?? "";

  useEffect(() => {
    if (!connected || !runnerId) return;
    emit("runner:register", { runnerId });
    const taskHandler = buildNewTaskHandler(setTasks);
    on("task:new", taskHandler);
    return () => {
      off("task:new", taskHandler);
    };
  }, [connected, runnerId, emit, on, off]);

  useEffect(() => {
    if (!isTracking || !position || !connected) return;
    emit("runner:location", {
      runnerId,
      lat: position.latitude,
      lng: position.longitude,
      timestamp: position.timestamp,
    });
  }, [position, isTracking, connected, runnerId, emit]);

  const startTracking = useCallback((): void => {
    setIsTracking(true);
    toast({ title: "تتبع الموقع", description: "تم تفعيل بث الموقع" });
  }, []);
  const stopTracking = useCallback((): void => {
    setIsTracking(false);
    toast({ title: "تتبع الموقع", description: "تم إيقاف بث الموقع" });
  }, []);

  const fetchTasks = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال معرّف الجلسة",
        variant: "destructive",
      });
      return;
    }
    setLoadingTasks(true);
    try {
      const batchedTasks = await loadBatchedTasks(sessionId);
      setTasks(batchedTasks);
      toast({
        title: "تم التحميل",
        description: `تم تحميل ${batchedTasks.length} مهمة`,
      });
    } catch (e: unknown) {
      toast({
        title: "خطأ في جلب المهام",
        description:
          (e as { message?: string }).message ?? "تعذّر تحميل المهام",
        variant: "destructive",
      });
    } finally {
      setLoadingTasks(false);
    }
  }, [sessionId]);

  const updateTaskStatus = useCallback(
    (taskId: string, status: "pending" | "in-progress" | "completed"): void => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      if (connected) emit("order:status", { orderId: taskId, status });
      toast({
        title: "تحديث الحالة",
        description: `تم تغيير حالة المهمة إلى: ${TASK_STATUS_LABELS[status] ?? status}`,
      });
    },
    [connected, emit]
  );

  const handleSessionIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSessionId(e.target.value);
    },
    []
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              لوحة تحكم Runner
            </h1>
            <p className="text-white/55 font-cairo">
              تتبع موقعك وإدارة مهام التوصيل
            </p>
          </div>
          <a
            href="/BREAKAPP/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة للوحة التحكم
          </a>
        </div>
        <RunnerInfoCard runnerId={runnerId} connected={connected} />
        <SessionInputCard
          sessionId={sessionId}
          loadingTasks={loadingTasks}
          onChange={handleSessionIdChange}
          onFetch={() => void fetchTasks()}
        />
        <LocationTrackingCard
          geoError={geoError}
          position={position}
          isTracking={isTracking}
          connected={connected}
          onStart={startTracking}
          onStop={stopTracking}
        />
        <TasksListCard tasks={tasks} updateTaskStatus={updateTaskStatus} />
      </div>
    </div>
  );
}

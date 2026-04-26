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
import { AxiosError } from "axios";
import { useState, useEffect, useCallback } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

/**
 * استجابة API للمهام المجمّعة
 */
interface BatchTaskResponse {
  vendorId: string;
  vendorName: string;
  totalItems: number;
}

export default function RunnerTrackPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [loadingTasks, setLoadingTasks] = useState(false);

  const { position, error: geoError } = useGeolocation();
  const { connected, emit, on, off } = useSocket();

  /**
   * إصلاح ثغرة C5: runnerId يُستخرج من JWT (getCurrentUser) وليس من
   * localStorage. ممنوع توليد معرّفات عشوائية محلياً لأن ذلك يسمح
   * بانتحال هوية أي runner من جانب العميل. طبقة (authenticated) تضمن
   * وجود جلسة صالحة؛ إن كان التوكن لا يمكن فك تشفيره نُظهر رسالة
   * واضحة دون redirect لأن المسؤولية تقع على الـ layout الأعلى.
   */
  const currentUser = getCurrentUser();
  const runnerId = currentUser?.userId ?? "";

  // تسجيل Runner والاستماع للمهام
  useEffect(() => {
    if (!connected || !runnerId) return;

    emit("runner:register", { runnerId });

    const taskHandler = (...args: unknown[]): void => {
      const [task] = args;
      if (
        !task ||
        typeof task !== "object" ||
        !("id" in task) ||
        !("vendorName" in task) ||
        !("items" in task) ||
        !("status" in task)
      ) {
        return;
      }

      const deliveryTask = task as DeliveryTask;
      setTasks((prev: DeliveryTask[]) => [...prev, deliveryTask]);
      toast({
        title: "مهمة جديدة",
        description: `تم إسناد مهمة توصيل جديدة من ${deliveryTask.vendorName}`,
      });
    };

    on("task:new", taskHandler);

    return () => {
      off("task:new", taskHandler);
    };
  }, [connected, runnerId, emit, on, off]);

  // بث الموقع عند تتبعه
  useEffect(() => {
    if (!isTracking || !position || !connected) return;

    emit("runner:location", {
      runnerId,
      lat: position.latitude,
      lng: position.longitude,
      timestamp: position.timestamp,
    });
  }, [position, isTracking, connected, runnerId, emit]);

  /**
   * بدء تتبع الموقع
   */
  const startTracking = useCallback((): void => {
    setIsTracking(true);
    toast({
      title: "تتبع الموقع",
      description: "تم تفعيل بث الموقع",
    });
  }, []);

  /**
   * إيقاف تتبع الموقع
   */
  const stopTracking = useCallback((): void => {
    setIsTracking(false);
    toast({
      title: "تتبع الموقع",
      description: "تم إيقاف بث الموقع",
    });
  }, []);

  /**
   * جلب المهام من الخادم
   */
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
      const response = await api.post<BatchTaskResponse[]>(
        `/orders/session/${sessionId}/batch`,
        {}
      );

      const batchedTasks: DeliveryTask[] = response.data.map(
        (batch: BatchTaskResponse) => ({
          id: batch.vendorId,
          vendorName: batch.vendorName,
          items: batch.totalItems,
          status: "pending" as const,
        })
      );

      setTasks(batchedTasks);
      toast({
        title: "تم التحميل",
        description: `تم تحميل ${batchedTasks.length} مهمة`,
      });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب المهام",
        description: axiosError.message || "تعذّر تحميل المهام",
        variant: "destructive",
      });
    } finally {
      setLoadingTasks(false);
    }
  }, [sessionId]);

  /**
   * تحديث حالة المهمة
   */
  const updateTaskStatus = useCallback(
    (taskId: string, status: "pending" | "in-progress" | "completed"): void => {
      setTasks((prevTasks: DeliveryTask[]) =>
        prevTasks.map((task: DeliveryTask) =>
          task.id === taskId ? { ...task, status } : task
        )
      );

      if (connected) {
        emit("order:status", { orderId: taskId, status });
      }

      const statusLabels = {
        pending: "معلق",
        "in-progress": "قيد التنفيذ",
        completed: "مكتمل",
      };
      toast({
        title: "تحديث الحالة",
        description: `تم تغيير حالة المهمة إلى: ${statusLabels[status]}`,
      });
    },
    [connected, emit]
  );

  /**
   * معالج تغيير معرّف الجلسة
   */
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
        {/* العنوان مع زر العودة */}
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

        {/* معلومات Runner */}
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
                <p className="text-sm text-white/85 font-cairo">
                  جلسة غير صالحة
                </p>
              )}
            </div>
            <div>
              <span className="text-sm text-white/55 font-cairo">
                حالة الاتصال:
              </span>
              <span
                className={`mr-2 px-2 py-1 text-xs rounded-full ${
                  connected
                    ? "bg-white/8 text-white"
                    : "bg-white/6 text-white/55"
                }`}
              >
                {connected ? "متصل" : "غير متصل"}
              </span>
            </div>
          </div>
        </CardSpotlight>

        {/* إدخال معرّف الجلسة */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <label className="block text-sm font-medium text-white mb-2 font-cairo">
            معرّف الجلسة
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sessionId}
              onChange={handleSessionIdChange}
              placeholder="أدخل معرّف الجلسة"
              className="flex-1 px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
            />
            <button
              onClick={fetchTasks}
              disabled={loadingTasks}
              className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
            >
              {loadingTasks ? "جارٍ التحميل..." : "تحميل المهام"}
            </button>
          </div>
        </CardSpotlight>

        {/* تتبع الموقع */}
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
                <span className="text-sm text-white/55 font-cairo">
                  خط العرض:
                </span>
                <p className="font-mono text-white">
                  {position.latitude.toFixed(6)}
                </p>
              </div>
              <div>
                <span className="text-sm text-white/55 font-cairo">
                  خط الطول:
                </span>
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
            <p className="text-white/55 mb-4 font-cairo">
              جارٍ تحديد الموقع...
            </p>
          )}

          <button
            onClick={isTracking ? stopTracking : startTracking}
            disabled={!connected}
            className={`w-full px-6 py-3 text-white rounded-[22px] font-semibold font-cairo transition ${
              isTracking
                ? "bg-white/8 hover:bg-white/12"
                : "bg-white/8 hover:bg-white/12"
            } disabled:bg-white/4 disabled:cursor-not-allowed`}
          >
            {isTracking ? "إيقاف التتبع" : "بدء التتبع"}
          </button>
        </CardSpotlight>

        {/* المهام */}
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
                      className={`px-2 py-1 text-xs rounded-full ${
                        task.status === "completed"
                          ? "bg-white/8 text-white"
                          : task.status === "in-progress"
                            ? "bg-white/8 text-white"
                            : "bg-white/6 text-white/55"
                      }`}
                    >
                      {task.status === "completed"
                        ? "مكتمل"
                        : task.status === "in-progress"
                          ? "قيد التنفيذ"
                          : "معلق"}
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
      </div>
    </div>
  );
}

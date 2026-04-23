"use client";

/**
 * الطلبات الحيّة للمخرج - Director Orders Live
 *
 * @description
 * تعرض قائمة الطلبات الحيّة داخل الجلسة اليومية
 * مع تحديث لحظي عبر WebSocket وأدوات فلترة وإدارة
 *
 * السبب: المخرج يحتاج صفحة تشغيلية موحّدة لمتابعة الطلبات
 * لحظيّاً، تشغيل الـ batching يدويّاً، وإسناد الطلبات للـ runners
 */

import {
  api,
  getCurrentUser,
  type Order,
} from "@the-copy/breakapp";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { AxiosError } from "axios";
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

/**
 * حالات الطلبات المسموحة للفلترة
 */
type OrderStatusFilter =
  | "all"
  | "pending"
  | "processing"
  | "completed"
  | "cancelled";

/**
 * خيار ترتيب زمني للطلبات
 */
type TimeSortOrder = "newest" | "oldest";

/**
 * عنصر طلب موسّع يحمل حقولاً اختيارية غير قياسية
 * يصل من الباك-إند (vendorId، runnerId) دون كسر النوع الأساسي
 */
interface LiveOrder extends Order {
  vendorId?: string;
  vendorName?: string;
  runnerId?: string;
}

/**
 * عنصر runner متاح للإسناد
 */
interface AvailableRunner {
  runnerId: string;
  name?: string;
  status: "available" | "busy" | "offline";
}

/**
 * عنصر runner كما يصل من الـ API
 */
interface RunnerPayload {
  runnerId: string;
  name?: string;
  lat: number;
  lng: number;
  recordedAt: string;
  status: "available" | "busy" | "offline";
}

/**
 * استجابة تشغيل الـ batching اليدوي
 */
interface BatchVendorResult {
  vendorId: string;
  vendorName: string;
  totalItems: number;
}

/**
 * حدث تحديث حالة الطلب عبر WebSocket
 */
interface OrderStatusEvent {
  orderId: string;
  status: Order["status"];
  vendorId?: string;
  runnerId?: string;
}

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "معلّق",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};

const SESSION_STORAGE_KEY = "breakapp.director.currentSessionId";

/**
 * صفحة الطلبات الحيّة للمخرج
 */
export default function DirectorOrdersLivePage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionDraft, setSessionDraft] = useState<string>("");
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [runners, setRunners] = useState<AvailableRunner[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [timeSort, setTimeSort] = useState<TimeSortOrder>("newest");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [batching, setBatching] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchVendorResult[] | null>(
    null
  );
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const { connected, on, off } = useSocket({ auth: true });

  // معرّف المستخدم الحالي (للسجلات فقط، لا إدخال يدوي)
  useEffect(() => {
    const user = getCurrentUser();
    userIdRef.current = user?.userId ?? null;
  }, []);

  // استرجاع آخر sessionId محفوظ محلياً (مؤقت، غير حساس)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      setSessionDraft(stored);
    }
  }, []);

  /**
   * جلب الطلبات من الباك-إند بفلتر حالة اختياري
   */
  const fetchOrders = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    setLoadingOrders(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await api.get<LiveOrder[]>(
        `/breakapp/orders/session/${sessionId}`,
        Object.keys(params).length > 0 ? { params } : {}
      );
      setOrders(response.data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب الطلبات",
        description: axiosError.message || "تعذّر تحميل الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [sessionId, statusFilter]);

  /**
   * جلب قائمة الـ runners للإسناد
   */
  const fetchRunners = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    try {
      const response = await api.get<RunnerPayload[]>(
        `/breakapp/runners/session/${sessionId}`
      );
      const mapped: AvailableRunner[] = response.data.map((r) => {
        const base: AvailableRunner = {
          runnerId: r.runnerId,
          status: r.status,
        };
        return r.name !== undefined ? { ...base, name: r.name } : base;
      });
      setRunners(mapped);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب الـ Runners",
        description: axiosError.message || "تعذّر تحميل قائمة الـ runners",
        variant: "destructive",
      });
    }
  }, [sessionId]);

  // مزامنة أولية عند ضبط الجلسة أو تغيير فلتر الحالة
  useEffect(() => {
    if (!sessionId) return;
    void fetchOrders();
    void fetchRunners();
  }, [sessionId, fetchOrders, fetchRunners]);

  // الاشتراك في تحديثات WebSocket الحيّة
  useEffect(() => {
    if (!connected || !sessionId) return;

    const handleStatusUpdate = (...args: unknown[]): void => {
      const [payload] = args;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("orderId" in payload) ||
        !("status" in payload)
      ) {
        return;
      }
      const evt = payload as OrderStatusEvent;
      setOrders((prev) =>
        prev.map((order) =>
          order.id === evt.orderId
            ? {
                ...order,
                status: evt.status,
                ...(evt.vendorId !== undefined
                  ? { vendorId: evt.vendorId }
                  : {}),
                ...(evt.runnerId !== undefined
                  ? { runnerId: evt.runnerId }
                  : {}),
              }
            : order
        )
      );
    };

    on("order:status:update", handleStatusUpdate);
    return () => {
      off("order:status:update", handleStatusUpdate);
    };
  }, [connected, sessionId, on, off]);

  /**
   * تشغيل الـ batching يدويّاً
   */
  const runBatching = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      toast({
        title: "جلسة غير محددة",
        description: "حدّد معرّف الجلسة أولاً",
        variant: "destructive",
      });
      return;
    }
    setBatching(true);
    try {
      const response = await api.post<BatchVendorResult[]>(
        `/breakapp/orders/session/${sessionId}/batch`,
        {}
      );
      setBatchResult(response.data);
      toast({
        title: "تم تشغيل الـ Batching",
        description: `تم تجميع ${response.data.length} مورد/موردين`,
      });
      await fetchOrders();
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "فشل الـ Batching",
        description: axiosError.message || "تعذّر تشغيل التجميع",
        variant: "destructive",
      });
    } finally {
      setBatching(false);
    }
  }, [sessionId, fetchOrders]);

  /**
   * تحديث حالة طلب معيّن (إلغاء مثلاً)
   */
  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order["status"]): Promise<void> => {
      try {
        await api.patch(`/breakapp/orders/${orderId}/status`, { status });
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status } : order
          )
        );
        toast({
          title: "تم تحديث الحالة",
          description: `أصبحت حالة الطلب: ${STATUS_LABELS[status]}`,
        });
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        toast({
          title: "فشل التحديث",
          description: axiosError.message || "تعذّر تحديث الحالة",
          variant: "destructive",
        });
      }
    },
    []
  );

  /**
   * إسناد طلب لـ runner معيّن
   * ملاحظة: الباك-إند يتكفّل بتسجيل الإسناد ضمن نفس مسار التحديث
   */
  const assignRunnerToOrder = useCallback(
    async (orderId: string, runnerId: string): Promise<void> => {
      try {
        await api.patch(`/breakapp/orders/${orderId}/status`, {
          status: "processing",
          runnerId,
        });
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, status: "processing", runnerId }
              : order
          )
        );
        toast({
          title: "تم الإسناد",
          description: `تم إسناد الطلب للـ runner: ${runnerId}`,
        });
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        toast({
          title: "فشل الإسناد",
          description: axiosError.message || "تعذّر إسناد الطلب",
          variant: "destructive",
        });
      } finally {
        setAssignTargetId(null);
      }
    },
    []
  );

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

  const handleStatusFilterChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      setStatusFilter(e.target.value as OrderStatusFilter);
    },
    []
  );

  const handleVendorFilterChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      setVendorFilter(e.target.value);
    },
    []
  );

  const handleTimeSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      setTimeSort(e.target.value as TimeSortOrder);
    },
    []
  );

  // قائمة موردين فريدة مشتقّة من الطلبات للفلترة
  const vendorOptions = useMemo<{ id: string; label: string }[]>(() => {
    const seen = new Map<string, string>();
    for (const order of orders) {
      if (order.vendorId && !seen.has(order.vendorId)) {
        seen.set(order.vendorId, order.vendorName ?? order.vendorId);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [orders]);

  // الطلبات بعد الفلترة المحليّة (المورد والترتيب الزمني)
  const filteredOrders = useMemo<LiveOrder[]>(() => {
    let list = orders;
    if (vendorFilter !== "all") {
      list = list.filter((o) => o.vendorId === vendorFilter);
    }
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return timeSort === "newest" ? tb - ta : ta - tb;
    });
    return sorted;
  }, [orders, vendorFilter, timeSort]);

  // الـ runners المتاحون فقط (لقائمة الإسناد)
  const availableRunners = useMemo<AvailableRunner[]>(
    () => runners.filter((r) => r.status === "available"),
    [runners]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              الطلبات الحيّة
            </h1>
            <p className="text-white/55 font-cairo">
              متابعة لحظيّة للطلبات داخل الجلسة مع أدوات فلترة وإدارة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs rounded-full font-cairo ${
                connected
                  ? "bg-white/8 text-white"
                  : "bg-white/6 text-white/55"
              }`}
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
          <span
            className="px-4 py-2 text-sm bg-white/8 text-white font-cairo rounded-[22px] border border-white/12"
            aria-current="page"
          >
            الطلبات الحيّة
          </span>
          <a
            href="/BREAKAPP/director/runners-map"
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            خريطة الـ Runners
          </a>
        </nav>

        {/* محدّد الجلسة + زر Batching */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white mb-2 font-cairo">
                معرّف الجلسة الحاليّة
              </label>
              <input
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
              onClick={runBatching}
              disabled={!sessionId || batching}
              className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
            >
              {batching ? "جارٍ التجميع..." : "تشغيل Batching يدويّاً"}
            </button>
          </div>

          {batchResult && batchResult.length > 0 && (
            <div className="mt-4 p-4 bg-white/6 rounded-[22px] border border-white/8">
              <p className="text-sm text-white/85 font-cairo mb-2">
                <strong>نتيجة التجميع:</strong>
              </p>
              <ul className="space-y-1">
                {batchResult.map((row) => (
                  <li
                    key={row.vendorId}
                    className="text-sm text-white/85 font-cairo"
                  >
                    {row.vendorName} — {row.totalItems} عنصر
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardSpotlight>

        {/* فلاتر */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            الفلاتر
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-white/55 mb-2 font-cairo">
                الحالة
              </label>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white font-cairo"
              >
                <option value="all">الكل</option>
                <option value="pending">معلّق</option>
                <option value="processing">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-2 font-cairo">
                المورد
              </label>
              <select
                value={vendorFilter}
                onChange={handleVendorFilterChange}
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white font-cairo"
              >
                <option value="all">كل الموردين</option>
                {vendorOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-2 font-cairo">
                الترتيب الزمني
              </label>
              <select
                value={timeSort}
                onChange={handleTimeSortChange}
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white font-cairo"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
              </select>
            </div>
          </div>
        </CardSpotlight>

        {/* قائمة الطلبات */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white font-cairo">
              الطلبات ({filteredOrders.length})
            </h2>
            <button
              onClick={() => void fetchOrders()}
              disabled={!sessionId || loadingOrders}
              className="px-4 py-2 text-sm bg-white/6 text-white rounded-[22px] hover:bg-white/8 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
            >
              {loadingOrders ? "جارٍ التحديث..." : "تحديث"}
            </button>
          </div>

          {!sessionId ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              حدّد معرّف الجلسة لعرض الطلبات
            </p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              لا توجد طلبات مطابقة للفلاتر الحاليّة
            </p>
          ) : (
            <ul className="space-y-4">
              {filteredOrders.map((order) => {
                const isAssignOpen = assignTargetId === order.id;
                return (
                  <li
                    key={order.id}
                    className="border border-white/8 rounded-[22px] p-4 bg-white/[0.02]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white font-cairo">
                          طلب #{order.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-white/55 mt-1 font-cairo">
                          {order.items.length} عنصر —{" "}
                          {new Date(order.created_at).toLocaleString("ar-EG")}
                        </p>
                        {order.vendorName !== undefined && (
                          <p className="text-xs text-white/45 mt-1 font-cairo">
                            المورد: {order.vendorName}
                          </p>
                        )}
                        {order.runnerId !== undefined && (
                          <p className="text-xs text-white/45 mt-1 font-cairo">
                            Runner: {order.runnerId}
                          </p>
                        )}
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-white/8 text-white font-cairo">
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <button
                          onClick={() =>
                            setAssignTargetId(isAssignOpen ? null : order.id)
                          }
                          disabled={
                            order.status === "completed" ||
                            order.status === "cancelled"
                          }
                          className="w-full px-4 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed text-sm font-cairo transition"
                        >
                          {isAssignOpen ? "إغلاق قائمة الإسناد" : "إسناد لـ runner"}
                        </button>
                        {isAssignOpen && (
                          <div className="mt-2 p-3 bg-white/6 rounded-[22px] border border-white/8">
                            {availableRunners.length === 0 ? (
                              <p className="text-xs text-white/55 font-cairo">
                                لا يوجد runners متاحون حاليّاً
                              </p>
                            ) : (
                              <ul className="space-y-1">
                                {availableRunners.map((runner) => (
                                  <li key={runner.runnerId}>
                                    <button
                                      onClick={() =>
                                        void assignRunnerToOrder(
                                          order.id,
                                          runner.runnerId
                                        )
                                      }
                                      className="w-full text-right px-3 py-2 text-xs bg-white/4 text-white rounded-[22px] hover:bg-white/8 transition font-cairo"
                                    >
                                      {runner.name ?? runner.runnerId}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          void updateOrderStatus(order.id, "cancelled")
                        }
                        disabled={
                          order.status === "completed" ||
                          order.status === "cancelled"
                        }
                        className="flex-1 px-4 py-2 bg-white/6 text-white/85 rounded-[22px] hover:bg-white/8 disabled:bg-white/4 disabled:cursor-not-allowed text-sm font-cairo transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardSpotlight>
      </div>
    </div>
  );
}

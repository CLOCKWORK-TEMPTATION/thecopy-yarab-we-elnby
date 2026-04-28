"use client";

/**
 * صفحة تفاصيل الطلب للطاقم - Crew Order Details Page
 *
 * @description
 * تعرض تفاصيل طلب واحد لعضو الطاقم الذي طلبه بما في ذلك
 * timeline للحالة، قائمة العناصر، اسم المورد، وتقدير الوصول.
 * تستمع في الوقت الفعلي لتحديثات حالة الطلب عبر WebSocket.
 *
 * السبب: عضو الطاقم يحتاج رؤية تقدم طلبه لحظياً
 * دون الحاجة لإعادة تحميل الصفحة أو العودة لقائمة الطلبات.
 */

import { api, type Order, type MenuItem } from "@the-copy/breakapp";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

/**
 * شكل الطلب الموسّع القادم من الباك-إند
 *
 * @description
 * الباك-إند يُرجع حقولاً إضافية مع الطلب (اسم المورد، تقدير الوصول،
 * أسماء عناصر القائمة) التي ليست جزءاً من نوع Order الأساسي في
 * الحزمة. نُعلن هذه الحقول محلياً كـ optional لنحترم
 * exactOptionalPropertyTypes ولا نكسر عقد الحزمة.
 */
interface OrderWithDetails extends Order {
  vendorName?: string;
  vendorId?: string;
  estimatedArrival?: string;
  items: (Order["items"][number] & {
    menuItem?: Pick<MenuItem, "id" | "name">;
    name?: string;
  })[];
}

/**
 * حدث تحديث حالة الطلب عبر WebSocket
 */
interface OrderStatusUpdatePayload {
  orderId: string;
  status: Order["status"];
}

/**
 * خطوات الـ timeline المعروضة بالترتيب
 */
const STATUS_STEPS: readonly {
  key: Order["status"];
  label: string;
}[] = [
  { key: "pending", label: "معلق" },
  { key: "processing", label: "قيد المعالجة" },
  { key: "completed", label: "مكتمل" },
];

const STATUS_INDEX: Record<Order["status"], number> = {
  pending: 0,
  processing: 1,
  completed: 2,
  cancelled: -1,
};

export default function CrewOrderDetailsPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : "";

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelling, setCancelling] = useState<boolean>(false);

  const { connected, on, off } = useSocket({ auth: true });

  /**
   * جلب تفاصيل الطلب من الخادم
   */
  const fetchOrder = useCallback(async (): Promise<void> => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<OrderWithDetails>(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب الطلب",
        description: axiosError.message ?? "تعذّر تحميل تفاصيل الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder().catch(() => {
      toast({
        title: "خطأ في جلب الطلب",
        description: "تعذّر تحميل تفاصيل الطلب",
        variant: "destructive",
      });
    });
  }, [fetchOrder]);

  /**
   * الاستماع لتحديثات حالة الطلب عبر WebSocket
   */
  useEffect(() => {
    if (!connected || !orderId) return;

    const statusHandler = (...args: unknown[]): void => {
      const [payload] = args;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("orderId" in payload) ||
        !("status" in payload)
      ) {
        return;
      }
      const data = payload as OrderStatusUpdatePayload;
      if (data.orderId !== orderId) return;

      setOrder((prev: OrderWithDetails | null): OrderWithDetails | null => {
        if (!prev) return prev;
        return { ...prev, status: data.status };
      });

      toast({
        title: "تحديث حالة الطلب",
        description: `تم تغيير حالة الطلب إلى: ${getStatusLabel(data.status)}`,
      });
    };

    on("order:status:update", statusHandler);
    return () => {
      off("order:status:update", statusHandler);
    };
  }, [connected, orderId, on, off]);

  /**
   * إلغاء الطلب إذا كان لا يزال pending
   */
  const cancelOrder = useCallback(async (): Promise<void> => {
    if (order?.status !== "pending") return;
    setCancelling(true);
    try {
      await api.patch(`/orders/${order.id}/status`, { status: "cancelled" });
      setOrder((prev: OrderWithDetails | null): OrderWithDetails | null =>
        prev ? { ...prev, status: "cancelled" } : prev
      );
      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء الطلب بنجاح",
      });
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "فشل الإلغاء",
        description: axiosError.message ?? "تعذّر إلغاء الطلب",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  }, [order]);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/40" />
      </div>
    );
  }

  if (!order) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl"
      >
        <div className="max-w-4xl mx-auto">
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <p className="text-white/85 text-center font-cairo">
              لم يتم العثور على الطلب.
            </p>
            <div className="mt-4 flex justify-center">
              <a
                href="/BREAKAPP/crew/menu"
                className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
              >
                العودة لقائمة الطلبات
              </a>
            </div>
          </CardSpotlight>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_INDEX[order.status];
  const isCancelled = order.status === "cancelled";
  const vendorName = order.vendorName ?? order.vendorId ?? "—";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl"
    >
      <div className="max-w-4xl mx-auto">
        {/* العنوان ورجوع */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              تفاصيل الطلب
            </h1>
            <p className="text-white/55 font-cairo font-mono text-sm">
              #{order.id}
            </p>
          </div>
          <a
            href="/BREAKAPP/crew/menu"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            رجوع
          </a>
        </div>

        {/* الحالة العامة */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white font-cairo">
              حالة الطلب
            </h2>
            <span
              className={`px-3 py-1 text-xs rounded-full font-cairo ${isCancelled ? "bg-white/6 text-white/55" : "bg-white/8 text-white"}`}
            >
              {getStatusLabel(order.status)}
            </span>
          </div>

          {/* Timeline */}
          {isCancelled ? (
            <div className="p-4 bg-white/6 text-white/85 rounded-[22px] font-cairo border border-white/8">
              تم إلغاء هذا الطلب.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {STATUS_STEPS.map((step, index: number) => {
                const reached = currentIndex >= index;
                return (
                  <div
                    key={step.key}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-cairo transition ${reached ? "bg-white/12 text-white border border-white/20" : "bg-white/4 text-white/45 border border-white/8"}`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`mt-2 text-xs font-cairo ${reached ? "text-white" : "text-white/45"}`}
                    >
                      {step.label}
                    </span>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`h-px w-full mt-[-20px] ${currentIndex > index ? "bg-white/20" : "bg-white/8"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardSpotlight>

        {/* معلومات المورد والوصول */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            معلومات الطلب
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-white/55 font-cairo">المورد:</span>
              <p className="text-white font-cairo">{vendorName}</p>
            </div>
            <div>
              <span className="text-sm text-white/55 font-cairo">
                تاريخ الإنشاء:
              </span>
              <p className="text-white font-cairo">
                {new Date(order.created_at).toLocaleString("ar-SA")}
              </p>
            </div>
            {order.estimatedArrival ? (
              <div>
                <span className="text-sm text-white/55 font-cairo">
                  تقدير الوصول:
                </span>
                <p className="text-white font-cairo">
                  {order.estimatedArrival}
                </p>
              </div>
            ) : null}
          </div>
        </CardSpotlight>

        {/* قائمة العناصر */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            العناصر ({order.items.length})
          </h2>
          {order.items.length === 0 ? (
            <p className="text-white/55 text-center py-4 font-cairo">
              لا توجد عناصر في هذا الطلب
            </p>
          ) : (
            <div className="space-y-3">
              {order.items.map((item, index: number) => {
                const displayName =
                  item.menuItem?.name ?? item.name ?? item.menuItemId;
                return (
                  <div
                    key={`${item.menuItemId}-${index}`}
                    className="flex items-center justify-between p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
                  >
                    <span className="text-white font-cairo">{displayName}</span>
                    <span className="text-white font-semibold font-cairo">
                      x{item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardSpotlight>

        {/* زر الإلغاء */}
        {order.status === "pending" ? (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <button
              onClick={cancelOrder}
              disabled={cancelling}
              className="w-full px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-semibold font-cairo transition"
            >
              {cancelling ? "جارٍ الإلغاء..." : "إلغاء الطلب"}
            </button>
          </CardSpotlight>
        ) : null}
      </div>
    </div>
  );
}

/**
 * ترجمة حالة الطلب لعربية
 */
function getStatusLabel(status: Order["status"]): string {
  const labels: Record<Order["status"], string> = {
    pending: "معلق",
    processing: "قيد المعالجة",
    completed: "مكتمل",
    cancelled: "ملغي",
  };
  return labels[status] ?? "";
}

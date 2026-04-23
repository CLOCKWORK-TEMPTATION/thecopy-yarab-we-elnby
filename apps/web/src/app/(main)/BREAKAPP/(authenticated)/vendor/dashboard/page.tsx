"use client";

/**
 * لوحة المورد — Vendor Dashboard
 *
 * @description
 * تعرض الطلبات الواردة للمورد مع إجراءات "بدء التحضير" و"جاهز"،
 * وإحصائيات بسيطة أعلى الصفحة عن إجمالي الطلبات وقيد التحضير والمكتملة.
 *
 * السبب: المورد يحتاج شاشة واحدة مركّزة على العمليات التنفيذية
 * بدل تبديل بين تبويبات أو تقارير منفصلة أثناء الخدمة.
 */

import { api, type Order } from "@the-copy/breakapp";
import { AxiosError } from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

type OrderStatus = Order["status"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "معلق",
  processing: "قيد التحضير",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-white/6 text-white/85",
  processing: "bg-white/10 text-white",
  completed: "bg-white/12 text-white",
  cancelled: "bg-white/4 text-white/55",
};

export default function VendorDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await api.get<Order[]>("/vendor/orders");
      setOrders(response.data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب الطلبات",
        description: axiosError.message || "تعذّر تحميل طلبات المورد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<void> => {
      setUpdatingId(orderId);
      try {
        await api.patch<Order>(`/vendor/orders/${orderId}/status`, { status });
        toast({
          title: "تم التحديث",
          description: `تم تحويل الطلب إلى: ${STATUS_LABELS[status]}`,
        });
        await fetchOrders();
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        toast({
          title: "فشل تحديث الحالة",
          description: axiosError.message || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      } finally {
        setUpdatingId(null);
      }
    },
    [fetchOrders]
  );

  const stats = useMemo(() => {
    let processing = 0;
    let completed = 0;
    for (const order of orders) {
      if (order.status === "processing") {
        processing += 1;
      } else if (order.status === "completed") {
        completed += 1;
      }
    }
    return { total: orders.length, processing, completed };
  }, [orders]);

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              لوحة المورد
            </h1>
            <p className="text-white/55 font-cairo">
              الطلبات الواردة والإجراءات السريعة
            </p>
          </div>
          <Link
            href="/BREAKAPP/profile"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            الملف الشخصي
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <p className="text-sm text-white/55 font-cairo mb-2">
              إجمالي الطلبات
            </p>
            <p className="text-4xl font-bold text-white font-cairo">
              {loading ? "…" : stats.total}
            </p>
          </CardSpotlight>
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <p className="text-sm text-white/55 font-cairo mb-2">
              قيد التحضير
            </p>
            <p className="text-4xl font-bold text-white font-cairo">
              {loading ? "…" : stats.processing}
            </p>
          </CardSpotlight>
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <p className="text-sm text-white/55 font-cairo mb-2">مكتمل</p>
            <p className="text-4xl font-bold text-white font-cairo">
              {loading ? "…" : stats.completed}
            </p>
          </CardSpotlight>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white font-cairo">
              الطلبات ({orders.length})
            </h2>
            <button
              onClick={() => void fetchOrders()}
              disabled={loading}
              className="px-4 py-2 text-sm bg-white/6 text-white rounded-[22px] hover:bg-white/8 font-cairo transition disabled:opacity-50"
            >
              تحديث
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              لا توجد طلبات واردة حالياً
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order: Order) => {
                const busy = updatingId === order.id;
                return (
                  <div
                    key={order.id}
                    className="p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-white font-mono">
                          #{order.id}
                        </p>
                        <p className="text-xs text-white/45 mt-1 font-cairo">
                          {new Date(order.created_at).toLocaleString("ar-SA")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-cairo ${STATUS_CLASSES[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <ul className="text-sm text-white/85 font-cairo mb-3 space-y-1">
                      {order.items.map((item, index) => (
                        <li
                          key={`${order.id}-${item.menuItemId}-${index}`}
                          className="flex justify-between"
                        >
                          <span className="font-mono text-white/55">
                            {item.menuItemId}
                          </span>
                          <span>×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-2">
                      {order.status === "pending" && (
                        <button
                          onClick={() =>
                            void updateStatus(order.id, "processing")
                          }
                          disabled={busy}
                          className="px-4 py-2 text-sm bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:opacity-50 font-cairo transition"
                        >
                          {busy ? "جارٍ..." : "بدء تحضير"}
                        </button>
                      )}
                      {order.status === "processing" && (
                        <button
                          onClick={() =>
                            void updateStatus(order.id, "completed")
                          }
                          disabled={busy}
                          className="px-4 py-2 text-sm bg-white/10 text-white rounded-[22px] hover:bg-white/14 disabled:opacity-50 font-cairo transition"
                        >
                          {busy ? "جارٍ..." : "جاهز"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardSpotlight>
      </div>
    </div>
  );
}

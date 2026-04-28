import React from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { STATUS_LABELS } from "../constants";
import { LiveOrder, AvailableRunner } from "../types";

import type { Order } from "@the-copy/breakapp";

export interface OrderListProps {
  filteredOrders: LiveOrder[];
  sessionId: string;
  loadingOrders: boolean;
  fetchOrders: () => void;
  assignTargetId: string | null;
  setAssignTargetId: (id: string | null) => void;
  availableRunners: AvailableRunner[];
  assignRunnerToOrder: (orderId: string, runnerId: string) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  filteredOrders,
  sessionId,
  loadingOrders,
  fetchOrders,
  assignTargetId,
  setAssignTargetId,
  availableRunners,
  assignRunnerToOrder,
  updateOrderStatus,
}) => {
  return (
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
  );
};

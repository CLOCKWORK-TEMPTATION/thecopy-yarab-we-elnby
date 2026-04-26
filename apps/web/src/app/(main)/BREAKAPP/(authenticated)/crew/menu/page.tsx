"use client";

/**
 * صفحة قائمة الطعام للطاقم - Crew Menu Page
 *
 * @description
 * تتيح لأعضاء الطاقم طلب الطعام من الموردين المتاحين
 * أثناء جلسة التصوير
 *
 * السبب: توفير وسيلة سهلة لطلب الطعام دون مغادرة موقع التصوير
 * مما يحافظ على سير العمل بسلاسة
 */

import {
  api,
  getCurrentUser,
  type MenuItem,
  type OrderItem,
  type Order,
  type Vendor,
} from "@the-copy/breakapp";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { AxiosError } from "axios";
import { useState, useEffect, useCallback } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

/**
 * حدث تحديث حالة الطلب عبر WebSocket
 */
interface OrderStatusUpdatePayload {
  orderId: string;
  status: Order["status"];
}

export default function CrewMenuPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const { connected, on, off } = useSocket({ auth: true });

  /**
   * جلب الموردين من الخادم
   */
  const fetchVendors = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<Vendor[]>("/vendors");
      setVendors(response.data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب الموردين",
        description: axiosError.message || "تعذّر تحميل قائمة الموردين",
        variant: "destructive",
      });
    }
  }, []);

  /**
   * جلب طلباتي من الخادم
   */
  const fetchMyOrders = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<Order[]>("/orders/my-orders");
      setMyOrders(response.data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب الطلبات",
        description: axiosError.message || "تعذّر تحميل طلباتك",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchMyOrders();
  }, [fetchVendors, fetchMyOrders]);

  /**
   * الاستماع لتحديثات حالة الطلبات في الوقت الفعلي
   *
   * السبب: حالة الطلب قد تتغيّر على الخادم (من المخرج أو المورد أو runner)
   * بدون أن يُعيد المستخدم تحميل الصفحة، فنحدّث myOrders تلقائياً.
   */
  useEffect(() => {
    if (!connected) return;

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
      setMyOrders((prev: Order[]) =>
        prev.map((order: Order) =>
          order.id === data.orderId ? { ...order, status: data.status } : order
        )
      );
    };

    on("order:status:update", statusHandler);
    return () => {
      off("order:status:update", statusHandler);
    };
  }, [connected, on, off]);

  /**
   * جلب قائمة الطعام من مورد محدد
   */
  const fetchMenu = useCallback(async (vendorId: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await api.get<MenuItem[]>(`/vendors/${vendorId}/menu`);
      setMenuItems(response.data);
      setSelectedVendor(vendorId);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب القائمة",
        description: axiosError.message || "تعذّر تحميل قائمة الطعام",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * إضافة عنصر للسلة
   */
  const addToCart = useCallback((menuItemId: string): void => {
    setCart((prevCart: OrderItem[]) => {
      const existingItem = prevCart.find(
        (item: OrderItem) => item.menuItemId === menuItemId
      );
      if (existingItem) {
        return prevCart.map((item: OrderItem) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { menuItemId, quantity: 1 }];
    });
  }, []);

  /**
   * إزالة عنصر من السلة
   */
  const removeFromCart = useCallback((menuItemId: string): void => {
    setCart((prevCart: OrderItem[]) => {
      const existingItem = prevCart.find(
        (item: OrderItem) => item.menuItemId === menuItemId
      );
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((item: OrderItem) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prevCart.filter(
        (item: OrderItem) => item.menuItemId !== menuItemId
      );
    });
  }, []);

  /**
   * تقديم الطلب
   */
  const submitOrder = useCallback(async (): Promise<void> => {
    if (!sessionId || cart.length === 0) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال معرّف الجلسة وإضافة عناصر للسلة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error("الجلسة غير صالحة. أعد تسجيل الدخول.");
      }

      await api.post("/orders", {
        sessionId,
        userHash: currentUser.userId,
        items: cart,
      });

      toast({
        title: "تم بنجاح",
        description: "تم تقديم الطلب بنجاح!",
      });
      setCart([]);
      fetchMyOrders();
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "فشل تقديم الطلب",
        description: axiosError.message || "حدث خطأ أثناء تقديم الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, cart, fetchMyOrders]);

  /**
   * الحصول على كمية عنصر في السلة
   */
  const getItemQuantityInCart = useCallback(
    (menuItemId: string): number => {
      const item = cart.find((i: OrderItem) => i.menuItemId === menuItemId);
      return item ? item.quantity : 0;
    },
    [cart]
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

  /**
   * ترجمة حالة الطلب
   */
  const getOrderStatusLabel = useCallback((status: Order["status"]): string => {
    const labels: Record<Order["status"], string> = {
      pending: "معلق",
      processing: "قيد المعالجة",
      completed: "مكتمل",
      cancelled: "ملغي",
    };
    return labels[status] ?? "";
  }, []);

  /**
   * لون حالة الطلب
   */
  const getOrderStatusColor = useCallback((status: Order["status"]): string => {
    const colors: Record<Order["status"], string> = {
      pending: "bg-white/6 text-white/55",
      processing: "bg-white/8 text-white",
      completed: "bg-white/8 text-white",
      cancelled: "bg-white/6 text-white/55",
    };
    return colors[status] ?? "";
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-black/8 p-4 md:p-8 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto">
        {/* العنوان مع زر العودة */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              قائمة الطلبات
            </h1>
            <p className="text-white/55 font-cairo">
              اختر العناصر من الموردين المتاحين
            </p>
          </div>
          <a
            href="/BREAKAPP/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة للوحة التحكم
          </a>
        </div>

        {/* إدخال معرّف الجلسة */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <label className="block text-sm font-medium text-white mb-2 font-cairo">
            معرّف الجلسة (من المخرج)
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={handleSessionIdChange}
            placeholder="أدخل معرّف الجلسة"
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
          />
        </CardSpotlight>

        {/* قائمة الموردين */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            الموردون المتاحون
          </h2>
          {vendors.length === 0 ? (
            <p className="text-white/55 text-center py-4 font-cairo">
              لا يوجد موردون متاحون حالياً
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor: Vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => fetchMenu(vendor.id)}
                  className={`p-4 border rounded-[22px] text-right hover:bg-white/8 transition-all ${
                    selectedVendor === vendor.id
                      ? "border-white/20 bg-white/8"
                      : "border-white/8"
                  }`}
                >
                  <h3 className="font-semibold text-white font-cairo">
                    {vendor.name}
                  </h3>
                  <p className="text-sm text-white/55 mt-1 font-cairo">
                    {vendor.is_mobile ? "متنقل" : "موقع ثابت"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardSpotlight>

        {/* عناصر القائمة */}
        {menuItems.length > 0 && (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
              عناصر القائمة
            </h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
              </div>
            ) : (
              <div className="space-y-4">
                {menuItems.map((item: MenuItem) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-white font-cairo">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-white/55 mt-1 font-cairo">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {getItemQuantityInCart(item.id) > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 flex items-center justify-center bg-white/8 text-white rounded-full hover:bg-white/12 transition"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold text-white">
                            {getItemQuantityInCart(item.id)}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => addToCart(item.id)}
                        disabled={!item.available}
                        className="px-4 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
                      >
                        {getItemQuantityInCart(item.id) === 0 ? "إضافة" : "+"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardSpotlight>
        )}

        {/* السلة */}
        {cart.length > 0 && (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
              طلبك ({cart.length} عناصر)
            </h2>
            <div className="space-y-2 mb-4">
              {cart.map((item: OrderItem) => {
                const menuItem = menuItems.find(
                  (m: MenuItem) => m.id === item.menuItemId
                );
                return (
                  <div
                    key={item.menuItemId}
                    className="flex justify-between items-center"
                  >
                    <span className="text-white/85 font-cairo">
                      {menuItem?.name ?? "عنصر غير معروف"}
                    </span>
                    <span className="font-semibold text-white">
                      x{item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={submitOrder}
              disabled={loading}
              className="w-full px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-semibold font-cairo transition"
            >
              {loading ? "جارٍ الإرسال..." : "تقديم الطلب"}
            </button>
          </CardSpotlight>
        )}

        {/* طلباتي */}
        {myOrders.length > 0 && (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
            <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
              طلباتي
            </h2>
            <div className="space-y-4">
              {myOrders.map((order: Order) => (
                <div
                  key={order.id}
                  className="border border-white/8 rounded-[22px] p-4 bg-white/[0.02]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-white/45">
                      {new Date(order.created_at).toLocaleString("ar-SA")}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getOrderStatusColor(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/85 font-cairo">
                      {order.items.length} عنصر
                    </div>
                    <a
                      href={`/BREAKAPP/crew/orders/${order.id}`}
                      className="px-3 py-1.5 text-xs bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px]"
                    >
                      تفاصيل
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardSpotlight>
        )}
      </div>
    </div>
  );
}

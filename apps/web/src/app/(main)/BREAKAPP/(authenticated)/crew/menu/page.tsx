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
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface OrderStatusUpdatePayload {
  orderId: string;
  status: Order["status"];
}

// ── Helper functions ─────────────────────────────────────────────────────────

function getOrderStatusLabel(status: Order["status"]): string {
  const labels: Record<Order["status"], string> = {
    pending: "معلق",
    processing: "قيد المعالجة",
    completed: "مكتمل",
    cancelled: "ملغي",
  };
  return labels[status] ?? "";
}

function getOrderStatusColor(status: Order["status"]): string {
  const colors: Record<Order["status"], string> = {
    pending: "bg-white/6 text-white/55",
    processing: "bg-white/8 text-white",
    completed: "bg-white/8 text-white",
    cancelled: "bg-white/6 text-white/55",
  };
  return colors[status] ?? "";
}

function addItemToCart(cart: OrderItem[], menuItemId: string): OrderItem[] {
  const existing = cart.find((i) => i.menuItemId === menuItemId);
  if (existing) {
    return cart.map((i) =>
      i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
    );
  }
  return [...cart, { menuItemId, quantity: 1 }];
}

function removeItemFromCart(
  cart: OrderItem[],
  menuItemId: string
): OrderItem[] {
  const existing = cart.find((i) => i.menuItemId === menuItemId);
  if (existing && existing.quantity > 1) {
    return cart.map((i) =>
      i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
    );
  }
  return cart.filter((i) => i.menuItemId !== menuItemId);
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface SessionInputProps {
  sessionId: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function SessionInput({ sessionId, onChange }: SessionInputProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <label
        htmlFor="field-page-1"
        className="block text-sm font-medium text-white mb-2 font-cairo"
      >
        معرّف الجلسة (من المخرج)
      </label>
      <input
        id="field-page-1"
        type="text"
        value={sessionId}
        onChange={onChange}
        placeholder="أدخل معرّف الجلسة"
        className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
      />
    </CardSpotlight>
  );
}

interface VendorListProps {
  vendors: Vendor[];
  selectedVendor: string | null;
  onSelect: (vendorId: string) => void;
}

function VendorList({ vendors, selectedVendor, onSelect }: VendorListProps) {
  return (
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
              onClick={() => onSelect(vendor.id)}
              className={`p-4 border rounded-[22px] text-right hover:bg-white/8 transition-all ${selectedVendor === vendor.id ? "border-white/20 bg-white/8" : "border-white/8"}`}
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
  );
}

interface MenuItemsListProps {
  menuItems: MenuItem[];
  loading: boolean;
  getItemQty: (id: string) => number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

function MenuItemsList({
  menuItems,
  loading,
  getItemQty,
  onAdd,
  onRemove,
}: MenuItemsListProps) {
  if (menuItems.length === 0) return null;
  return (
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
                {getItemQty(item.id) > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemove(item.id)}
                      className="w-8 h-8 flex items-center justify-center bg-white/8 text-white rounded-full hover:bg-white/12 transition"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-semibold text-white">
                      {getItemQty(item.id)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => onAdd(item.id)}
                  disabled={!item.available}
                  className="px-4 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
                >
                  {getItemQty(item.id) === 0 ? "إضافة" : "+"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardSpotlight>
  );
}

interface CartPanelProps {
  cart: OrderItem[];
  menuItems: MenuItem[];
  loading: boolean;
  onSubmit: () => void;
}

function CartPanel({ cart, menuItems, loading, onSubmit }: CartPanelProps) {
  if (cart.length === 0) return null;
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        طلبك ({cart.length} عناصر)
      </h2>
      <div className="space-y-2 mb-4">
        {cart.map((item: OrderItem) => {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId);
          return (
            <div
              key={item.menuItemId}
              className="flex justify-between items-center"
            >
              <span className="text-white/85 font-cairo">
                {menuItem?.name ?? "عنصر غير معروف"}
              </span>
              <span className="font-semibold text-white">x{item.quantity}</span>
            </div>
          );
        })}
      </div>
      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full px-6 py-3 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-semibold font-cairo transition"
      >
        {loading ? "جارٍ الإرسال..." : "تقديم الطلب"}
      </button>
    </CardSpotlight>
  );
}

interface MyOrdersListProps {
  myOrders: Order[];
}

function MyOrdersList({ myOrders }: MyOrdersListProps) {
  if (myOrders.length === 0) return null;
  return (
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
              <Link
                href={`/BREAKAPP/crew/orders/${order.id}`}
                className="px-3 py-1.5 text-xs bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px]"
              >
                تفاصيل
              </Link>
            </div>
          </div>
        ))}
      </div>
    </CardSpotlight>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CrewMenuPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const { connected, on, off } = useSocket({ auth: true });

  const fetchMyOrders = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get<Order[]>("/orders/my-orders");
      setMyOrders(res.data);
    } catch (error: unknown) {
      const e = error as { message?: string };
      toast({
        title: "خطأ في جلب الطلبات",
        description: e.message ?? "تعذّر تحميل طلباتك",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const res = await api.get<Vendor[]>("/vendors");
        setVendors(res.data);
      } catch (error: unknown) {
        const e = error as { message?: string };
        toast({
          title: "خطأ في جلب الموردين",
          description: e.message ?? "تعذّر تحميل قائمة الموردين",
          variant: "destructive",
        });
      }
    };
    Promise.all([loadVendors(), fetchMyOrders()]).catch(() => void 0);
  }, [fetchMyOrders]);

  useEffect(() => {
    if (!connected) return;
    const handler = (...args: unknown[]): void => {
      const [payload] = args;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("orderId" in payload) ||
        !("status" in payload)
      )
        return;
      const data = payload as OrderStatusUpdatePayload;
      setMyOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId ? { ...o, status: data.status } : o
        )
      );
    };
    on("order:status:update", handler);
    return () => {
      off("order:status:update", handler);
    };
  }, [connected, on, off]);

  const fetchMenu = useCallback(async (vendorId: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get<MenuItem[]>(`/vendors/${vendorId}/menu`);
      setMenuItems(res.data);
      setSelectedVendor(vendorId);
    } catch (error: unknown) {
      const e = error as { message?: string };
      toast({
        title: "خطأ في جلب القائمة",
        description: e.message ?? "تعذّر تحميل قائمة الطعام",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (!currentUser) throw new Error("الجلسة غير صالحة. أعد تسجيل الدخول.");
      await api.post("/orders", {
        sessionId,
        userHash: currentUser.userId,
        items: cart,
      });
      toast({ title: "تم بنجاح", description: "تم تقديم الطلب بنجاح!" });
      setCart([]);
      await fetchMyOrders();
    } catch (error: unknown) {
      const e = error as { message?: string };
      toast({
        title: "فشل تقديم الطلب",
        description: e.message ?? "حدث خطأ أثناء تقديم الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, cart, fetchMyOrders]);

  const getItemQty = useCallback(
    (id: string) => cart.find((i) => i.menuItemId === id)?.quantity ?? 0,
    [cart]
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
              قائمة الطلبات
            </h1>
            <p className="text-white/55 font-cairo">
              اختر العناصر من الموردين المتاحين
            </p>
          </div>
          <Link
            href="/BREAKAPP/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة للوحة التحكم
          </Link>
        </div>
        <SessionInput
          sessionId={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
        <VendorList
          vendors={vendors}
          selectedVendor={selectedVendor}
          onSelect={(id) => void fetchMenu(id)}
        />
        <MenuItemsList
          menuItems={menuItems}
          loading={loading}
          getItemQty={getItemQty}
          onAdd={(id) => setCart((c) => addItemToCart(c, id))}
          onRemove={(id) => setCart((c) => removeItemFromCart(c, id))}
        />
        <CartPanel
          cart={cart}
          menuItems={menuItems}
          loading={loading}
          onSubmit={() => void submitOrder()}
        />
        <MyOrdersList myOrders={myOrders} />
      </div>
    </div>
  );
}

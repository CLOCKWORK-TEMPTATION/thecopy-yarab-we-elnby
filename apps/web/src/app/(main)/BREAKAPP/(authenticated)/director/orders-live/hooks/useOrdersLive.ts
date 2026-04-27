import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent } from "react";
import { api, getCurrentUser, type Order } from "@the-copy/breakapp";
import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { toast } from "@/hooks/use-toast";
import {
  OrderStatusFilter,
  TimeSortOrder,
  LiveOrder,
  AvailableRunner,
  RunnerPayload,
  BatchVendorResult,
  OrderStatusEvent,
} from "../types";
import { STATUS_LABELS, SESSION_STORAGE_KEY } from "../constants";

export function useOrdersLive() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionDraft, setSessionDraft] = useState<string>("");
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [runners, setRunners] = useState<AvailableRunner[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [timeSort, setTimeSort] = useState<TimeSortOrder>("newest");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [batching, setBatching] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchVendorResult[] | null>(null);
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const { connected, on, off } = useSocket({ auth: true });

  useEffect(() => {
    const user = getCurrentUser();
    userIdRef.current = user?.userId ?? null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      setSessionDraft(stored);
    }
  }, []);

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
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب الطلبات",
        description: axiosError.message ?? "تعذّر تحميل الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [sessionId, statusFilter]);

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
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب الـ Runners",
        description: axiosError.message ?? "تعذّر تحميل قائمة الـ runners",
        variant: "destructive",
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    void fetchOrders();
    void fetchRunners();
  }, [sessionId, fetchOrders, fetchRunners]);

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
                ...(evt.vendorId !== undefined ? { vendorId: evt.vendorId } : {}),
                ...(evt.runnerId !== undefined ? { runnerId: evt.runnerId } : {}),
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
      const axiosError = error as { message?: string };
      toast({
        title: "فشل الـ Batching",
        description: axiosError.message ?? "تعذّر تشغيل التجميع",
        variant: "destructive",
      });
    } finally {
      setBatching(false);
    }
  }, [sessionId, fetchOrders]);

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
        const axiosError = error as { message?: string };
        toast({
          title: "فشل التحديث",
          description: axiosError.message ?? "تعذّر تحديث الحالة",
          variant: "destructive",
        });
      }
    },
    []
  );

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
        const axiosError = error as { message?: string };
        toast({
          title: "فشل الإسناد",
          description: axiosError.message ?? "تعذّر إسناد الطلب",
          variant: "destructive",
        });
      } finally {
        setAssignTargetId(null);
      }
    },
    []
  );

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

  const vendorOptions = useMemo<{ id: string; label: string }[]>(() => {
    const seen = new Map<string, string>();
    for (const order of orders) {
      if (order.vendorId && !seen.has(order.vendorId)) {
        seen.set(order.vendorId, order.vendorName ?? order.vendorId);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [orders]);

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

  const availableRunners = useMemo<AvailableRunner[]>(
    () => runners.filter((r) => r.status === "available"),
    [runners]
  );

  return {
    sessionId,
    sessionDraft,
    statusFilter,
    vendorFilter,
    timeSort,
    loadingOrders,
    batching,
    batchResult,
    assignTargetId,
    setAssignTargetId,
    connected,
    vendorOptions,
    filteredOrders,
    availableRunners,
    handleApplySession,
    handleSessionDraftChange,
    handleStatusFilterChange,
    handleVendorFilterChange,
    handleTimeSortChange,
    runBatching,
    fetchOrders,
    updateOrderStatus,
    assignRunnerToOrder,
  };
}

import { useSocket } from "@the-copy/breakapp/hooks/useSocket";
import { api } from "@the-copy/breakapp/lib/auth";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";

import { toast } from "@/hooks/use-toast";

import { STATUS_LABELS, SESSION_STORAGE_KEY } from "../constants";
import {
  OrderStatusFilter,
  TimeSortOrder,
  LiveOrder,
  AvailableRunner,
  RunnerPayload,
  BatchVendorResult,
  OrderStatusEvent,
} from "../types";

import type { Order } from "@the-copy/breakapp/lib/types";

// ── Pure helpers ──────────────────────────────────────────────────────────────

function mapRunnerPayload(r: RunnerPayload): AvailableRunner {
  const base: AvailableRunner = { runnerId: r.runnerId, status: r.status };
  return r.name !== undefined ? { ...base, name: r.name } : base;
}

function applyStatusEvent(
  orders: LiveOrder[],
  evt: OrderStatusEvent
): LiveOrder[] {
  return orders.map((o) =>
    o.id === evt.orderId
      ? {
          ...o,
          status: evt.status,
          ...(evt.vendorId !== undefined ? { vendorId: evt.vendorId } : {}),
          ...(evt.runnerId !== undefined ? { runnerId: evt.runnerId } : {}),
        }
      : o
  );
}

function sortOrders(list: LiveOrder[], timeSort: TimeSortOrder): LiveOrder[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return timeSort === "newest" ? tb - ta : ta - tb;
  });
}

function buildVendorOptions(
  orders: LiveOrder[]
): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const order of orders) {
    if (order.vendorId && !seen.has(order.vendorId)) {
      seen.set(order.vendorId, order.vendorName ?? order.vendorId);
    }
  }
  return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
}

// ── Async API helpers ─────────────────────────────────────────────────────────

async function fetchOrdersFromApi(
  sessionId: string,
  statusFilter: OrderStatusFilter
): Promise<LiveOrder[]> {
  const params: Record<string, string> = {};
  if (statusFilter !== "all") params["status"] = statusFilter;
  const res = await api.get<LiveOrder[]>(
    `/breakapp/orders/session/${sessionId}`,
    Object.keys(params).length > 0 ? { params } : {}
  );
  return res.data;
}

async function fetchRunnersFromApi(
  sessionId: string
): Promise<AvailableRunner[]> {
  const res = await api.get<RunnerPayload[]>(
    `/breakapp/runners/session/${sessionId}`
  );
  return res.data.map(mapRunnerPayload);
}

async function runBatchingApi(sessionId: string): Promise<BatchVendorResult[]> {
  const res = await api.post<BatchVendorResult[]>(
    `/breakapp/orders/session/${sessionId}/batch`,
    {}
  );
  return res.data;
}

async function updateOrderStatusApi(
  orderId: string,
  status: Order["status"]
): Promise<void> {
  await api.patch(`/breakapp/orders/${orderId}/status`, { status });
}

async function assignRunnerApi(
  orderId: string,
  runnerId: string
): Promise<void> {
  await api.patch(`/breakapp/orders/${orderId}/status`, {
    status: "processing",
    runnerId,
  });
}

// ── WebSocket handler factory ─────────────────────────────────────────────────

function makeOrderStatusHandler(
  setOrders: React.Dispatch<React.SetStateAction<LiveOrder[]>>
): (...args: unknown[]) => void {
  return (...args: unknown[]): void => {
    const [p] = args;
    if (!p || typeof p !== "object" || !("orderId" in p) || !("status" in p))
      return;
    setOrders((prev) => applyStatusEvent(prev, p as OrderStatusEvent));
  };
}

function applySessionToStorage(trimmed: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_STORAGE_KEY, trimmed);
  }
}

// ── Extracted callback implementations ───────────────────────────────────────

async function doFetchOrders(
  sessionId: string,
  statusFilter: OrderStatusFilter,
  setLoadingOrders: (v: boolean) => void,
  setOrders: (fn: (prev: LiveOrder[]) => LiveOrder[]) => void
): Promise<void> {
  setLoadingOrders(true);
  try {
    const data = await fetchOrdersFromApi(sessionId, statusFilter);
    setOrders(() => data);
  } catch (e: unknown) {
    toast({
      title: "خطأ في جلب الطلبات",
      description: (e as { message?: string }).message ?? "تعذّر تحميل الطلبات",
      variant: "destructive",
    });
  } finally {
    setLoadingOrders(false);
  }
}

async function doFetchRunners(
  sessionId: string,
  setRunners: (fn: (prev: AvailableRunner[]) => AvailableRunner[]) => void
): Promise<void> {
  try {
    const data = await fetchRunnersFromApi(sessionId);
    setRunners(() => data);
  } catch (e: unknown) {
    toast({
      title: "خطأ في جلب الـ Runners",
      description:
        (e as { message?: string }).message ?? "تعذّر تحميل قائمة الـ runners",
      variant: "destructive",
    });
  }
}

async function doRunBatching(
  sessionId: string | null,
  setBatching: (v: boolean) => void,
  setBatchResult: (v: BatchVendorResult[]) => void,
  refetchOrders: () => Promise<void>
): Promise<void> {
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
    const data = await runBatchingApi(sessionId);
    setBatchResult(data);
    toast({
      title: "تم تشغيل الـ Batching",
      description: `تم تجميع ${data.length} مورد/موردين`,
    });
    await refetchOrders();
  } catch (e: unknown) {
    toast({
      title: "فشل الـ Batching",
      description: (e as { message?: string }).message ?? "تعذّر تشغيل التجميع",
      variant: "destructive",
    });
  } finally {
    setBatching(false);
  }
}

async function doUpdateOrderStatus(
  orderId: string,
  status: Order["status"],
  setOrders: (fn: (prev: LiveOrder[]) => LiveOrder[]) => void
): Promise<void> {
  try {
    await updateOrderStatusApi(orderId, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    toast({
      title: "تم تحديث الحالة",
      description: `أصبحت حالة الطلب: ${STATUS_LABELS[status]}`,
    });
  } catch (e: unknown) {
    toast({
      title: "فشل التحديث",
      description: (e as { message?: string }).message ?? "تعذّر تحديث الحالة",
      variant: "destructive",
    });
  }
}

async function doAssignRunner(
  orderId: string,
  runnerId: string,
  setOrders: (fn: (prev: LiveOrder[]) => LiveOrder[]) => void,
  setAssignTargetId: (v: string | null) => void
): Promise<void> {
  try {
    await assignRunnerApi(orderId, runnerId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "processing", runnerId } : o
      )
    );
    toast({
      title: "تم الإسناد",
      description: `تم إسناد الطلب للـ runner: ${runnerId}`,
    });
  } catch (e: unknown) {
    toast({
      title: "فشل الإسناد",
      description: (e as { message?: string }).message ?? "تعذّر إسناد الطلب",
      variant: "destructive",
    });
  } finally {
    setAssignTargetId(null);
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOrdersLive() {
  const [sessionId, setSessionId] = useState<string>(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "")
  );
  const [sessionDraft, setSessionDraft] = useState<string>(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "")
  );
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
  const { connected, on, off } = useSocket({ auth: true });

  const fetchOrders = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    await doFetchOrders(sessionId, statusFilter, setLoadingOrders, setOrders);
  }, [sessionId, statusFilter]);

  const fetchRunners = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    await doFetchRunners(sessionId, setRunners);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    void fetchOrders();
    void fetchRunners();
  }, [sessionId, fetchOrders, fetchRunners]);

  useEffect(() => {
    if (!connected || !sessionId) return;
    const handler = makeOrderStatusHandler(setOrders);
    on("order:status:update", handler);
    return () => {
      off("order:status:update", handler);
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
    await doRunBatching(
      sessionId,
      setBatching,
      (d) => setBatchResult(d),
      fetchOrders
    );
  }, [sessionId, fetchOrders]);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order["status"]): Promise<void> => {
      await doUpdateOrderStatus(orderId, status, setOrders);
    },
    []
  );

  const assignRunnerToOrder = useCallback(
    async (orderId: string, runnerId: string): Promise<void> => {
      await doAssignRunner(orderId, runnerId, setOrders, setAssignTargetId);
    },
    []
  );

  const handleApplySession = useCallback((): void => {
    const trimmed = sessionDraft.trim();
    if (!trimmed) return;
    setSessionId(trimmed);
    applySessionToStorage(trimmed);
  }, [sessionDraft]);

  const handleSessionDraftChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSessionDraft(e.target.value),
    []
  );
  const handleStatusFilterChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      setStatusFilter(e.target.value as OrderStatusFilter),
    []
  );
  const handleVendorFilterChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => setVendorFilter(e.target.value),
    []
  );
  const handleTimeSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      setTimeSort(e.target.value as TimeSortOrder),
    []
  );

  const vendorOptions = useMemo(() => buildVendorOptions(orders), [orders]);
  const filteredOrders = useMemo(() => {
    const list =
      vendorFilter !== "all"
        ? orders.filter((o) => o.vendorId === vendorFilter)
        : orders;
    return sortOrders(list, timeSort);
  }, [orders, vendorFilter, timeSort]);
  const availableRunners = useMemo(
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

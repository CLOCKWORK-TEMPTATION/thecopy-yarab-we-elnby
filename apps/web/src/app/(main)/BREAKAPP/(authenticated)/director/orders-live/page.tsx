"use client";

import { BatchResults } from "./components/BatchResults";
import { OrderFilters } from "./components/OrderFilters";
import { OrderList } from "./components/OrderList";
import { useOrdersLive } from "./hooks/useOrdersLive";

function navigateTo(path: string): void {
  window.location.assign(path);
}

export default function DirectorOrdersLivePage() {
  const {
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
  } = useOrdersLive();

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
                connected ? "bg-white/8 text-white" : "bg-white/6 text-white/55"
              }`}
            >
              {connected ? "متصل لحظيّاً" : "غير متصل"}
            </span>
            <button
              type="button"
              onClick={() => navigateTo("/BREAKAPP/director")}
              className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
            >
              رجوع للمخرج
            </button>
          </div>
        </div>

        {/* شريط تبويبات المخرج */}
        <nav
          aria-label="تبويبات المخرج"
          className="mb-6 flex items-center gap-3"
        >
          <button
            type="button"
            onClick={() => navigateTo("/BREAKAPP/director")}
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            الجلسة والموقع
          </button>
          <span
            className="px-4 py-2 text-sm bg-white/8 text-white font-cairo rounded-[22px] border border-white/12"
            aria-current="page"
          >
            الطلبات الحيّة
          </span>
          <button
            type="button"
            onClick={() => navigateTo("/BREAKAPP/director/runners-map")}
            className="px-4 py-2 text-sm bg-white/4 text-white/85 hover:bg-white/8 transition font-cairo rounded-[22px] border border-white/8"
          >
            خريطة الـ Runners
          </button>
        </nav>

        <OrderFilters
          sessionDraft={sessionDraft}
          handleSessionDraftChange={handleSessionDraftChange}
          handleApplySession={handleApplySession}
          runBatching={runBatching}
          sessionId={sessionId}
          batching={batching}
          statusFilter={statusFilter}
          handleStatusFilterChange={handleStatusFilterChange}
          vendorFilter={vendorFilter}
          handleVendorFilterChange={handleVendorFilterChange}
          vendorOptions={vendorOptions}
          timeSort={timeSort}
          handleTimeSortChange={handleTimeSortChange}
        />

        <BatchResults batchResult={batchResult} />

        <OrderList
          filteredOrders={filteredOrders}
          sessionId={sessionId}
          loadingOrders={loadingOrders}
          fetchOrders={fetchOrders}
          assignTargetId={assignTargetId}
          setAssignTargetId={setAssignTargetId}
          availableRunners={availableRunners}
          assignRunnerToOrder={assignRunnerToOrder}
          updateOrderStatus={updateOrderStatus}
        />
      </div>
    </div>
  );
}

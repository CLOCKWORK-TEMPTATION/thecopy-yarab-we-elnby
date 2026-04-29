import React, { ChangeEvent } from "react";

import { OrderStatusFilter, TimeSortOrder } from "../types";

export interface OrderFiltersProps {
  sessionDraft: string;
  handleSessionDraftChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleApplySession: () => void;
  runBatching: () => void;
  sessionId: string;
  batching: boolean;
  statusFilter: OrderStatusFilter;
  handleStatusFilterChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  vendorFilter: string;
  handleVendorFilterChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  vendorOptions: { id: string; label: string }[];
  timeSort: TimeSortOrder;
  handleTimeSortChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

interface SessionBarProps {
  sessionDraft: string;
  sessionId: string;
  batching: boolean;
  onDraftChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onBatch: () => void;
}

function SessionBar({
  sessionDraft,
  sessionId,
  batching,
  onDraftChange,
  onApply,
  onBatch,
}: SessionBarProps) {
  return (
    <section className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor="field-orderfilters-1"
            className="block text-sm font-medium text-white mb-2 font-cairo"
          >
            معرّد الجلسة الحاليّة
          </label>
          <input
            id="field-orderfilters-1"
            type="text"
            value={sessionDraft}
            onChange={onDraftChange}
            placeholder="أدخل معرّف الجلسة"
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
          />
        </div>
        <button
          onClick={onApply}
          disabled={!sessionDraft.trim()}
          className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
        >
          تثبيت
        </button>
        <button
          onClick={onBatch}
          disabled={!sessionId || batching}
          className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
        >
          {batching ? "جارٍ التجميع..." : "تشغيل Batching يدويّاً"}
        </button>
      </div>
    </section>
  );
}

interface FiltersBarProps {
  statusFilter: OrderStatusFilter;
  vendorFilter: string;
  vendorOptions: { id: string; label: string }[];
  timeSort: TimeSortOrder;
  onStatusChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onVendorChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onTimeSortChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

function FiltersBar({
  statusFilter,
  vendorFilter,
  vendorOptions,
  timeSort,
  onStatusChange,
  onVendorChange,
  onTimeSortChange,
}: FiltersBarProps) {
  return (
    <section className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        الفلاتر
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="field-orderfilters-2"
            className="block text-xs text-white/55 mb-2 font-cairo"
          >
            الحالة
          </label>
          <select
            id="field-orderfilters-2"
            value={statusFilter}
            onChange={onStatusChange}
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
          <label
            htmlFor="field-orderfilters-3"
            className="block text-xs text-white/55 mb-2 font-cairo"
          >
            المورد
          </label>
          <select
            id="field-orderfilters-3"
            value={vendorFilter}
            onChange={onVendorChange}
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
          <label
            htmlFor="field-orderfilters-4"
            className="block text-xs text-white/55 mb-2 font-cairo"
          >
            الترتيب الزمني
          </label>
          <select
            id="field-orderfilters-4"
            value={timeSort}
            onChange={onTimeSortChange}
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white font-cairo"
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
          </select>
        </div>
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  sessionDraft,
  handleSessionDraftChange,
  handleApplySession,
  runBatching,
  sessionId,
  batching,
  statusFilter,
  handleStatusFilterChange,
  vendorFilter,
  handleVendorFilterChange,
  vendorOptions,
  timeSort,
  handleTimeSortChange,
}) => {
  return (
    <>
      <SessionBar
        sessionDraft={sessionDraft}
        sessionId={sessionId}
        batching={batching}
        onDraftChange={handleSessionDraftChange}
        onApply={handleApplySession}
        onBatch={runBatching}
      />
      <FiltersBar
        statusFilter={statusFilter}
        vendorFilter={vendorFilter}
        vendorOptions={vendorOptions}
        timeSort={timeSort}
        onStatusChange={handleStatusFilterChange}
        onVendorChange={handleVendorFilterChange}
        onTimeSortChange={handleTimeSortChange}
      />
    </>
  );
};

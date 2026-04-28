import React from "react";

import { BatchVendorResult } from "../types";

export interface BatchResultsProps {
  batchResult: BatchVendorResult[] | null;
}

export const BatchResults: React.FC<BatchResultsProps> = ({ batchResult }) => {
  if (!batchResult || batchResult.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-white/6 rounded-[22px] border border-white/8 mb-6">
      <p className="text-sm text-white/85 font-cairo mb-2">
        <strong>نتيجة التجميع:</strong>
      </p>
      <ul className="space-y-1">
        {batchResult.map((row) => (
          <li key={row.vendorId} className="text-sm text-white/85 font-cairo">
            {row.vendorName} — {row.totalItems} عنصر
          </li>
        ))}
      </ul>
    </div>
  );
};

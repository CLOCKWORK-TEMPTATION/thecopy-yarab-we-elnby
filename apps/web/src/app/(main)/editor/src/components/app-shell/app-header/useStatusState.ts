/**
 * @module app-header/useStatusState
 * @description Hook لحساب حالة الهيدر من progressiveSurfaceState
 */

import { useMemo } from "react";

import type { ProgressiveSurfaceState } from "../editor";

export interface StatusState {
  statusLabel: string;
  approvalEligible: boolean;
  isApproved: boolean;
  hasRecoverableFailure: boolean;
  showStatus: boolean;
}

export function useStatusState(
  progressiveSurfaceState: ProgressiveSurfaceState | null
): StatusState {
  return useMemo(() => {
    const activeRun = progressiveSurfaceState?.activeRun ?? null;
    const visibleVersion = progressiveSurfaceState?.visibleVersion ?? null;

    const approvalEligible =
      activeRun?.status === "settled" &&
      visibleVersion?.approvalEligible === true;
    const isApproved = activeRun?.status === "approved";
    const hasRecoverableFailure =
      activeRun?.status === "failed-after-visible" &&
      activeRun.failureRecoveryRequired;

    const statusLabel = isApproved
      ? "معتمد"
      : hasRecoverableFailure
        ? "فشل بعد الظهور"
        : activeRun?.status === "settled"
          ? "مستقر"
          : activeRun?.surfaceLocked
            ? "قيد المعالجة"
            : "جاهز";

    const showStatus = Boolean(activeRun ?? visibleVersion);

    return {
      statusLabel,
      approvalEligible,
      isApproved,
      hasRecoverableFailure,
      showStatus,
    };
  }, [progressiveSurfaceState]);
}

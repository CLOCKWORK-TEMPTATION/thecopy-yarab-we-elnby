/**
 * @module app-header/HeaderActions
 * @description مكون أزرار إجراءات الهيدر (اعتماد/إغلاق)
 */

interface HeaderActionsProps {
  approvalEligible: boolean;
  hasRecoverableFailure: boolean;
  onApproveVisibleVersion: () => void;
  onDismissFailure: () => void;
}

export function HeaderActions({
  approvalEligible,
  hasRecoverableFailure,
  onApproveVisibleVersion,
  onDismissFailure,
}: HeaderActionsProps): React.JSX.Element {
  return (
    <>
      {approvalEligible && (
        <button
          type="button"
          onClick={onApproveVisibleVersion}
          className="app-header-status-approve flex h-11 items-center px-4 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--mf-success)] focus-visible:outline-none"
          data-testid="approve-visible-version"
        >
          اعتماد النسخة
        </button>
      )}

      {hasRecoverableFailure && (
        <button
          type="button"
          onClick={onDismissFailure}
          className="app-header-status-dismiss flex h-11 items-center px-4 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--mf-warning)] focus-visible:outline-none"
          data-testid="dismiss-progressive-failure"
        >
          إغلاق الفشل
        </button>
      )}
    </>
  );
}

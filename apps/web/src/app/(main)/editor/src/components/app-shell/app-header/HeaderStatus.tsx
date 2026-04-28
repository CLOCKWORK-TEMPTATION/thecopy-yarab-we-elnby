/**
 * @module app-header/HeaderStatus
 * @description مكون حالة الهيدر
 */

interface HeaderStatusProps {
  statusLabel: string;
  showStatus: boolean;
}

export function HeaderStatus({
  statusLabel,
  showStatus,
}: HeaderStatusProps): React.JSX.Element | null {
  if (!showStatus) return null;

  return (
    <div
      className="mf-pill flex h-11 items-center gap-2 px-4 text-[11px] font-bold"
      data-testid="app-header-status"
    >
      <span className="text-[color:var(--mf-text-muted)]">الحالة</span>
      <span
        className="text-[color:var(--mf-text-strong)]"
        aria-live="polite"
      >
        {statusLabel}
      </span>
    </div>
  );
}

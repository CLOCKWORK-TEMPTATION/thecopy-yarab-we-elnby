/**
 * @module app-header/HeaderSecondary
 * @description الجزء الأيسر من الهيدر (الحالة، الاعتماد، المشروع، الحساب، النسخة)
 */

import { User } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { HeaderStatus } from "./HeaderStatus";
import { HeaderActions } from "./HeaderActions";
import type { StatusState } from "./useStatusState";

interface HeaderSecondaryProps {
  statusState: StatusState;
  activeProjectTitle: string | null;
  onlineDotColor: string;
  brandGradient: string;
  onApproveVisibleVersion: () => void;
  onDismissFailure: () => void;
}

export function HeaderSecondary({
  statusState,
  activeProjectTitle,
  onlineDotColor,
  brandGradient,
  onApproveVisibleVersion,
  onDismissFailure,
}: HeaderSecondaryProps): React.JSX.Element {
  const {
    statusLabel,
    showStatus,
    approvalEligible,
    hasRecoverableFailure,
  } = statusState;

  return (
    <div className="app-header-secondary flex items-center gap-2">
      <HeaderStatus statusLabel={statusLabel} showStatus={showStatus} />

      <HeaderActions
        approvalEligible={approvalEligible}
        hasRecoverableFailure={hasRecoverableFailure}
        onApproveVisibleVersion={onApproveVisibleVersion}
        onDismissFailure={onDismissFailure}
      />

      <HoverBorderGradient
        containerClassName="rounded-full"
        className="flex h-11 items-center gap-2 bg-transparent px-4 text-[11px] font-bold tracking-wider text-[color:var(--mf-text-muted)] uppercase"
        duration={2}
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ backgroundColor: onlineDotColor }}
          aria-hidden="true"
        />
        <span aria-label="حالة الاتصال: متصل">Online</span>
      </HoverBorderGradient>

      {activeProjectTitle ? (
        <HoverBorderGradient
          containerClassName="rounded-full max-w-[260px]"
          className="flex h-11 items-center gap-2 bg-transparent px-4 text-[11px] text-[color:var(--mf-text)]"
          duration={2}
        >
          <span className="text-[color:var(--mf-text-muted)]">المشروع</span>
          <span className="truncate font-bold">{activeProjectTitle}</span>
        </HoverBorderGradient>
      ) : null}

      <HoverBorderGradient
        containerClassName="rounded-full h-11 w-11"
        className="flex h-full w-full cursor-pointer items-center justify-center bg-transparent"
        duration={2}
      >
        <User
          className="size-4 text-[color:var(--mf-text-muted)]"
          aria-label="الحساب"
        />
      </HoverBorderGradient>

      <HoverBorderGradient
        containerClassName="rounded-full"
        className="group flex h-11 cursor-pointer items-center gap-2.5 bg-transparent px-5 leading-none"
        duration={2}
      >
        <span
          className="bg-clip-text text-[15px] font-bold text-transparent"
          style={{ backgroundImage: brandGradient }}
        >
          النسخة
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: onlineDotColor }}
          aria-hidden="true"
        />
      </HoverBorderGradient>
    </div>
  );
}

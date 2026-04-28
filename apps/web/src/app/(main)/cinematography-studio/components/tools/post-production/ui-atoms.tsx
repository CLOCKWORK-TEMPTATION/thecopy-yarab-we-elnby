import { CameraOff, Image as ImageIcon, RefreshCcw } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";

export function ControlButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof ImageIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-10 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
          : "h-10 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
      }
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

export function SecondaryButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  icon?: typeof RefreshCcw | typeof CameraOff;
}) {
  return (
    <Button
      type="button"
      onClick={() => void onClick()}
      className="h-10 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );
}

export function InlineBanner({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "danger";
}) {
  return (
    <div
      className={
        tone === "danger"
          ? "rounded-[10px] border border-[#6b2f2f] bg-[#211010] px-4 py-3 text-sm text-[#f3b4b4]"
          : "rounded-[10px] border border-[#705523] bg-[#1d1509] px-4 py-3 text-sm text-[#f6cf72]"
      }
    >
      {children}
    </div>
  );
}

export function StatusCell({
  label,
  value,
}: {
  label: string;
  value: "pending" | "analyzing" | "complete";
}) {
  const tone =
    value === "complete"
      ? "text-[#97d85c]"
      : value === "analyzing"
        ? "text-[#f6cf72]"
        : "text-[#8f8a7d]";

  return (
    <div className="rounded-[10px] border border-[#262626] bg-[#070707] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold uppercase ${tone}`}>{value}</p>
    </div>
  );
}

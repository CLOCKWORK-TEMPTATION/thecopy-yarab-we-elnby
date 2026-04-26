"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface StatusItem {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

interface StudioStatusBarProps {
  leftItems?: StatusItem[];
  rightItems?: StatusItem[];
  tailText?: React.ReactNode;
  className?: string;
}

const DEFAULT_LEFT_ITEMS: StatusItem[] = [
  { label: "TC", value: "00:00:00:00", valueClassName: "text-white" },
  {
    label: "CAMERA A:",
    value: "ARRI ALEXA 35",
    valueClassName: "text-[#e5b54f]",
  },
];

const DEFAULT_RIGHT_ITEMS: StatusItem[] = [
  { label: "BATTERY", value: "98%", valueClassName: "text-white" },
  { label: "STORAGE", value: "2.4TB", valueClassName: "text-white" },
];

export function StudioStatusBar({
  leftItems = DEFAULT_LEFT_ITEMS,
  rightItems = DEFAULT_RIGHT_ITEMS,
  tailText = (
    <>
      <span className="text-[#7f7b71]">TC</span> 01:45:32:15
    </>
  ),
  className,
}: StudioStatusBarProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[#343434] bg-[#050505] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[#8f8a7d]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-6">
        {leftItems.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2 whitespace-nowrap"
          >
            <span>{item.label}</span>
            <span className={cn("truncate text-white", item.valueClassName)}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden items-center gap-6 lg:flex">
        {rightItems.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2 whitespace-nowrap"
          >
            <span>{item.label}</span>
            <span className={cn("truncate text-white", item.valueClassName)}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="whitespace-nowrap font-mono text-white">{tailText}</div>
    </header>
  );
}

interface StudioFooterBarProps {
  leftText?: React.ReactNode;
  centerText?: React.ReactNode;
  rightText?: React.ReactNode;
  className?: string;
}

export function StudioFooterBar({
  leftText = "TC 01:45:32:16",
  centerText,
  rightText = "TC 00:00:00:00",
  className,
}: StudioFooterBarProps) {
  return (
    <footer
      className={cn(
        "flex items-center justify-between gap-4 border-t border-[#343434] bg-[#050505] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]",
        className
      )}
    >
      <div className="font-mono text-white/85">{leftText}</div>
      <div className="hidden items-center gap-3 text-center text-[#e5b54f] md:flex">
        {centerText}
      </div>
      <div className="font-mono text-white/85">{rightText}</div>
    </footer>
  );
}

interface StudioPanelProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  contentClassName?: string;
}

export function StudioPanel({
  title,
  subtitle,
  headerRight,
  className,
  contentClassName,
  children,
}: StudioPanelProps) {
  return (
    <section
      className={cn(
        "rounded-[10px] border border-[#343434] bg-[#0a0a0a] text-[#e5b54f] shadow-[inset_0_0_0_1px_rgba(229,181,79,0.04)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#262626] px-4 py-3">
        <div className="space-y-1">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#e5b54f]">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[11px] tracking-[0.08em] text-[#8f8a7d]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div className={cn("px-4 py-4", contentClassName)}>{children}</div>
    </section>
  );
}

interface StudioMetricCellProps {
  label: string;
  value: React.ReactNode;
  tone?: "gold" | "white" | "success";
  className?: string;
}

export function StudioMetricCell({
  label,
  value,
  tone = "gold",
  className,
}: StudioMetricCellProps) {
  const toneClassName =
    tone === "white"
      ? "text-white"
      : tone === "success"
        ? "text-[#97d85c]"
        : "text-[#e5b54f]";

  return (
    <div
      className={cn(
        "rounded-[8px] border border-[#262626] bg-[#070707] px-3 py-3",
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tracking-tight",
          toneClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface StudioRailButtonProps {
  icon: LucideIcon;
  label: string;
  caption?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StudioRailButton({
  icon: Icon,
  label,
  caption,
  active = false,
  onClick,
  className,
}: StudioRailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-center gap-2 rounded-[8px] border px-2 py-3 text-center transition-all",
        active
          ? "border-[#e5b54f] bg-[#20170a] text-[#f6cf72] shadow-[0_0_24px_rgba(229,181,79,0.12)]"
          : "border-[#303030] bg-[#101010] text-[#8f8a7d] hover:border-[#73572a] hover:text-[#e5b54f]",
        className
      )}
    >
      <Icon
        className={cn("h-5 w-5", active ? "text-[#e5b54f]" : "text-current")}
      />
      <div className="space-y-1">
        <p className="text-[11px] font-medium leading-tight">{label}</p>
        {caption ? (
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/45">
            {caption}
          </p>
        ) : null}
      </div>
    </button>
  );
}

interface StudioMiniLegendProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function StudioMiniLegend({
  icon: Icon,
  label,
  value,
  className,
}: StudioMiniLegendProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[8px] border border-[#262626] bg-[#070707] px-3 py-2",
        className
      )}
    >
      <Icon className="h-4 w-4 text-[#e5b54f]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
          {label}
        </p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

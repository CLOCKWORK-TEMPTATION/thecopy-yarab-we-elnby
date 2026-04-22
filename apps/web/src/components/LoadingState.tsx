/**
 * Loading State Components
 *
 * Provides accessible loading indicators for better UX
 */

"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

/**
 * Accessible Loading Spinner
 */
export function LoadingSpinner({
  size = "md",
  className,
  label = "جاري التحميل...",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="inline-flex items-center justify-center"
    >
      <div
        className={cn(
          "animate-spin rounded-full border-solid border-primary border-t-transparent",
          sizeClasses[size],
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Full-screen Loading Overlay
 */
export function LoadingOverlay({
  message = "جاري التحميل...",
  fullScreen = true,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm",
        fullScreen ? "fixed inset-0 z-50" : "absolute inset-0"
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <LoadingSpinner size="lg" />
      <p className="text-lg font-medium text-foreground">{message}</p>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

/**
 * Skeleton Loading Placeholder
 */
export function Skeleton({
  className,
  variant = "rectangular",
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-muted",
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="جاري التحميل..."
    >
      <span className="sr-only">جاري التحميل...</span>
    </div>
  );
}

interface LoadingCardProps {
  count?: number;
}

/**
 * Loading Card Skeleton
 */
export function LoadingCard({ count = 1 }: LoadingCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-border p-4"
          role="status"
          aria-label="جاري تحميل البطاقة..."
        >
          <Skeleton className="h-4 w-3/4" variant="text" />
          <Skeleton className="h-4 w-1/2" variant="text" />
          <Skeleton className="h-20 w-full" variant="rectangular" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" variant="rectangular" />
            <Skeleton className="h-8 w-20" variant="rectangular" />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Progress Bar Component
 */
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-2 flex justify-between text-sm">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || "نسبة الإنجاز"}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default {
  LoadingSpinner,
  LoadingOverlay,
  Skeleton,
  LoadingCard,
  ProgressBar,
};

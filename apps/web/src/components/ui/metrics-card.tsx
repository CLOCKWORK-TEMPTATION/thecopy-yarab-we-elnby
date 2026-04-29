"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Enhanced Metrics Card Component
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Animated counter
 * - Sparkline visualization
 * - Trend indicators
 * - Prediction range
 * - Anomaly detection alerts
 * - Glow effects on hover
 */

interface MetricsCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  trend?: "up" | "down" | "stable";
  trendPercentage?: number;
  sparklineData?: number[];
  prediction?: {
    value: number;
    confidence: number;
  };
  isAnomaly?: boolean;
  format?: "number" | "currency" | "percentage" | "time";
  prefix?: string;
  suffix?: string;
  className?: string;
}

// Animated Counter Component
function AnimatedCounter({
  value,
  format = "number",
  prefix = "",
  suffix = "",
}: {
  value: number | string;
  format?: "number" | "currency" | "percentage" | "time";
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const numericValue =
    typeof value === "number" ? value : parseFloat(value) || 0;

  React.useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepValue = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += stepValue;

      if (step >= steps) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [numericValue]);

  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("ar-SA", {
          style: "currency",
          currency: "SAR",
          maximumFractionDigits: 0,
        }).format(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "time":
        return `${Math.floor(val)}:${String(Math.floor((val % 1) * 60)).padStart(2, "0")}`;
      default:
        return new Intl.NumberFormat("ar-SA").format(Math.round(val));
    }
  };

  return (
    <span className="font-variant-numeric tabular-nums">
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}

// Sparkline Component
function Sparkline({
  data,
  className,
  color = "var(--brand)",
  height = 40,
}: {
  data: number[];
  className?: string;
  color?: string;
  height?: number;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * (height - 8);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M 0,${height} L ${pathD.slice(2)} L 100,${height} Z`;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className={cn("w-full", className)}
      preserveAspectRatio="none"
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient
          id={`sparkline-gradient-${data.join("-")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaD} fill={`url(#sparkline-gradient-${data.join("-")})`} />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />

      {/* End point */}
      <circle
        cx="100"
        cy={
          height -
          (((data[data.length - 1] ?? min) - min) / range) * (height - 8)
        }
        r="3"
        fill={color}
        className="drop-shadow-md"
      />
    </svg>
  );
}

// Trend Badge Component
function TrendBadge({
  trend,
  percentage,
}: {
  trend: "up" | "down" | "stable";
  percentage?: number;
}) {
  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        trend === "up" && "bg-accent-success/10 text-accent-success",
        trend === "down" && "bg-accent-error/10 text-accent-error",
        trend === "stable" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {percentage !== undefined && (
        <span>
          {trend === "down" ? "-" : "+"}
          {Math.abs(percentage).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function calculateMetricTrend(
  value: number,
  previousValue: number | undefined,
  trend: MetricsCardProps["trend"]
): MetricsCardProps["trend"] {
  if (trend) {
    return trend;
  }
  if (previousValue === undefined) {
    return undefined;
  }
  if (value > previousValue) {
    return "up";
  }
  if (value < previousValue) {
    return "down";
  }
  return "stable";
}

function calculateMetricPercentage(
  value: number | string,
  previousValue: number | undefined,
  trendPercentage: number | undefined
): number | undefined {
  if (trendPercentage !== undefined) {
    return trendPercentage;
  }
  if (previousValue === undefined || previousValue === 0) {
    return undefined;
  }
  return ((Number(value) - previousValue) / previousValue) * 100;
}

function getSparklineColor(trend: MetricsCardProps["trend"]): string {
  if (trend === "up") {
    return "var(--accent-success)";
  }
  if (trend === "down") {
    return "var(--accent-error)";
  }
  return "var(--brand)";
}

function AnomalyIndicator({ isAnomaly }: { isAnomaly: boolean }) {
  if (!isAnomaly) {
    return null;
  }

  return (
    <div className="absolute top-2 left-2 z-10">
      <AlertTriangle className="h-4 w-4 text-accent-warning animate-pulse" />
    </div>
  );
}

function MetricSparkline({
  data,
  trend,
}: {
  data: number[] | undefined;
  trend: MetricsCardProps["trend"];
}) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="metric-card__sparkline">
      <Sparkline data={data} color={getSparklineColor(trend)} />
    </div>
  );
}

function PredictionRow({ prediction }: Pick<MetricsCardProps, "prediction">) {
  if (!prediction) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
      <Sparkles className="h-3 w-3 text-brand" />
      <span>
        التوقع: {prediction.value.toLocaleString("ar-SA")}
        <span className="opacity-60 mr-1">(ثقة {prediction.confidence}%)</span>
      </span>
    </div>
  );
}

function PreviousValueRow({
  previousValue,
}: Pick<MetricsCardProps, "previousValue">) {
  if (previousValue === undefined) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground">
      السابق: {previousValue.toLocaleString("ar-SA")}
    </div>
  );
}

export function MetricsCard({
  title,
  value,
  previousValue,
  trend,
  trendPercentage,
  sparklineData,
  prediction,
  isAnomaly = false,
  format = "number",
  prefix = "",
  suffix = "",
  className,
}: MetricsCardProps) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const calculatedTrend = calculateMetricTrend(
    numericValue,
    previousValue,
    trend
  );
  const calculatedPercentage = calculateMetricPercentage(
    value,
    previousValue,
    trendPercentage
  );

  return (
    <Card
      className={cn(
        "metric-card relative overflow-hidden card-interactive group",
        isAnomaly && "border-accent-warning animate-glow-pulse",
        className
      )}
    >
      <AnomalyIndicator isAnomaly={isAnomaly} />

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent" />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>{title}</span>
          {calculatedTrend && (
            <TrendBadge
              trend={calculatedTrend}
              percentage={calculatedPercentage ?? 0}
            />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Main Value */}
        <div className="metric-card__value text-3xl font-bold tracking-tight">
          <AnimatedCounter
            value={value}
            format={format}
            prefix={prefix}
            suffix={suffix}
          />
        </div>

        <MetricSparkline data={sparklineData} trend={calculatedTrend} />
        <PredictionRow {...(prediction ? { prediction } : {})} />
        <PreviousValueRow
          {...(previousValue !== undefined ? { previousValue } : {})}
        />
      </CardContent>
    </Card>
  );
}

// Grid of Metrics Cards
export function MetricsGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export default MetricsCard;

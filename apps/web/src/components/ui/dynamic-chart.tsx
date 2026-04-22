"use client";

/**
 * Dynamic Chart Components with Code Splitting
 *
 * This file provides lazy-loaded chart components to reduce initial bundle size.
 * The recharts library (~400KB) is only loaded when charts are actually used.
 *
 * Usage:
 * ```tsx
 * import { DynamicChartContainer, DynamicLineChart } from '@/components/ui/dynamic-chart';
 *
 * <DynamicChartContainer config={config}>
 *   <DynamicLineChart data={data} />
 * </DynamicChartContainer>
 * ```
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Loading component shown while chart is loading
const ChartLoading = () => (
  <div className="flex aspect-video items-center justify-center">
    <div className="animate-pulse text-sm text-muted-foreground">
      Loading chart...
    </div>
  </div>
);

// Dynamically import chart components with loading states
export const DynamicChartContainer = dynamic(
  () => import("./chart").then((mod) => mod.ChartContainer),
  {
    loading: ChartLoading,
    ssr: false, // Charts don't need SSR, improve performance
  }
);

export const DynamicChartTooltip = dynamic(
  () => import("./chart").then((mod) => ({ default: mod.ChartTooltip as any })),
  { ssr: false }
) as any;

export const DynamicChartTooltipContent = dynamic(
  () => import("./chart").then((mod) => ({ default: mod.ChartTooltipContent })),
  { ssr: false }
);

export const DynamicChartLegend = dynamic(
  () => import("./chart").then((mod) => ({ default: mod.ChartLegend as any })),
  { ssr: false }
) as any;

export const DynamicChartLegendContent = dynamic(
  () => import("./chart").then((mod) => ({ default: mod.ChartLegendContent })),
  { ssr: false }
);

// Dynamically import recharts components
export const DynamicLineChart = dynamic(
  () =>
    import("recharts").then((mod) => mod.LineChart) as Promise<
      ComponentType<any>
    >,
  { ssr: false }
);

export const DynamicBarChart = dynamic(
  () =>
    import("recharts").then((mod) => mod.BarChart) as Promise<
      ComponentType<any>
    >,
  { ssr: false }
);

export const DynamicAreaChart = dynamic(
  () =>
    import("recharts").then((mod) => mod.AreaChart) as Promise<
      ComponentType<any>
    >,
  { ssr: false }
);

export const DynamicPieChart = dynamic(
  () =>
    import("recharts").then((mod) => mod.PieChart) as Promise<
      ComponentType<any>
    >,
  { ssr: false }
);

export const DynamicRadarChart = dynamic(
  () =>
    import("recharts").then((mod) => mod.RadarChart) as Promise<
      ComponentType<any>
    >,
  { ssr: false }
);

export const DynamicLine = dynamic(
  () =>
    import("recharts").then((mod) => mod.Line) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicBar = dynamic(
  () =>
    import("recharts").then((mod) => mod.Bar) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicArea = dynamic(
  () =>
    import("recharts").then((mod) => mod.Area) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicPie = dynamic(
  () =>
    import("recharts").then((mod) => mod.Pie) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicRadar = dynamic(
  () =>
    import("recharts").then((mod) => mod.Radar) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicXAxis = dynamic(
  () =>
    import("recharts").then((mod) => mod.XAxis) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicYAxis = dynamic(
  () =>
    import("recharts").then((mod) => mod.YAxis) as Promise<ComponentType<any>>,
  { ssr: false }
);

export const DynamicCartesianGrid = dynamic(
  () =>
    import("recharts").then((mod) => mod.CartesianGrid) as Promise<
      ComponentType<any>
    >,
  { ssr: false }
);

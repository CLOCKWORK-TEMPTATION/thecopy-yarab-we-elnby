import type { Metric } from "web-vitals";

export interface WebVitalsConfig {
  enableGA4: boolean;
  enableSentry: boolean;
  enableConsoleLog: boolean;
  customEndpoint?: string;
  debug: boolean;
}

export interface CustomMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
  rating: Metric["rating"];
  entries: PerformanceEntry[];
  customData?: Record<string, unknown>;
}

export type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
  };
};

export type WindowWithGtag = Window & {
  gtag?: (
    command: string,
    eventName: string,
    params?: Record<string, unknown>
  ) => void;
};

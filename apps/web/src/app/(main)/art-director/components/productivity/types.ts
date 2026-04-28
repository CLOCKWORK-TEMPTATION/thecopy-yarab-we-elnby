export interface TimeFormData {
  task: string;
  hours: string;
  category: string;
}

export interface DelayFormData {
  reason: string;
  impact: string;
  hoursLost: string;
}

export interface ChartItem {
  name: string;
  hours: number;
  color: string;
}

export interface PieItem {
  name: string;
  value: number;
  color: string;
}

export interface ProductivityAnalysis {
  period: string;
  department: string;
  totalHours: number;
  taskCount: number;
  delayHours: number;
  completionRate: number;
}

export interface ProductivitySummaryResponse {
  chartData: ChartItem[];
  pieData: PieItem[];
}

export const DEFAULT_TIME_FORM: TimeFormData = {
  task: "",
  hours: "",
  category: "design",
};

export const DEFAULT_DELAY_FORM: DelayFormData = {
  reason: "",
  impact: "low",
  hoursLost: "",
};

export const EMPTY_ANALYSIS: ProductivityAnalysis = {
  period: "weekly",
  department: "all",
  totalHours: 0,
  taskCount: 0,
  delayHours: 0,
  completionRate: 0,
};

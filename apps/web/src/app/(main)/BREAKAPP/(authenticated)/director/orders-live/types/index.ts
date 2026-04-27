import type { Order } from "@the-copy/breakapp";

export type OrderStatusFilter =
  | "all"
  | "pending"
  | "processing"
  | "completed"
  | "cancelled";

export type TimeSortOrder = "newest" | "oldest";

export interface LiveOrder extends Order {
  vendorId?: string;
  vendorName?: string;
  runnerId?: string;
}

export interface AvailableRunner {
  runnerId: string;
  name?: string;
  status: "available" | "busy" | "offline";
}

export interface RunnerPayload {
  runnerId: string;
  name?: string;
  lat: number;
  lng: number;
  recordedAt: string;
  status: "available" | "busy" | "offline";
}

export interface BatchVendorResult {
  vendorId: string;
  vendorName: string;
  totalItems: number;
}

export interface OrderStatusEvent {
  orderId: string;
  status: Order["status"];
  vendorId?: string;
  runnerId?: string;
}

import type { Order } from "@the-copy/breakapp";

export const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "معلّق",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const SESSION_STORAGE_KEY = "breakapp.director.currentSessionId";

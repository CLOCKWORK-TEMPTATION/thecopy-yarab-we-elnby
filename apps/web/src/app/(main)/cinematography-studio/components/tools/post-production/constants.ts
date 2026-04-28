import type { ExportSettings } from "../../../types";

export const PLATFORM_LABELS: Record<ExportSettings["platform"], string> = {
  "cinema-dcp": "Cinema DCP",
  "broadcast-hd": "Broadcast HD",
  "web-social": "Web / Social",
  bluray: "Blu-ray",
};

export const SCENE_TYPES = [
  { type: "morning", label: "صباحي" },
  { type: "night", label: "ليلي" },
  { type: "indoor", label: "داخلي" },
  { type: "outdoor", label: "خارجي" },
  { type: "happy", label: "سعيد" },
  { type: "sad", label: "حزين" },
] as const;

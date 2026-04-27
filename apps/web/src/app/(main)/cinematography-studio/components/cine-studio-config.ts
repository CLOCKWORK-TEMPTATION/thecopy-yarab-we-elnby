import {
  Aperture,
  Camera,
  Clapperboard,
  Film,
  Focus,
  MonitorPlay,
  Palette,
  PenSquare,
  ScanLine,
  Settings2,
} from "lucide-react";

import type { Phase, ToolStatus, VisualMood } from "../types";
import type { LucideIcon } from "lucide-react";

export interface ToolDefinition {
  id: string;
  name: string;
  nameEn: string;
  icon: LucideIcon;
  description: string;
  color: string;
  status: ToolStatus;
}

export interface PhaseCard {
  phase: Phase;
  title: string;
  titleEn: string;
  icon: LucideIcon;
  description: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "shot-analyzer",
    name: "محلل اللقطة",
    nameEn: "Shot Analyzer",
    icon: ScanLine,
    description: "تحليل حي للصورة والفيديو والكاميرا مع مراقبة فنية.",
    color: "from-[#f6cf72] via-[#e5b54f] to-[#8f6831]",
    status: "available",
  },
  {
    id: "lens-simulator",
    name: "محاكي العدسات",
    nameEn: "Lens Simulator",
    icon: Aperture,
    description: "مقارنة العدسات السينمائية والتحكم في الطابع البصري.",
    color: "from-[#b8a2ff] via-[#6a5acd] to-[#253b82]",
    status: "available",
  },
  {
    id: "dof-calculator",
    name: "حاسبة عمق الميدان",
    nameEn: "DOF Calculator",
    icon: Focus,
    description: "حسابات دقيقة للتركيز والهايبرفوكال وحدود العمق.",
    color: "from-[#8dc4ff] via-[#3b82f6] to-[#12346f]",
    status: "available",
  },
  {
    id: "color-grading",
    name: "التدرج اللوني",
    nameEn: "Color Grading",
    icon: Palette,
    description: "معاينة درجات الفيلم ومراقبة الهيستوجرام والقوالب.",
    color: "from-[#ff9dca] via-[#e7589a] to-[#64305c]",
    status: "available",
  },
];

export const PHASE_CARDS: PhaseCard[] = [
  {
    phase: "pre",
    title: "ما قبل الإنتاج",
    titleEn: "Pre-Production",
    icon: Clapperboard,
    description: "رؤية المشهد والتخطيط البصري وتفكيك قرار اللقطة.",
  },
  {
    phase: "production",
    title: "أثناء التصوير",
    titleEn: "Production",
    icon: Camera,
    description: "التحليل الحي وضبط الإضاءة والعدسات والالتقاط.",
  },
  {
    phase: "post",
    title: "ما بعد الإنتاج",
    titleEn: "Post-Production",
    icon: Film,
    description: "تدريج الألوان والمراجعة والإيقاع والتسليم النهائي.",
  },
];

const resolvedDefaultPhaseCard = PHASE_CARDS.at(0);

if (!resolvedDefaultPhaseCard) {
  throw new Error("PHASE_CARDS must contain at least one phase.");
}

export const DEFAULT_PHASE_CARD: PhaseCard = resolvedDefaultPhaseCard;

export const APP_NAV = [
  { label: "الكتابة", icon: PenSquare, active: false },
  { label: "الاستوديو", icon: MonitorPlay, active: false },
  { label: "الإخراج", icon: Film, active: false },
  { label: "السينما", icon: Camera, active: true },
  { label: "التحليل", icon: ScanLine, active: false },
  { label: "الورشة", icon: Settings2, active: false },
] as const;

export const TAB_VALUE_BY_PHASE: Record<
  Phase,
  "pre-production" | "production" | "post-production"
> = {
  pre: "pre-production",
  production: "production",
  post: "post-production",
};

export function getMoodLabel(mood: VisualMood): string {
  const labels: Record<VisualMood, string> = {
    noir: "نوير",
    realistic: "واقعي",
    surreal: "غرائبي",
    vintage: "كلاسيكي",
  };

  return labels[mood];
}

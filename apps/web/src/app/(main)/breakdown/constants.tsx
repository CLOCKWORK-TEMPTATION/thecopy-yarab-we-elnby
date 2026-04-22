import React from "react";
import {
  Briefcase,
  Calculator,
  CalendarClock,
  Camera,
  Car,
  Dog,
  Flame,
  Lightbulb,
  LayoutGrid,
  MapPin,
  MonitorPlay,
  Palette,
  Repeat,
  ShieldAlert,
  Shirt,
  Skull,
  Sparkles,
  Truck,
  Users,
  Volume2,
} from "lucide-react";
import type { AgentDef } from "./types";
import { AGENT_PRESENTATION } from "./domain/constants";

const ICONS: Record<string, React.ReactNode> = {
  locations: <MapPin className="w-5 h-5" />,
  setDressing: <LayoutGrid className="w-5 h-5" />,
  costumes: <Shirt className="w-5 h-5" />,
  makeup: <Palette className="w-5 h-5" />,
  props: <Briefcase className="w-5 h-5" />,
  sound: <Volume2 className="w-5 h-5" />,
  equipment: <Camera className="w-5 h-5" />,
  vehicles: <Car className="w-5 h-5" />,
  stunts: <Skull className="w-5 h-5" />,
  extras: <Users className="w-5 h-5" />,
  spfx: <Flame className="w-5 h-5" />,
  vfx: <Sparkles className="w-5 h-5" />,
  animals: <Dog className="w-5 h-5" />,
  graphics: <MonitorPlay className="w-5 h-5" />,
  continuity: <Repeat className="w-5 h-5" />,
  creative: <Lightbulb className="w-5 h-5" />,
  budget: <Calculator className="w-5 h-5" />,
  risk: <ShieldAlert className="w-5 h-5" />,
  schedule: <CalendarClock className="w-5 h-5" />,
  logistics: <Truck className="w-5 h-5" />,
};

export const AGENTS: AgentDef[] = AGENT_PRESENTATION.map((agent) => ({
  ...agent,
  icon: ICONS[agent.key],
}));

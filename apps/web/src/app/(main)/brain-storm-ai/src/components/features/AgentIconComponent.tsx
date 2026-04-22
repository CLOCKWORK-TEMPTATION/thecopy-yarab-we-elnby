/**
 * @module AgentIconComponent
 * @description مكون عرض أيقونة الوكيل
 */

"use client";

import { memo } from "react";
import {
  Brain,
  Users,
  MessageSquare,
  BookOpen,
  Target,
  Shield,
  Zap,
  Cpu,
  Layers,
  Rocket,
  FileText,
  Sparkles,
  Trophy,
  Globe,
  Film,
  BarChart,
  Lightbulb,
  Compass,
  Fingerprint,
  PenTool,
  Music,
  Search,
} from "lucide-react";
import type { AgentIcon } from "../../types";

interface AgentIconComponentProps {
  icon: AgentIcon;
  className?: string;
}

const AgentIconComponent = memo(function AgentIconComponent({
  icon,
  className = "w-5 h-5",
}: AgentIconComponentProps) {
  const iconMap: Record<AgentIcon, React.ReactNode> = {
    brain: <Brain className={className} />,
    users: <Users className={className} />,
    "message-square": <MessageSquare className={className} />,
    "book-open": <BookOpen className={className} />,
    target: <Target className={className} />,
    shield: <Shield className={className} />,
    zap: <Zap className={className} />,
    cpu: <Cpu className={className} />,
    layers: <Layers className={className} />,
    rocket: <Rocket className={className} />,
    "file-text": <FileText className={className} />,
    sparkles: <Sparkles className={className} />,
    trophy: <Trophy className={className} />,
    globe: <Globe className={className} />,
    film: <Film className={className} />,
    "chart-bar": <BarChart className={className} />,
    lightbulb: <Lightbulb className={className} />,
    compass: <Compass className={className} />,
    fingerprint: <Fingerprint className={className} />,
    "pen-tool": <PenTool className={className} />,
    music: <Music className={className} />,
    search: <Search className={className} />,
  };
  return iconMap[icon] || <Cpu className={className} />;
});

export default AgentIconComponent;

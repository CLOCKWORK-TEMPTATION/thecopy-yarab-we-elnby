/**
 * @fileoverview استوديو السينما الذكي
 *
 * غلاف بصري جديد لمسار مدير التصوير مع الحفاظ على نفس منطق الخطافات
 * والتنقل بين الأدوات والمراحل.
 */

"use client";

import {
  Aperture,
  Camera,
  Clapperboard,
  Film,
  Focus,
  LayoutGrid,
  MonitorPlay,
  Palette,
  PenSquare,
  Play,
  ScanLine,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { useMemo, useCallback } from "react";
import { Toaster } from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCinematographyStudio } from "../hooks";

import {
  StudioFooterBar,
  StudioMetricCell,
  StudioMiniLegend,
  StudioPanel,
  StudioRailButton,
  StudioStatusBar,
} from "./studio-ui";
import PostProductionTools from "./tools/PostProductionTools";
import PreProductionTools from "./tools/PreProductionTools";
import ProductionTools from "./tools/ProductionTools";

import type { Phase, ToolStatus, VisualMood } from "../types";
import type { LucideIcon } from "lucide-react";

const LensSimulator = dynamic(() => import("./tools/LensSimulatorTool"), {
  ssr: false,
});

const ColorGradingPreview = dynamic(
  () => import("./tools/ColorGradingPreviewTool"),
  {
    ssr: false,
  }
);

const DOFCalculator = dynamic(() => import("./tools/DOFCalculatorTool"), {
  ssr: false,
});

/**
 * تحميل طبقة التشخيص فقط حين العلم البيئي مفعّل.
 *
 * النمط المستخدم: شرط `if` صارم على ثابت بُنيَ من `process.env.*` الذي يستبدله
 * Next.js عند البناء (DefinePlugin). عندما يكون العلم غير مضبوط على "1" يصبح
 * الشرط `false` فعليًا أثناء البناء، فيُحذف بلوك if كاملًا (dead-code elimination)
 * بما فيه استدعاء `import()` — فلا يولّد webpack أي chunk للـ overlay.
 */
let DiagnosticOverlayContainer: React.ComponentType | null = null;
if (process.env.NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS === "1") {
  DiagnosticOverlayContainer = dynamic(
    () => import("./diagnostics/DiagnosticOverlayContainer"),
    { ssr: false }
  );
}

interface ToolDefinition {
  id: string;
  name: string;
  nameEn: string;
  icon: LucideIcon;
  description: string;
  color: string;
  status: ToolStatus;
}

interface PhaseCard {
  phase: Phase;
  title: string;
  titleEn: string;
  icon: LucideIcon;
  description: string;
}

const TOOLS: ToolDefinition[] = [
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

const PHASE_CARDS: PhaseCard[] = [
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

const DEFAULT_PHASE_CARD = PHASE_CARDS.at(0);

if (!DEFAULT_PHASE_CARD) {
  throw new Error("PHASE_CARDS must contain at least one phase.");
}

const APP_NAV = [
  { label: "الكتابة", icon: PenSquare, active: false },
  { label: "الاستوديو", icon: MonitorPlay, active: false },
  { label: "الإخراج", icon: Film, active: false },
  { label: "السينما", icon: Camera, active: true },
  { label: "التحليل", icon: ScanLine, active: false },
  { label: "الورشة", icon: Settings2, active: false },
] as const;

export const CineAIStudio: React.FC = () => {
  const {
    visualMood,
    activeTool,
    activeView,
    currentPhase,
    currentTabValue,
    hasActiveTool,
    setVisualMood,
    openTool,
    closeTool,
    setActiveView,
    navigateToPhase,
    handleTabChange,
  } = useCinematographyStudio();

  const activeToolComponent = useMemo(() => {
    switch (activeTool) {
      case "lens-simulator":
        return <LensSimulator />;
      case "color-grading":
        return <ColorGradingPreview />;
      case "dof-calculator":
        return <DOFCalculator />;
      case "shot-analyzer":
        return <ProductionTools mood={visualMood} />;
      default:
        return null;
    }
  }, [activeTool, visualMood]);

  const activeToolData = useMemo(
    () => TOOLS.find((tool) => tool.id === activeTool) ?? null,
    [activeTool]
  );

  const availableToolsCount = useMemo(
    () => TOOLS.filter((tool) => tool.status === "available").length,
    []
  );

  const currentPhaseData = useMemo(
    () =>
      PHASE_CARDS.find((card) => card.phase === currentPhase) ??
      DEFAULT_PHASE_CARD,
    [currentPhase]
  );

  const moodLabel = getMoodLabel(visualMood);

  const handleToolClick = useCallback(
    (toolId: string, status: ToolStatus) => {
      if (status === "available") {
        openTool(toolId);
      }
    },
    [openTool]
  );

  const phaseContent = useMemo(() => {
    switch (currentTabValue) {
      case "pre-production":
        return <PreProductionTools mood={visualMood} />;
      case "production":
        return <ProductionTools mood={visualMood} />;
      case "post-production":
        return <PostProductionTools mood={visualMood} />;
      default:
        return null;
    }
  }, [currentTabValue, visualMood]);

  return (
    <div className="min-h-screen bg-black text-[#e5b54f]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(12,12,12,0.95)",
            color: "#f3e6c0",
            border: "1px solid rgba(229,181,79,0.2)",
          },
        }}
      />

      <StudioStatusBar />

      {DiagnosticOverlayContainer ? <DiagnosticOverlayContainer /> : null}

      <div className="grid min-h-[calc(100vh-84px)] grid-cols-[84px_minmax(0,1fr)]">
        <aside className="border-r border-[#343434] bg-[#050505] px-2 py-3">
          <div className="flex h-full flex-col gap-2">
            {APP_NAV.map((item) => (
              <StudioRailButton
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={item.active}
                className="min-h-[74px]"
              />
            ))}

            <div className="mt-auto rounded-[8px] border border-[#262626] bg-[#0c0c0c] px-2 py-3 text-center">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#7f7b71]">
                Mood
              </p>
              <p className="mt-2 text-sm text-white">{moodLabel}</p>
            </div>
          </div>
        </aside>

        {hasActiveTool && activeToolData ? (
          <ToolWorkspace
            tool={activeToolData}
            visualMood={visualMood}
            moodLabel={moodLabel}
            onMoodChange={setVisualMood}
            onOpenTool={openTool}
            onCloseTool={closeTool}
          >
            {activeToolComponent}
          </ToolWorkspace>
        ) : (
          <DashboardWorkspace
            activeView={activeView}
            visualMood={visualMood}
            moodLabel={moodLabel}
            currentPhaseData={currentPhaseData}
            availableToolsCount={availableToolsCount}
            currentTabValue={currentTabValue}
            onMoodChange={setVisualMood}
            onViewChange={setActiveView}
            onToolClick={handleToolClick}
            onPhaseClick={navigateToPhase}
            onTabChange={handleTabChange}
            phaseContent={phaseContent}
          />
        )}
      </div>

      <StudioFooterBar
        centerText={
          <span className="text-[10px] uppercase tracking-[0.28em]">
            {hasActiveTool && activeToolData
              ? activeToolData.nameEn
              : "Director Of Photography OS"}
          </span>
        }
      />
    </div>
  );
};

interface ToolWorkspaceProps {
  tool: ToolDefinition;
  visualMood: VisualMood;
  moodLabel: string;
  onMoodChange: (mood: string) => void;
  onOpenTool: (toolId: string) => void;
  onCloseTool: () => void;
  children: React.ReactNode;
}

function ToolWorkspace({
  tool,
  visualMood,
  moodLabel,
  onMoodChange,
  onOpenTool,
  onCloseTool,
  children,
}: ToolWorkspaceProps) {
  return (
    <main className="overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.08),transparent_28%),linear-gradient(180deg,#030303_0%,#000_100%)] p-4">
      <div className="grid gap-4 xl:grid-cols-[104px_minmax(0,1fr)]">
        <StudioPanel
          title="Live Tools"
          subtitle="أدوات العمل السريع"
          className="h-fit"
          contentClassName="space-y-2 px-2 py-2"
        >
          {TOOLS.map((item) => (
            <StudioRailButton
              key={item.id}
              icon={item.icon}
              label={item.name}
              caption={item.nameEn}
              active={item.id === tool.id}
              onClick={() => onOpenTool(item.id)}
              className="min-h-[86px]"
            />
          ))}
        </StudioPanel>

        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <StudioPanel
              title={tool.name}
              subtitle={tool.description}
              headerRight={
                <Badge className="border-0 bg-[#1b150b] px-3 py-1 text-[#f6cf72]">
                  {tool.nameEn}
                </Badge>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[8px] border border-[#262626] bg-[#070707] p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br ${tool.color}`}
                    >
                      <tool.icon className="h-6 w-6 text-black" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
                        Active View
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {tool.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StudioMetricCell label="Mode" value={moodLabel} />
                  <StudioMetricCell
                    label="Status"
                    value="Ready"
                    tone="success"
                  />
                </div>
              </div>
            </StudioPanel>

            <StudioPanel
              title="Session Controls"
              subtitle="إعدادات الجلسة الحالية"
            >
              <div className="space-y-4">
                <div className="rounded-[8px] border border-[#262626] bg-[#070707] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
                    Project Mood
                  </p>
                  <Select value={visualMood} onValueChange={onMoodChange}>
                    <SelectTrigger className="mt-3 h-11 border-[#343434] bg-[#0d0d0d] text-right text-[#f2e4bc]">
                      <SelectValue placeholder="اختر المود" />
                    </SelectTrigger>
                    <SelectContent className="border-[#343434] bg-[#090909] text-[#f2e4bc]">
                      <SelectItem value="noir">نوير</SelectItem>
                      <SelectItem value="realistic">واقعي</SelectItem>
                      <SelectItem value="surreal">غرائبي</SelectItem>
                      <SelectItem value="vintage">كلاسيكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onCloseTool}
                  className="h-11 w-full border-[#73572a] bg-[#120d06] text-[#f6cf72] hover:bg-[#23160a]"
                >
                  العودة إلى لوحة الاستوديو
                </Button>
              </div>
            </StudioPanel>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}

interface DashboardWorkspaceProps {
  activeView: "dashboard" | "phases";
  visualMood: VisualMood;
  moodLabel: string;
  currentPhaseData: PhaseCard;
  availableToolsCount: number;
  currentTabValue: string;
  onMoodChange: (mood: string) => void;
  onViewChange: (view: "dashboard" | "phases") => void;
  onToolClick: (toolId: string, status: ToolStatus) => void;
  onPhaseClick: (phase: Phase) => void;
  onTabChange: (value: string) => void;
  phaseContent: React.ReactNode;
}

function DashboardWorkspace({
  activeView,
  visualMood,
  moodLabel,
  currentPhaseData,
  availableToolsCount,
  currentTabValue,
  onMoodChange,
  onViewChange,
  onToolClick,
  onPhaseClick,
  onTabChange,
  phaseContent,
}: DashboardWorkspaceProps) {
  return (
    <main className="overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.08),transparent_28%),linear-gradient(180deg,#030303_0%,#000_100%)] p-4">
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <StudioPanel
            title="Vision CineAI"
            subtitle="Director of Photography OS"
            headerRight={
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => onViewChange("dashboard")}
                  className={
                    activeView === "dashboard"
                      ? "h-10 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                      : "h-10 border border-[#343434] bg-[#0c0c0c] text-[#b4aa92] hover:bg-[#151515]"
                  }
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  الأدوات
                </Button>
                <Button
                  type="button"
                  onClick={() => onViewChange("phases")}
                  className={
                    activeView === "phases"
                      ? "h-10 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                      : "h-10 border border-[#343434] bg-[#0c0c0c] text-[#b4aa92] hover:bg-[#151515]"
                  }
                >
                  <Film className="mr-2 h-4 w-4" />
                  المراحل
                </Button>
              </div>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-[10px] border border-[#2b2b2b] bg-[linear-gradient(135deg,rgba(229,181,79,0.1),rgba(5,5,5,0.6)_45%,rgba(5,5,5,0.96)_100%)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#8f8a7d]">
                      Active Workspace
                    </p>
                    <h1 className="text-4xl font-semibold tracking-tight text-[#f7d486]">
                      مدير التصوير
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-[#ddd2b8]">
                      واجهة تنفيذية موحّدة تجمع أدوات التحليل الحي والعدسات وعمق
                      الميدان وتدرج الألوان داخل محطة تشغيل واحدة.
                    </p>
                  </div>
                  <Badge className="border-0 bg-[#15100a] px-3 py-2 text-[#f6cf72]">
                    {moodLabel}
                  </Badge>
                </div>
              </div>

              <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
                <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
                  Project Mood
                </p>
                <Select value={visualMood} onValueChange={onMoodChange}>
                  <SelectTrigger className="mt-3 h-11 border-[#343434] bg-[#0d0d0d] text-right text-[#f2e4bc]">
                    <SelectValue placeholder="اختر المود" />
                  </SelectTrigger>
                  <SelectContent className="border-[#343434] bg-[#090909] text-[#f2e4bc]">
                    <SelectItem value="noir">نوير</SelectItem>
                    <SelectItem value="realistic">واقعي</SelectItem>
                    <SelectItem value="surreal">غرائبي</SelectItem>
                    <SelectItem value="vintage">كلاسيكي</SelectItem>
                  </SelectContent>
                </Select>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <StudioMetricCell
                    label="Tools"
                    value={availableToolsCount}
                    className="px-2"
                  />
                  <StudioMetricCell
                    label="Phase"
                    value={currentPhaseData.title}
                    tone="white"
                    className="px-2"
                  />
                </div>
              </div>
            </div>
          </StudioPanel>

          <StudioPanel title="Run State" subtitle="مؤشرات التشغيل الحالية">
            <div className="grid gap-3 sm:grid-cols-2">
              <StudioMiniLegend
                icon={Sparkles}
                label="Available Tools"
                value={availableToolsCount}
              />
              <StudioMiniLegend
                icon={Film}
                label="Current Stage"
                value={currentPhaseData.title}
              />
              <StudioMiniLegend icon={Wand2} label="Mood" value={moodLabel} />
              <StudioMiniLegend
                icon={Play}
                label="Workspace"
                value={
                  activeView === "dashboard" ? "لوحة الأدوات" : "مراحل العمل"
                }
              />
            </div>
          </StudioPanel>
        </div>

        {activeView === "dashboard" ? (
          <>
            <StudioPanel
              title="Cinematography Tools"
              subtitle="الأدوات النشطة داخل محطة مدير التصوير"
            >
              <div className="grid gap-4 lg:grid-cols-4">
                {TOOLS.map((tool) => (
                  <DashboardToolCard
                    key={tool.id}
                    tool={tool}
                    onClick={() => onToolClick(tool.id, tool.status)}
                  />
                ))}
              </div>
            </StudioPanel>

            <StudioPanel
              title="Production Stages"
              subtitle="مراحل التنفيذ داخل المسار"
            >
              <div className="grid gap-4 xl:grid-cols-3">
                {PHASE_CARDS.map((card) => (
                  <PhaseStageCard
                    key={card.phase}
                    card={card}
                    isActive={card.phase === currentPhaseData.phase}
                    onClick={() => onPhaseClick(card.phase)}
                  />
                ))}
              </div>
            </StudioPanel>
          </>
        ) : (
          <StudioPanel
            title="Phase Workspace"
            subtitle={currentPhaseData.description}
          >
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                {PHASE_CARDS.map((card) => (
                  <PhaseStageButton
                    key={card.phase}
                    card={card}
                    isActive={
                      TAB_VALUE_BY_PHASE[card.phase] === currentTabValue
                    }
                    onClick={() => onTabChange(TAB_VALUE_BY_PHASE[card.phase])}
                  />
                ))}
              </div>

              <div className="rounded-[10px] border border-[#262626] bg-[#040404] p-4">
                {phaseContent}
              </div>
            </div>
          </StudioPanel>
        )}
      </div>
    </main>
  );
}

function DashboardToolCard({
  tool,
  onClick,
}: {
  tool: ToolDefinition;
  onClick: () => void;
}) {
  const Icon = tool.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-[10px] border border-[#343434] bg-[#070707] text-right transition-all hover:border-[#73572a] hover:bg-[#0d0d0d]"
    >
      <div className="flex items-center justify-between border-b border-[#262626] px-4 py-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-br ${tool.color}`}
        >
          <Icon className="h-5 w-5 text-black" />
        </div>
        <Badge className="border-0 bg-[#15100a] text-[#f6cf72]">متاح</Badge>
      </div>

      <div className="flex flex-1 flex-col px-4 py-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
          {tool.nameEn}
        </p>
        <p className="mt-3 text-xl font-semibold text-white">{tool.name}</p>
        <p className="mt-3 text-sm leading-7 text-[#b4aa92]">
          {tool.description}
        </p>
        <div className="mt-auto pt-6 text-left text-[11px] uppercase tracking-[0.28em] text-[#e5b54f]">
          Launch
        </div>
      </div>
    </button>
  );
}

function PhaseStageCard({
  card,
  isActive,
  onClick,
}: {
  card: PhaseCard;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = card.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full items-center gap-4 rounded-[10px] border px-5 py-5 text-right transition-all ${
        isActive
          ? "border-[#e5b54f] bg-[#21180b] shadow-[0_0_28px_rgba(229,181,79,0.08)]"
          : "border-[#343434] bg-[#070707] hover:border-[#73572a] hover:bg-[#0d0d0d]"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[10px] border border-[#73572a] bg-[#120d06]">
        <Icon className="h-6 w-6 text-[#e5b54f]" />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
          {card.titleEn}
        </p>
        <p className="text-xl font-semibold text-white">{card.title}</p>
        <p className="text-sm leading-7 text-[#b4aa92]">{card.description}</p>
      </div>
    </button>
  );
}

function PhaseStageButton({
  card,
  isActive,
  onClick,
}: {
  card: PhaseCard;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = card.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-[10px] border px-4 py-4 text-right transition-all ${
        isActive
          ? "border-[#e5b54f] bg-[#21180b]"
          : "border-[#343434] bg-[#070707] hover:border-[#73572a]"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[#72592f] bg-[#140f08]">
        <Icon className="h-5 w-5 text-[#e5b54f]" />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
          {card.titleEn}
        </p>
        <p className="text-lg font-semibold text-white">{card.title}</p>
      </div>
    </button>
  );
}

function getMoodLabel(mood: VisualMood): string {
  const labels: Record<VisualMood, string> = {
    noir: "نوير",
    realistic: "واقعي",
    surreal: "غرائبي",
    vintage: "كلاسيكي",
  };

  return labels[mood];
}

const TAB_VALUE_BY_PHASE: Record<
  Phase,
  "pre-production" | "production" | "post-production"
> = {
  pre: "pre-production",
  production: "production",
  post: "post-production",
};

export default CineAIStudio;

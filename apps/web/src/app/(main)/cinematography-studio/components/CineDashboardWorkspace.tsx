import { Film, LayoutGrid, Play, Sparkles, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PHASE_CARDS, TAB_VALUE_BY_PHASE, TOOLS } from "./cine-studio-config";
import { SceneStudioPanel } from "./scene/SceneStudioPanel";
import { StudioMetricCell, StudioMiniLegend, StudioPanel } from "./studio-ui";

import type { Phase, ToolStatus, VisualMood } from "../types";
import type { PhaseCard, ToolDefinition } from "./cine-studio-config";
import type { ReactNode } from "react";

interface CineDashboardWorkspaceProps {
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
  phaseContent: ReactNode;
}

export function CineDashboardWorkspace({
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
}: CineDashboardWorkspaceProps) {
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

              <MoodPanel
                visualMood={visualMood}
                availableToolsCount={availableToolsCount}
                currentPhaseData={currentPhaseData}
                onMoodChange={onMoodChange}
              />
            </div>
          </StudioPanel>

          <RunStatePanel
            activeView={activeView}
            moodLabel={moodLabel}
            currentPhaseData={currentPhaseData}
            availableToolsCount={availableToolsCount}
          />
        </div>

        {activeView === "dashboard" ? (
          <DashboardPanels
            currentPhaseData={currentPhaseData}
            onToolClick={onToolClick}
            onPhaseClick={onPhaseClick}
          />
        ) : (
          <PhaseWorkspace
            currentPhaseData={currentPhaseData}
            currentTabValue={currentTabValue}
            onTabChange={onTabChange}
            phaseContent={phaseContent}
          />
        )}
      </div>
    </main>
  );
}

function MoodPanel({
  visualMood,
  availableToolsCount,
  currentPhaseData,
  onMoodChange,
}: {
  visualMood: VisualMood;
  availableToolsCount: number;
  currentPhaseData: PhaseCard;
  onMoodChange: (mood: string) => void;
}) {
  return (
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
  );
}

function RunStatePanel({
  activeView,
  moodLabel,
  currentPhaseData,
  availableToolsCount,
}: {
  activeView: "dashboard" | "phases";
  moodLabel: string;
  currentPhaseData: PhaseCard;
  availableToolsCount: number;
}) {
  return (
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
          value={activeView === "dashboard" ? "لوحة الأدوات" : "مراحل العمل"}
        />
      </div>
    </StudioPanel>
  );
}

function DashboardPanels({
  currentPhaseData,
  onToolClick,
  onPhaseClick,
}: {
  currentPhaseData: PhaseCard;
  onToolClick: (toolId: string, status: ToolStatus) => void;
  onPhaseClick: (phase: Phase) => void;
}) {
  return (
    <>
      <SceneStudioPanel />

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
  );
}

function PhaseWorkspace({
  currentPhaseData,
  currentTabValue,
  onTabChange,
  phaseContent,
}: {
  currentPhaseData: PhaseCard;
  currentTabValue: string;
  onTabChange: (value: string) => void;
  phaseContent: ReactNode;
}) {
  return (
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
              isActive={TAB_VALUE_BY_PHASE[card.phase] === currentTabValue}
              onClick={() => onTabChange(TAB_VALUE_BY_PHASE[card.phase])}
            />
          ))}
        </div>

        <div className="rounded-[10px] border border-[#262626] bg-[#040404] p-4">
          {phaseContent}
        </div>
      </div>
    </StudioPanel>
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

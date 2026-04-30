/**
 * @fileoverview استوديو السينما الذكي
 *
 * غلاف بصري جديد لمسار مدير التصوير مع الحفاظ على نفس منطق الخطافات
 * والتنقل بين الأدوات والمراحل.
 */

"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo } from "react";

import { useCinematographyStudio } from "../hooks";

import {
  DEFAULT_PHASE_CARD,
  PHASE_CARDS,
  TOOLS,
  getMoodLabel,
} from "./cine-studio-config";
import { CineDashboardWorkspace } from "./CineDashboardWorkspace";
import { CineStudioShell } from "./CineStudioShell";
import { CineToolWorkspace } from "./CineToolWorkspace";
import PostProductionTools from "./tools/PostProductionTools";
import PreProductionTools from "./tools/PreProductionTools";
import ProductionTools from "./tools/ProductionTools";

import type { ToolStatus } from "../types";

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

let DiagnosticOverlayContainer: React.ComponentType | null = null;
if (process.env["NEXT_PUBLIC_CINEMATOGRAPHY_DIAGNOSTICS"] === "1") {
  DiagnosticOverlayContainer = dynamic(
    () => import("./diagnostics/DiagnosticOverlayContainer"),
    { ssr: false }
  );
}

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

  useEffect(() => {
    document.documentElement.classList.add("cinematography-responsive-page");
    document.body.classList.add("cinematography-responsive-page");

    return () => {
      document.documentElement.classList.remove(
        "cinematography-responsive-page"
      );
      document.body.classList.remove("cinematography-responsive-page");
    };
  }, []);

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
    <CineStudioShell
      moodLabel={moodLabel}
      footerText={
        hasActiveTool && activeToolData
          ? activeToolData.nameEn
          : "Director Of Photography OS"
      }
      diagnosticOverlay={
        DiagnosticOverlayContainer ? <DiagnosticOverlayContainer /> : null
      }
    >
      {hasActiveTool && activeToolData ? (
        <CineToolWorkspace
          tool={activeToolData}
          visualMood={visualMood}
          moodLabel={moodLabel}
          onMoodChange={setVisualMood}
          onOpenTool={openTool}
          onCloseTool={closeTool}
        >
          {activeToolComponent}
        </CineToolWorkspace>
      ) : (
        <CineDashboardWorkspace
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
    </CineStudioShell>
  );
};

export default CineAIStudio;

import React from "react";

import { RhythmAnalysis } from "./index";

import type { SceneRhythmAnalysis } from "../../types";

type RhythmTab = "map" | "comparison" | "monotony" | "suggestions";

interface RhythmAnalysisPageProps {
  rhythmScriptText: string;
  setRhythmScriptText: (text: string) => void;
  analyzingRhythm: boolean;
  rhythmAnalysis: SceneRhythmAnalysis | null;
  selectedRhythmTab: RhythmTab;
  setSelectedRhythmTab: (tab: RhythmTab) => void;
  useRhythmSampleScript: () => void;
  analyzeSceneRhythm: () => void;
  getTempoColor: (tempo: string) => string;
  getTempoLabel: (tempo: string) => string;
  getSeverityColor: (severity: string) => string;
}

export const RhythmAnalysisPage: React.FC<RhythmAnalysisPageProps> = ({
  rhythmScriptText,
  setRhythmScriptText,
  analyzingRhythm,
  rhythmAnalysis,
  selectedRhythmTab,
  setSelectedRhythmTab,
  useRhythmSampleScript,
  analyzeSceneRhythm,
  getTempoColor,
  getTempoLabel,
  getSeverityColor,
}) => (
  <RhythmAnalysis
    rhythmScriptText={rhythmScriptText}
    setRhythmScriptText={setRhythmScriptText}
    analyzingRhythm={analyzingRhythm}
    rhythmAnalysis={rhythmAnalysis}
    selectedRhythmTab={selectedRhythmTab}
    setSelectedRhythmTab={setSelectedRhythmTab}
    useRhythmSampleScript={useRhythmSampleScript}
    analyzeSceneRhythm={analyzeSceneRhythm}
    getTempoColor={getTempoColor}
    getTempoLabel={getTempoLabel}
    getSeverityColor={getSeverityColor}
  />
);

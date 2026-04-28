import React from "react";
import { RhythmAnalysis } from "./index";

interface RhythmAnalysisPageProps {
  rhythmScriptText: string;
  setRhythmScriptText: (text: string) => void;
  analyzingRhythm: boolean;
  rhythmAnalysis: any;
  useRhythmSampleScript: () => void;
  analyzeSceneRhythm: () => void;
  getTempoLabel: (tempo: string) => string;
}

export const RhythmAnalysisPage: React.FC<RhythmAnalysisPageProps> = ({
  rhythmScriptText,
  setRhythmScriptText,
  analyzingRhythm,
  rhythmAnalysis,
  useRhythmSampleScript,
  analyzeSceneRhythm,
  getTempoLabel,
}) => (
  <RhythmAnalysis
    rhythmScriptText={rhythmScriptText}
    setRhythmScriptText={setRhythmScriptText}
    analyzingRhythm={analyzingRhythm}
    rhythmAnalysis={rhythmAnalysis}
    useRhythmSampleScript={useRhythmSampleScript}
    analyzeSceneRhythm={analyzeSceneRhythm}
    getTempoLabel={getTempoLabel}
  />
);

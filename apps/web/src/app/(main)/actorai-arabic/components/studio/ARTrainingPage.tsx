import React from "react";
import { ARTraining } from "./index";

interface ARTrainingPageProps {
  arMode: string;
  setArMode: (mode: string) => void;
  teleprompterSettings: any;
  setTeleprompterSettings: (settings: any) => void;
  blockingMarks: any[];
  setBlockingMarks: (marks: any[]) => void;
  cameraSettings: any;
  setCameraSettings: (settings: any) => void;
  holographicPartner: any;
  setHolographicPartner: (partner: any) => void;
  activeGestures: any[];
  setActiveGestures: (gestures: any[]) => void;
  arSessionActive: boolean;
  setArSessionActive: (active: boolean) => void;
  visionProConnected: boolean;
}

export const ARTrainingPage: React.FC<ARTrainingPageProps> = ({
  arMode,
  setArMode,
  teleprompterSettings,
  setTeleprompterSettings,
  blockingMarks,
  setBlockingMarks,
  cameraSettings,
  setCameraSettings,
  holographicPartner,
  setHolographicPartner,
  activeGestures,
  setActiveGestures,
  arSessionActive,
  setArSessionActive,
  visionProConnected,
}) => (
  <ARTraining
    arMode={arMode}
    setArMode={setArMode}
    teleprompterSettings={teleprompterSettings}
    setTeleprompterSettings={setTeleprompterSettings}
    blockingMarks={blockingMarks}
    setBlockingMarks={setBlockingMarks}
    cameraSettings={cameraSettings}
    setCameraSettings={setCameraSettings}
    holographicPartner={holographicPartner}
    setHolographicPartner={setHolographicPartner}
    activeGestures={activeGestures}
    setActiveGestures={setActiveGestures}
    arSessionActive={arSessionActive}
    setArSessionActive={setArSessionActive}
    visionProConnected={visionProConnected}
  />
);

import React from "react";

import { ARTraining } from "./ARTraining";

import type { ARTrainingProps } from "./ARTraining";

type ARTrainingPageProps = ARTrainingProps;

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

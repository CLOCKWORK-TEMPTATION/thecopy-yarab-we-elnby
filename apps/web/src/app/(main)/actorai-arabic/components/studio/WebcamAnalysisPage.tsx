import React from "react";

import { WebcamAnalysis } from "./index";

import type { WebcamPermission } from "../../hooks/useWebcamAnalysis";
import type { BlinkRateStatus, WebcamAnalysisResult } from "../../types";
import type { RefObject } from "react";

interface WebcamAnalysisPageProps {
  webcamActive: boolean;
  webcamAnalyzing: boolean;
  webcamAnalysisTime: number;
  webcamAnalysisResult: WebcamAnalysisResult | null;
  webcamPermission: WebcamPermission;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  requestWebcamPermission: () => Promise<void>;
  stopWebcam: () => void;
  startWebcamAnalysis: () => void;
  stopWebcamAnalysis: () => void;
  formatTime: (seconds: number) => string;
  getEyeDirectionText: (direction: string) => string;
  getBlinkStatusText: (status: BlinkRateStatus) => string;
  getBlinkStatusColor: (status: BlinkRateStatus) => string;
}

export const WebcamAnalysisPage: React.FC<WebcamAnalysisPageProps> = ({
  webcamActive,
  webcamAnalyzing,
  webcamAnalysisTime,
  webcamAnalysisResult,
  webcamPermission,
  videoRef,
  canvasRef,
  requestWebcamPermission,
  stopWebcam,
  startWebcamAnalysis,
  stopWebcamAnalysis,
  formatTime,
  getEyeDirectionText,
  getBlinkStatusText,
  getBlinkStatusColor,
}) => (
  <WebcamAnalysis
    webcamActive={webcamActive}
    webcamAnalyzing={webcamAnalyzing}
    webcamAnalysisTime={webcamAnalysisTime}
    webcamAnalysisResult={webcamAnalysisResult}
    webcamPermission={webcamPermission}
    videoRef={videoRef}
    canvasRef={canvasRef}
    requestWebcamPermission={requestWebcamPermission}
    stopWebcam={stopWebcam}
    startWebcamAnalysis={startWebcamAnalysis}
    stopWebcamAnalysis={stopWebcamAnalysis}
    formatTime={formatTime}
    getEyeDirectionText={getEyeDirectionText}
    getBlinkStatusText={getBlinkStatusText}
    getBlinkStatusColor={getBlinkStatusColor}
  />
);

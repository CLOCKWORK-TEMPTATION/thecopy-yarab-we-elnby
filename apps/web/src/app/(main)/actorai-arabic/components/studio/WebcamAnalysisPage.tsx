import React from "react";
import { WebcamAnalysis } from "./index";

interface WebcamAnalysisPageProps {
  webcamActive: boolean;
  webcamAnalyzing: boolean;
  webcamAnalysisTime: number;
  webcamAnalysisResult: any;
  webcamPermission: string;
  webcamEngine: string;
  requestWebcamPermission: () => void;
  stopWebcam: () => void;
  startWebcamAnalysis: () => void;
  stopWebcamAnalysis: () => void;
  formatTime: (seconds: number) => string;
  getEyeDirectionText: (direction: string) => string;
  getBlinkStatusText: (status: string) => string;
  getBlinkStatusColor: (status: string) => string;
}

export const WebcamAnalysisPage: React.FC<WebcamAnalysisPageProps> = ({
  webcamActive,
  webcamAnalyzing,
  webcamAnalysisTime,
  webcamAnalysisResult,
  webcamPermission,
  webcamEngine,
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
    webcamEngine={webcamEngine}
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

"use client";

import React, { useCallback, useRef } from "react";

import { useProduction } from "../../hooks";

import { DataAnalysisPanel, ShotAnalyzerPanel } from "./ProductionToolsPanels";
import { SidePanels } from "./ProductionToolsSidePanels";

import type { ProductionToolsProps } from "../../types";

const ProductionTools: React.FC<ProductionToolsProps> = ({ mood = "noir" }) => {
  const {
    analysis,
    analysisSource,
    isAnalyzing,
    error,
    question,
    technicalSettings,
    hasAnalysis,
    hasIssues,
    isReadyToShoot,
    handleAnalyzeShot,
    setQuestion,
    askAssistant,
    dismissAssistantResult,
    assistantAnswer,
    assistantError,
    assistantLastQuestion,
    isAssistantLoading,
    toggleFocusPeaking,
    toggleFalseColor,
    setColorTempFromSlider,
    colorTempValue,
    recommendedColorTemp,
    mediaInput,
  } = useProduction(mood);
  const {
    state: mediaInputState,
    cameraVideoRef,
    cameraCanvasRef,
    setMode,
    selectMediaFile,
    requestCamera,
    stopCamera,
    captureCameraFrame,
    clearMedia,
    canAnalyze,
  } = mediaInput;
  const {
    mode,
    previewType,
    previewUrl,
    error: mediaError,
    isPreparing: isPreparingMedia,
    cameraPermission,
  } = mediaInputState;

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const handleQuestionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuestion(event.target.value);
    },
    [setQuestion]
  );

  const handleQuestionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !isAssistantLoading) {
        event.preventDefault();
        askAssistant().catch(() => undefined);
      }
    },
    [askAssistant, isAssistantLoading]
  );

  const handleImageSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      await selectMediaFile(file);
      event.target.value = "";
    },
    [selectMediaFile]
  );

  const handleVideoSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      await selectMediaFile(file);
      event.target.value = "";
    },
    [selectMediaFile]
  );

  const handleCaptureFromCamera = useCallback(async () => {
    const frame = await captureCameraFrame();
    if (frame) {
      await handleAnalyzeShot(frame);
    }
  }, [captureCameraFrame, handleAnalyzeShot]);

  const handleAnalyzeCurrentInput = useCallback(() => {
    handleAnalyzeShot().catch(() => undefined);
  }, [handleAnalyzeShot]);

  const handleAskAssistant = useCallback(() => {
    askAssistant().catch(() => undefined);
  }, [askAssistant]);

  const issuesList = analysis?.issues ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <ShotAnalyzerPanel
          isReadyToShoot={isReadyToShoot}
          previewType={previewType}
          previewUrl={previewUrl}
          analysisSource={analysisSource}
          technicalSettings={technicalSettings}
          cameraVideoRef={cameraVideoRef}
          cameraCanvasRef={cameraCanvasRef}
          imageInputRef={imageInputRef}
          videoInputRef={videoInputRef}
          onImageSelected={handleImageSelected}
          onVideoSelected={handleVideoSelected}
          hasAnalysis={hasAnalysis}
          analysis={analysis}
          canAnalyze={canAnalyze}
          isAnalyzing={isAnalyzing}
          mode={mode}
          cameraPermission={cameraPermission}
          onSetMode={setMode}
          onClearMedia={clearMedia}
          onSelectImage={() => imageInputRef.current?.click()}
          onSelectVideo={() => videoInputRef.current?.click()}
          onEnableCamera={requestCamera}
          onCaptureFromCamera={handleCaptureFromCamera}
          onStopCamera={stopCamera}
          onAnalyze={handleAnalyzeCurrentInput}
        />

        <DataAnalysisPanel
          hasIssues={hasIssues}
          isPreparingMedia={isPreparingMedia}
          mediaError={mediaError}
          analysisSource={analysisSource}
          error={error}
          issuesList={issuesList}
          hasAnalysis={hasAnalysis}
          question={question}
          isAssistantLoading={isAssistantLoading}
          assistantAnswer={assistantAnswer}
          assistantError={assistantError}
          assistantLastQuestion={assistantLastQuestion}
          onQuestionChange={handleQuestionChange}
          onQuestionKeyDown={handleQuestionKeyDown}
          onAskAssistant={handleAskAssistant}
          onDismissAssistantResult={dismissAssistantResult}
        />
      </div>

      <SidePanels
        technicalSettings={technicalSettings}
        colorTempValue={colorTempValue}
        recommendedColorTemp={recommendedColorTemp}
        mood={mood}
        toggleFocusPeaking={toggleFocusPeaking}
        toggleFalseColor={toggleFalseColor}
        setColorTempFromSlider={setColorTempFromSlider}
      />
    </div>
  );
};

export default ProductionTools;

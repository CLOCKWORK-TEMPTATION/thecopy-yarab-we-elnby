"use client";

import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Palette,
  RefreshCcw,
  Send,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

import { usePostProduction } from "../../hooks";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

import { PLATFORM_LABELS, SCENE_TYPES } from "./post-production/constants";
import { DeliveryManagerPanel } from "./post-production/DeliveryManagerPanel";
import {
  ControlButton,
  InlineBanner,
  SecondaryButton,
  StatusCell,
} from "./post-production/ui-atoms";

import type {
  CameraPermissionState,
  MediaInputMode,
} from "../../hooks/useMediaInputPipeline";
import type { FootageState } from "../../hooks/usePostProduction-types";
import type { ExportSettings, PostProductionToolsProps } from "../../types";

interface DailyCameraReportPanelProps {
  mode: MediaInputMode;
  cameraPermission: CameraPermissionState;
  previewType: "image" | "video" | "camera" | null;
  previewUrl: string | null;
  isUploadingFootage: boolean;
  canAnalyze: boolean;
  isPreparingMedia: boolean;
  mediaError: string | null;
  footageError: string | null;
  footageAnalysisSource: string | null;
  footageAnalysisStatus: FootageState["analysisStatus"];
  footageSummary: {
    score: number | string;
    exposure: number | string;
    colorBalance: number | string;
    focus: number | string;
    suggestions: string[];
  } | null;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  cameraCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onSetMode: (mode: MediaInputMode) => void;
  onClearMedia: () => void;
  onImageSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onVideoSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSelectImage: () => void;
  onSelectVideo: () => void;
  onEnableCamera: () => void;
  onCaptureFromCamera: () => void;
  onStopCamera: () => void;
  onAnalyze: () => Promise<void>;
}

function DailyCameraReportPanel({
  mode,
  cameraPermission,
  previewType,
  previewUrl,
  isUploadingFootage,
  canAnalyze,
  isPreparingMedia,
  mediaError,
  footageError,
  footageAnalysisSource,
  footageAnalysisStatus,
  footageSummary,
  cameraVideoRef,
  cameraCanvasRef,
  imageInputRef,
  videoInputRef,
  onSetMode,
  onClearMedia,
  onImageSelected,
  onVideoSelected,
  onSelectImage,
  onSelectVideo,
  onEnableCamera,
  onCaptureFromCamera,
  onStopCamera,
  onAnalyze,
}: DailyCameraReportPanelProps) {
  return (
    <StudioPanel
      title="Daily Camera Report"
      subtitle="الإطار المرجعي وتحليل اللقطة"
      headerRight={
        <Button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze || isUploadingFootage}
          className="h-11 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
        >
          <Upload className="mr-2 h-4 w-4" />
          تحليل الإطار
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <ControlButton
            label="صورة"
            icon={ImageIcon}
            active={mode === "image"}
            onClick={() => onSetMode("image")}
          />
          <ControlButton
            label="فيديو"
            icon={Video}
            active={mode === "video"}
            onClick={() => onSetMode("video")}
          />
          <ControlButton
            label="كاميرا"
            icon={Camera}
            active={mode === "camera"}
            onClick={() => onSetMode("camera")}
          />
          <Button
            type="button"
            onClick={onClearMedia}
            className="h-10 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            مسح
          </Button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageSelected}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onVideoSelected}
        />
        <canvas ref={cameraCanvasRef} className="hidden" />

        <div className="relative aspect-[16/9] overflow-hidden rounded-[10px] border border-[#343434] bg-[#050505]">
          {previewType === "camera" ? (
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            >
              <track kind="captions" />
            </video>
          ) : previewType === "video" && previewUrl ? (
            <video
              src={previewUrl}
              controls
              className="h-full w-full object-cover"
            >
              <track kind="captions" />
            </video>
          ) : previewType === "image" && previewUrl ? (
            <Image
              src={previewUrl}
              alt="الإطار المرجعي"
              unoptimized
              width={1280}
              height={720}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.08),transparent_26%),linear-gradient(180deg,#0a0a0a_0%,#030303_100%)]">
              <div className="text-center">
                <Film className="mx-auto h-10 w-10 text-[#e5b54f]" />
                <p className="mt-4 text-sm leading-7 text-[#b4aa92]">
                  جهّز إطارًا مرجعيًا من صورة أو فيديو أو كاميرا لبدء التحليل.
                </p>
              </div>
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#f6cf72]">
            {footageAnalysisSource === "local-fallback"
              ? "Local Fallback"
              : "Reference Frame"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {mode === "image" ? (
            <SecondaryButton label="اختيار صورة" onClick={onSelectImage} />
          ) : null}
          {mode === "video" ? (
            <SecondaryButton label="اختيار فيديو" onClick={onSelectVideo} />
          ) : null}
          {mode === "camera" ? (
            cameraPermission === "granted" ? (
              <>
                <SecondaryButton
                  label="التقاط وتحليل"
                  onClick={onCaptureFromCamera}
                />
                <SecondaryButton
                  label="إيقاف الكاميرا"
                  icon={CameraOff}
                  onClick={onStopCamera}
                />
              </>
            ) : (
              <SecondaryButton
                label="تفعيل الكاميرا"
                onClick={onEnableCamera}
              />
            )
          ) : null}
          {canAnalyze ? (
            <SecondaryButton
              label="إعادة التحليل"
              icon={RefreshCcw}
              onClick={onAnalyze}
            />
          ) : null}
        </div>

        {isPreparingMedia ? (
          <InlineBanner>جاري تجهيز إطار مرجعي من الفيديو للتحليل.</InlineBanner>
        ) : null}
        {mediaError ? (
          <InlineBanner tone="danger">{mediaError}</InlineBanner>
        ) : null}
        {footageError ? (
          <InlineBanner tone="danger">{footageError}</InlineBanner>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCell label="Exposure" value={footageAnalysisStatus.exposure} />
          <StatusCell
            label="Color"
            value={footageAnalysisStatus.colorConsistency}
          />
          <StatusCell
            label="Focus"
            value={footageAnalysisStatus.focusQuality}
          />
          <StatusCell label="Motion" value={footageAnalysisStatus.motionBlur} />
        </div>

        {footageSummary ? (
          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StudioMetricCell label="Score" value={footageSummary.score} />
              <StudioMetricCell
                label="Exposure"
                value={footageSummary.exposure}
                tone="white"
              />
              <StudioMetricCell
                label="Color Balance"
                value={footageSummary.colorBalance}
              />
              <StudioMetricCell
                label="Focus"
                value={footageSummary.focus}
                tone="white"
              />
            </div>
            <div className="mt-4 rounded-[8px] border border-[#1f1f1f] bg-[#050505] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
                Suggestions
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[#e8dab3]">
                {footageSummary.suggestions.map((suggestion) => (
                  <li key={suggestion} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 text-[#97d85c]" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </StudioPanel>
  );
}

const PostProductionTools: React.FC<PostProductionToolsProps> = ({ mood }) => {
  const {
    sceneType,
    temperatureValue,
    colorPalette,
    isGeneratingPalette,
    editorialNotes,
    isAnalyzingRhythm,
    isUploadingFootage,
    footageAnalysisStatus,
    footageAnalysisSource,
    footageSummary,
    footageError,
    hasColorPalette,
    setSceneType,
    setTemperature,
    generateColorPalette,
    setEditorialNotes,
    analyzeRhythm,
    uploadFootage,
    exportSettings,
    createExportSettings,
    recommendedTemperature,
    mediaInput,
  } = usePostProduction(mood);
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
    previewType,
    previewUrl,
    mode,
    isPreparing: isPreparingMedia,
    error: mediaError,
    cameraPermission,
  } = mediaInputState;

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const handleNotesChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditorialNotes(event.target.value);
    },
    [setEditorialNotes]
  );

  const handleSceneTypeSelect = useCallback(
    (type: string) => {
      setSceneType(type as Parameters<typeof setSceneType>[0]);
    },
    [setSceneType]
  );

  const handleCreateExportSettings = useCallback(
    (platform: ExportSettings["platform"]) => {
      createExportSettings(platform);
    },
    [createExportSettings]
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
      await uploadFootage(frame);
    }
  }, [captureCameraFrame, uploadFootage]);

  const handleAnalyzeCurrentInput = useCallback(async () => {
    await uploadFootage();
  }, [uploadFootage]);

  const handleEnableCamera = useCallback(async () => {
    setMode("camera");
    await requestCamera();
  }, [requestCamera, setMode]);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
      <StudioPanel
        title="Color Lab"
        subtitle="تدريج الألوان ولوحة المشهد"
        headerRight={<Palette className="h-4 w-4 text-[#e5b54f]" />}
      >
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {SCENE_TYPES.map((item) => (
              <Button
                key={item.type}
                type="button"
                onClick={() => handleSceneTypeSelect(item.type)}
                className={
                  sceneType === item.type
                    ? "h-11 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                    : "h-11 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
                }
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
                Color Temperature
              </p>
              <span className="font-mono text-sm text-white">
                {temperatureValue[0]}K
              </span>
            </div>
            <Slider
              value={temperatureValue}
              onValueChange={setTemperature}
              min={2000}
              max={10000}
              step={100}
              className="mt-4"
            />
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#7f7b71]">
              <span>2000K</span>
              <span className="text-[#e5b54f]">{recommendedTemperature}K</span>
              <span>10000K</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={generateColorPalette}
            disabled={isGeneratingPalette}
            className="h-12 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
          >
            {isGeneratingPalette ? "جاري التوليد..." : "توليد لوحة الألوان"}
          </Button>

          {hasColorPalette ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {colorPalette.map((color) => (
                <div
                  key={color}
                  className="rounded-[10px] border border-[#262626] bg-[#070707] p-3"
                >
                  <div
                    className="h-16 rounded-[8px] border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                  <p className="mt-3 font-mono text-xs text-white">{color}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <StudioMetricCell label="Mood" value={mood} tone="white" />
            <StudioMetricCell
              label="Palette"
              value={hasColorPalette ? colorPalette.length : 0}
            />
          </div>
        </div>
      </StudioPanel>

      <div className="space-y-4">
        <DailyCameraReportPanel
          mode={mode}
          cameraPermission={cameraPermission}
          previewType={previewType}
          previewUrl={previewUrl}
          isUploadingFootage={isUploadingFootage}
          canAnalyze={canAnalyze}
          isPreparingMedia={isPreparingMedia}
          mediaError={mediaError}
          footageError={footageError}
          footageAnalysisSource={footageAnalysisSource}
          footageAnalysisStatus={footageAnalysisStatus}
          footageSummary={footageSummary}
          cameraVideoRef={cameraVideoRef}
          cameraCanvasRef={cameraCanvasRef}
          imageInputRef={imageInputRef}
          videoInputRef={videoInputRef}
          onSetMode={setMode}
          onClearMedia={clearMedia}
          onImageSelected={handleImageSelected}
          onVideoSelected={handleVideoSelected}
          onSelectImage={() => {
            setMode("image");
            imageInputRef.current?.click();
          }}
          onSelectVideo={() => {
            setMode("video");
            videoInputRef.current?.click();
          }}
          onEnableCamera={handleEnableCamera}
          onCaptureFromCamera={handleCaptureFromCamera}
          onStopCamera={stopCamera}
          onAnalyze={handleAnalyzeCurrentInput}
        />
      </div>

      <div className="space-y-4">
        <StudioPanel
          title="Editorial Assistant"
          subtitle="تحليل الإيقاع والتسليم"
          headerRight={<Clapperboard className="h-4 w-4 text-[#e5b54f]" />}
        >
          <div className="space-y-4">
            <Textarea
              value={editorialNotes}
              onChange={handleNotesChange}
              placeholder="اكتب ملاحظات الإيقاع أو تعليمات المونتاج المطلوبة."
              className="min-h-[180px] border-[#343434] bg-[#0d0d0d] text-white placeholder:text-[#6c675c]"
            />
            <Button
              type="button"
              onClick={analyzeRhythm}
              disabled={isAnalyzingRhythm}
              className="h-12 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
            >
              <Send className="mr-2 h-4 w-4" />
              {isAnalyzingRhythm ? "جاري التحليل..." : "تحليل الإيقاع"}
            </Button>
          </div>
        </StudioPanel>

        <DeliveryManagerPanel
          exportSettings={exportSettings}
          platformLabels={PLATFORM_LABELS}
          onCreateExportSettings={handleCreateExportSettings}
        />
      </div>
    </div>
  );
};

export default PostProductionTools;

"use client";

import {
  AlertTriangle,
  Camera,
  CameraOff,
  Image as ImageIcon,
  RefreshCcw,
  ScanLine,
  Send,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { StudioMetricCell, StudioPanel } from "../studio-ui";

import { ActionButton } from "./ActionButton";
import { Banner } from "./Banner";
import { ModeButton } from "./ModeButton";

import type {
  CameraPermissionState,
  MediaInputMode,
} from "../../hooks/useMediaInputPipeline";
import type { TechnicalSettings } from "../../hooks/useProduction-types";
import type { ShotAnalysis } from "../../types";

interface ShotMonitorViewportProps {
  previewType: "image" | "video" | "camera" | null;
  previewUrl: string | null;
  analysisSource: string | null;
  falseColor: boolean;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  cameraCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onVideoSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

function ShotMonitorViewport({
  previewType,
  previewUrl,
  analysisSource,
  falseColor,
  cameraVideoRef,
  cameraCanvasRef,
  imageInputRef,
  videoInputRef,
  onImageSelected,
  onVideoSelected,
}: ShotMonitorViewportProps) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-[10px] border border-[#343434] bg-[#050505]">
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
        <video src={previewUrl} controls className="h-full w-full object-cover">
          <track kind="captions" />
        </video>
      ) : previewType === "image" && previewUrl ? (
        <Image
          src={previewUrl}
          alt="معاينة اللقطة"
          unoptimized
          width={1280}
          height={720}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.1),transparent_28%),linear-gradient(180deg,#0a0a0a_0%,#030303_100%)]">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-[#5b4725] bg-[#0e0a05]">
              <ScanLine className="h-10 w-10 text-[#e5b54f]" />
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#b4aa92]">
              اختر صورة أو فيديو أو فعّل الكاميرا ثم ابدأ تحليل اللقطة الفعلي.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-[12%] border border-[#e5b54f]/40">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#e5b54f]/30" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#e5b54f]/30" />
        </div>
      </div>

      <div className="absolute left-4 top-4 rounded-full bg-[#111]/80 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#f6cf72]">
        {analysisSource === "local-fallback"
          ? "Local Fallback"
          : "Live Monitor"}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-full bg-black/70 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#eee0ba]">
        <span className="h-2 w-2 rounded-full bg-[#e5b54f]" />
        {falseColor ? "False Color" : "False Color Off"}
      </div>
    </div>
  );
}

interface AssistantPanelProps {
  question: string;
  isAssistantLoading: boolean;
  assistantAnswer: string | null;
  assistantError: string | null;
  assistantLastQuestion: string | null;
  onQuestionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuestionKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAskAssistant: () => void;
  onDismiss: () => void;
}

function AssistantPanel({
  question,
  isAssistantLoading,
  assistantAnswer,
  assistantError,
  assistantLastQuestion,
  onQuestionChange,
  onQuestionKeyDown,
  onAskAssistant,
  onDismiss,
}: AssistantPanelProps) {
  return (
    <div
      className="rounded-[10px] border border-[#2a2a2a] bg-[#070707] p-4"
      aria-live="polite"
      data-testid="cine-assistant-panel"
    >
      <p className="text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
        Ask Assistant
      </p>
      <Input
        value={question}
        onChange={onQuestionChange}
        onKeyDown={onQuestionKeyDown}
        disabled={isAssistantLoading}
        placeholder="اسأل عن العدسة أو التعريض أو حالة التركيز"
        aria-label="سؤال المساعد الذكي للتصوير"
        className="mt-4 h-12 border-[#343434] bg-[#0d0d0d] text-white placeholder:text-[#6c675c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707] disabled:opacity-60"
      />
      <Button
        type="button"
        onClick={onAskAssistant}
        disabled={isAssistantLoading || !question.trim()}
        data-testid="cine-assistant-submit"
        className="mt-3 h-11 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="mr-2 h-4 w-4" />
        {isAssistantLoading ? "جاري البحث عن إجابة..." : "إرسال السؤال"}
      </Button>

      {isAssistantLoading ? (
        <div
          className="mt-4 rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 py-3 text-xs text-[#cdbf99]"
          data-testid="cine-assistant-loading"
        >
          جاري البحث عن إجابة من المساعد...
        </div>
      ) : null}

      {assistantError && !isAssistantLoading ? (
        <div
          className="mt-4 rounded-[8px] border border-[#6b2f2f] bg-[#211010] px-3 py-3 text-xs leading-6 text-[#f3b4b4]"
          role="alert"
          data-testid="cine-assistant-error"
        >
          <p className="font-semibold">تعذر إكمال الطلب</p>
          <p className="mt-1">{assistantError}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#f6cf72] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
          >
            إخفاء
          </button>
        </div>
      ) : null}

      {assistantAnswer && !isAssistantLoading ? (
        <div
          className="mt-4 rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 py-3 text-xs leading-7 text-[#e8dab3]"
          data-testid="cine-assistant-answer"
        >
          {assistantLastQuestion ? (
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#7f7b71]">
              {assistantLastQuestion}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-line text-sm text-[#f2e4bc]">
            {assistantAnswer}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#7f7b71] hover:text-[#f6cf72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
          >
            إخفاء
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface InputControlsProps {
  mode: MediaInputMode;
  cameraPermission: CameraPermissionState;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  onSelectImage: () => void;
  onSelectVideo: () => void;
  onEnableCamera: () => void;
  onCaptureFromCamera: () => void;
  onStopCamera: () => void;
  onAnalyze: () => void;
}

function InputControls({
  mode,
  cameraPermission,
  canAnalyze,
  isAnalyzing,
  onSelectImage,
  onSelectVideo,
  onEnableCamera,
  onCaptureFromCamera,
  onStopCamera,
  onAnalyze,
}: InputControlsProps) {
  return (
    <div className="rounded-[10px] border border-[#2a2a2a] bg-[#070707] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
        Input Controls
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "image" ? (
          <ActionButton label="اختيار صورة" onClick={onSelectImage} />
        ) : null}
        {mode === "video" ? (
          <ActionButton label="اختيار فيديو" onClick={onSelectVideo} />
        ) : null}

        {mode === "camera" ? (
          cameraPermission === "granted" ? (
            <>
              <ActionButton
                label="التقاط وتحليل"
                onClick={onCaptureFromCamera}
              />
              <ActionButton
                label="إيقاف الكاميرا"
                icon={CameraOff}
                onClick={onStopCamera}
                variant="ghost"
              />
            </>
          ) : (
            <ActionButton label="تفعيل الكاميرا" onClick={onEnableCamera} />
          )
        ) : null}

        <ActionButton
          label={isAnalyzing ? "جاري المسح الطيفي..." : "تحليل الإدخال المحدد"}
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
        />

        {canAnalyze && !isAnalyzing ? (
          <ActionButton
            label="إعادة التحليل"
            icon={RefreshCcw}
            onClick={onAnalyze}
            variant="ghost"
          />
        ) : null}
      </div>
    </div>
  );
}

export interface ShotAnalyzerPanelProps {
  isReadyToShoot: boolean;
  previewType: "image" | "video" | "camera" | null;
  previewUrl: string | null;
  analysisSource: string | null;
  technicalSettings: TechnicalSettings;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  cameraCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelected: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  onVideoSelected: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  hasAnalysis: boolean;
  analysis: ShotAnalysis | null;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  mode: MediaInputMode;
  cameraPermission: CameraPermissionState;
  onSetMode: (mode: MediaInputMode) => void;
  onClearMedia: () => void;
  onSelectImage: () => void;
  onSelectVideo: () => void;
  onEnableCamera: () => void;
  onCaptureFromCamera: () => void;
  onStopCamera: () => void;
  onAnalyze: () => void;
}

export function ShotAnalyzerPanel({
  isReadyToShoot,
  previewType,
  previewUrl,
  analysisSource,
  technicalSettings,
  cameraVideoRef,
  cameraCanvasRef,
  imageInputRef,
  videoInputRef,
  onImageSelected,
  onVideoSelected,
  hasAnalysis,
  analysis,
  canAnalyze,
  isAnalyzing,
  mode,
  cameraPermission,
  onSetMode,
  onClearMedia,
  onSelectImage,
  onSelectVideo,
  onEnableCamera,
  onCaptureFromCamera,
  onStopCamera,
  onAnalyze,
}: ShotAnalyzerPanelProps) {
  return (
    <StudioPanel
      title="Shot Analyzer"
      subtitle="محلل اللقطة الحي مع كاميرا وصورة وفيديو"
      headerRight={
        <Badge className="border-0 bg-[#15100a] text-[#f6cf72]">
          {isReadyToShoot ? "Ready To Shoot" : "Live Analysis"}
        </Badge>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <ModeButton
            label="صورة"
            icon={ImageIcon}
            active={mode === "image"}
            onClick={() => onSetMode("image")}
          />
          <ModeButton
            label="فيديو"
            icon={Video}
            active={mode === "video"}
            onClick={() => onSetMode("video")}
          />
          <ModeButton
            label="كاميرا"
            icon={Camera}
            active={mode === "camera"}
            onClick={() => onSetMode("camera")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onClearMedia}
            className="h-10 border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            مسح
          </Button>
        </div>

        <ShotMonitorViewport
          previewType={previewType}
          previewUrl={previewUrl}
          analysisSource={analysisSource}
          falseColor={technicalSettings.falseColor}
          cameraVideoRef={cameraVideoRef}
          cameraCanvasRef={cameraCanvasRef}
          imageInputRef={imageInputRef}
          videoInputRef={videoInputRef}
          onImageSelected={onImageSelected}
          onVideoSelected={onVideoSelected}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StudioMetricCell
              label="Exposure"
              value={hasAnalysis ? `${analysis?.exposure ?? 0}%` : "--"}
            />
            <StudioMetricCell
              label="Score"
              value={hasAnalysis ? `${analysis?.score ?? 0}/100` : "--"}
              tone={isReadyToShoot ? "success" : "gold"}
            />
            <StudioMetricCell
              label="Dynamic Range"
              value={analysis?.dynamicRange ?? "--"}
              tone="white"
            />
            <StudioMetricCell
              label="Focus Read"
              value={analysis?.grainLevel ?? "--"}
              tone="white"
            />
          </div>
          <InputControls
            mode={mode}
            cameraPermission={cameraPermission}
            canAnalyze={canAnalyze}
            isAnalyzing={isAnalyzing}
            onSelectImage={onSelectImage}
            onSelectVideo={onSelectVideo}
            onEnableCamera={onEnableCamera}
            onCaptureFromCamera={onCaptureFromCamera}
            onStopCamera={onStopCamera}
            onAnalyze={onAnalyze}
          />
        </div>
      </div>
    </StudioPanel>
  );
}

export interface DataAnalysisPanelProps {
  hasIssues: boolean;
  isPreparingMedia: boolean;
  mediaError: string | null;
  analysisSource: string | null;
  error: string | null;
  issuesList: string[];
  hasAnalysis: boolean;
  question: string;
  isAssistantLoading: boolean;
  assistantAnswer: string | null;
  assistantError: string | null;
  assistantLastQuestion: string | null;
  onQuestionChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onQuestionKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onAskAssistant: () => void;
  onDismissAssistantResult: () => void;
}

export function DataAnalysisPanel({
  hasIssues,
  isPreparingMedia,
  mediaError,
  analysisSource,
  error,
  issuesList,
  hasAnalysis,
  question,
  isAssistantLoading,
  assistantAnswer,
  assistantError,
  assistantLastQuestion,
  onQuestionChange,
  onQuestionKeyDown,
  onAskAssistant,
  onDismissAssistantResult,
}: DataAnalysisPanelProps) {
  return (
    <StudioPanel
      title="Data & AI Analysis"
      subtitle="نتائج الفحص والملاحظات وسؤال المساعد"
      headerRight={
        hasIssues ? (
          <Badge className="border-0 bg-[#28110d] text-[#ffb7a0]">
            Needs Review
          </Badge>
        ) : (
          <Badge className="border-0 bg-[#112010] text-[#97d85c]">Stable</Badge>
        )
      }
    >
      <div className="space-y-4">
        {isPreparingMedia ? (
          <Banner tone="warning">
            جاري تجهيز إطار مرجعي من الفيديو قبل التحليل.
          </Banner>
        ) : null}
        {mediaError ? <Banner tone="danger">{mediaError}</Banner> : null}
        {analysisSource === "local-fallback" ? (
          <Banner tone="warning">
            تم استخدام التحليل المحلي البديل لأن خدمة التحليل البعيد لم تستجب
            بصورة صالحة.
          </Banner>
        ) : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[10px] border border-[#2a2a2a] bg-[#070707] p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#e5b54f]" />
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
                Shot Notes
              </p>
            </div>
            <div className="mt-4 min-h-[180px] rounded-[10px] border border-[#262626] bg-[#050505] p-4">
              {issuesList.length > 0 ? (
                <ul className="space-y-3 text-sm leading-7 text-[#f6d2c8]">
                  {issuesList.map((issue) => (
                    <li key={issue} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#ff9f7d]" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-7 text-[#b4aa92]">
                  {hasAnalysis
                    ? "لا توجد ملاحظات حرجة. اللقطة متوازنة ضمن الحدود المقبولة."
                    : "سيظهر هنا شرح المشكلات أو الملاحظات بعد تشغيل التحليل."}
                </p>
              )}
            </div>
          </div>

          <AssistantPanel
            question={question}
            isAssistantLoading={isAssistantLoading}
            assistantAnswer={assistantAnswer}
            assistantError={assistantError}
            assistantLastQuestion={assistantLastQuestion}
            onQuestionChange={onQuestionChange}
            onQuestionKeyDown={onQuestionKeyDown}
            onAskAssistant={onAskAssistant}
            onDismiss={onDismissAssistantResult}
          />
        </div>
      </div>
    </StudioPanel>
  );
}

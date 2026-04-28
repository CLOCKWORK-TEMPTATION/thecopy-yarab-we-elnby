"use client";

import {
  AlertTriangle,
  Camera,
  CameraOff,
  Image as ImageIcon,
  Send,
  Thermometer,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import { useProduction } from "../../hooks";
import { StudioMetricCell, StudioPanel } from "../studio-ui";
import { ActionButton } from "./ActionButton";
import { Banner } from "./Banner";
import { ModeButton } from "./ModeButton";
import { ScopePanel } from "./ScopePanel";
import { ToggleRow } from "./ToggleRow";

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
        askAssistant().catch(() => {
          // يعرض hook الإنتاج حالة الخطأ في الواجهة.
        });
      }
    },
    [askAssistant, isAssistantLoading]
  );

  const handleSelectImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleSelectVideo = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

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

  const handleEnableCamera = useCallback(async () => {
    await requestCamera();
  }, [requestCamera]);

  const handleCaptureFromCamera = useCallback(async () => {
    const frame = await captureCameraFrame();
    if (frame) {
      await handleAnalyzeShot(frame);
    }
  }, [captureCameraFrame, handleAnalyzeShot]);

  const handleAnalyzeSelectedInput = useCallback(async () => {
    await handleAnalyzeShot();
  }, [handleAnalyzeShot]);

  const issuesList = analysis?.issues ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
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
                onClick={() => setMode("image")}
              />
              <ModeButton
                label="فيديو"
                icon={Video}
                active={mode === "video"}
                onClick={() => setMode("video")}
              />
              <ModeButton
                label="كاميرا"
                icon={Camera}
                active={mode === "camera"}
                onClick={() => setMode("camera")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={clearMedia}
                className="h-10 border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                مسح
              </Button>
            </div>

            <div className="relative aspect-[16/9] overflow-hidden rounded-[10px] border border-[#343434] bg-[#050505]">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelected}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelected}
              />
              <canvas ref={cameraCanvasRef} className="hidden" />

              {previewType === "camera" ? (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : previewType === "video" && previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  className="h-full w-full object-cover"
                />
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
                      اختر صورة أو فيديو أو فعّل الكاميرا ثم ابدأ تحليل اللقطة
                      الفعلي.
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
                {technicalSettings.falseColor
                  ? "False Color"
                  : "False Color Off"}
              </div>
            </div>

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

              <div className="rounded-[10px] border border-[#2a2a2a] bg-[#070707] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
                  Input Controls
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mode === "image" ? (
                    <ActionButton
                      label="اختيار صورة"
                      onClick={handleSelectImage}
                    />
                  ) : null}
                  {mode === "video" ? (
                    <ActionButton
                      label="اختيار فيديو"
                      onClick={handleSelectVideo}
                    />
                  ) : null}

                  {mode === "camera" ? (
                    cameraPermission === "granted" ? (
                      <>
                        <ActionButton
                          label="التقاط وتحليل"
                          onClick={handleCaptureFromCamera}
                        />
                        <ActionButton
                          label="إيقاف الكاميرا"
                          icon={CameraOff}
                          onClick={stopCamera}
                          variant="ghost"
                        />
                      </>
                    ) : (
                      <ActionButton
                        label="تفعيل الكاميرا"
                        onClick={handleEnableCamera}
                      />
                    )
                  ) : null}

                  <ActionButton
                    label={
                      isAnalyzing
                        ? "جاري المسح الطيفي..."
                        : "تحليل الإدخال المحدد"
                    }
                    onClick={handleAnalyzeSelectedInput}
                    disabled={!canAnalyze || isAnalyzing}
                  />

                  {canAnalyze && !isAnalyzing ? (
                    <ActionButton
                      label="إعادة التحليل"
                      icon={RefreshCcw}
                      onClick={handleAnalyzeSelectedInput}
                      variant="ghost"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </StudioPanel>

        <StudioPanel
          title="Data & AI Analysis"
          subtitle="نتائج الفحص والملاحظات وسؤال المساعد"
          headerRight={
            hasIssues ? (
              <Badge className="border-0 bg-[#28110d] text-[#ffb7a0]">
                Needs Review
              </Badge>
            ) : (
              <Badge className="border-0 bg-[#112010] text-[#97d85c]">
                Stable
              </Badge>
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
                تم استخدام التحليل المحلي البديل لأن خدمة التحليل البعيد لم
                تستجب بصورة صالحة.
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
                  onChange={handleQuestionChange}
                  onKeyDown={handleQuestionKeyDown}
                  disabled={isAssistantLoading}
                  placeholder="اسأل عن العدسة أو التعريض أو حالة التركيز"
                  aria-label="سؤال المساعد الذكي للتصوير"
                  className="mt-4 h-12 border-[#343434] bg-[#0d0d0d] text-white placeholder:text-[#6c675c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707] disabled:opacity-60"
                />
                <Button
                  type="button"
                  onClick={askAssistant}
                  disabled={isAssistantLoading || !question.trim()}
                  data-testid="cine-assistant-submit"
                  className="mt-3 h-11 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isAssistantLoading
                    ? "جاري البحث عن إجابة..."
                    : "إرسال السؤال"}
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
                      onClick={dismissAssistantResult}
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
                      onClick={dismissAssistantResult}
                      className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#7f7b71] hover:text-[#f6cf72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
                    >
                      إخفاء
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </StudioPanel>
      </div>

      <div className="space-y-4">
        <StudioPanel title="Scopes" subtitle="مراقبة فنية مباشرة">
          <div className="space-y-3">
            <ScopePanel title="RGB Parade" variant="wave" />
            <ScopePanel title="Vectorscope" variant="vector" />
            <ScopePanel title="Luma Histogram" variant="histogram" />
          </div>
        </StudioPanel>

        <StudioPanel title="Camera Controls" subtitle="إعدادات التشغيل السريع">
          <div className="space-y-4">
            <ToggleRow
              label="Focus Peaking"
              active={technicalSettings.focusPeaking}
              onClick={toggleFocusPeaking}
            />
            <ToggleRow
              label="False Color"
              active={technicalSettings.falseColor}
              onClick={toggleFalseColor}
            />

            <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-[#e5b54f]" />
                  <span className="text-sm text-[#ddd2b8]">Color Temp</span>
                </div>
                <span className="font-mono text-sm text-white">
                  {technicalSettings.colorTemp}K
                </span>
              </div>

              <Slider
                value={colorTempValue}
                onValueChange={setColorTempFromSlider}
                min={2000}
                max={10000}
                step={100}
                className="mt-4"
              />

              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#7f7b71]">
                <span>2000K</span>
                <span className="text-[#e5b54f]">{recommendedColorTemp}K</span>
                <span>10000K</span>
              </div>
            </div>

            <StudioMetricCell label="Project Mood" value={mood} tone="white" />
          </div>
        </StudioPanel>
      </div>
    </div>
  );
};

export default ProductionTools;

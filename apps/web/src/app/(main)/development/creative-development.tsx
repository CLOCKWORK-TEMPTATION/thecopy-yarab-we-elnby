"use client";

/**
 * الصفحة: development / creative-development
 * الهوية: قلب استوديو التطوير الإبداعي داخل قشرة مختبرية داكنة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Download, Eye, Lightbulb } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useMemo } from "react";

import { toText } from "@/ai/gemini-core";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { AgentReportViewer } from "@/components/agent-report-viewer";
import { AgentReportsExporter } from "@/components/agent-reports-exporter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ClassicToolsCard } from "./creative-development-classic-tools";
import { ExecutionPanel } from "./creative-development-execution-panel";
import {
  CATEGORY_LABELS,
  CatalogTaskButtons,
  LoadedStateAlert,
  LockedStateAlert,
  SHELL_CARD,
} from "./creative-development-subcomponents";
import { useCreativeDevelopment } from "./hooks";
import { type AdvancedAISettings } from "./types";
import { DEVELOPMENT_TASKS, getTasksByCategory } from "./utils/task-catalog";

import type { UnlockStatus } from "./hooks/useCreativeDevelopment";

const FileUpload = dynamic(() => import("@/components/file-upload"), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface TextInputCardProps {
  textInput: string;
  analysisReport: string;
  specialRequirements: string;
  additionalInfo: string;
  isAnalysisComplete: boolean;
  fieldsLocked: boolean;
  unlockStatus: { minRequired: number };
  setTextInput: (v: string) => void;
  setAnalysisReport: (v: string) => void;
  setSpecialRequirements: (v: string) => void;
  setAdditionalInfo: (v: string) => void;
  handleFileContent: (content: string, filename: string) => void;
}

function TextInputCard({
  textInput,
  analysisReport,
  specialRequirements,
  additionalInfo,
  isAnalysisComplete,
  fieldsLocked,
  unlockStatus,
  setTextInput,
  setAnalysisReport,
  setSpecialRequirements,
  setAdditionalInfo,
  handleFileContent,
}: TextInputCardProps) {
  return (
    <Card className={SHELL_CARD}>
      <CardHeader>
        <CardTitle>النص الدرامي</CardTitle>
        <CardDescription>
          أدخل النص الدرامي مباشرة أو حمِّله من ملف (100 حرف على الأقل لفتح
          أدوات التطوير)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload onFileContent={handleFileContent} />
        <div>
          <Label htmlFor="screenplay">
            النص الدرامي
            {!isAnalysisComplete && textInput.trim().length > 0 ? (
              <span className="text-amber-400 text-sm mr-2">
                ({textInput.trim().length}/{unlockStatus.minRequired} حرف)
              </span>
            ) : isAnalysisComplete ? (
              <span className="text-green-400 text-sm mr-2">✓ جاهز</span>
            ) : null}
          </Label>
          <Textarea
            id="screenplay"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-40 bg-black/20 border-white/10"
            placeholder="أدخل النص الدرامي هنا (100 حرف على الأقل لفتح أدوات التطوير)..."
            disabled={fieldsLocked}
            data-testid="screenplay-input"
          />
          {fieldsLocked ? (
            <p className="text-sm text-white/45 mt-1">
              تم تحميل النص تلقائياً — اضغط &quot;تعديل يدوي&quot; للتعديل
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="analysisReport">
            تقرير التحليل السابق{" "}
            <span className="text-white/40 text-xs">(اختياري)</span>
            {fieldsLocked ? (
              <span className="text-green-400 text-sm mr-2">
                ✓ محمل تلقائياً
              </span>
            ) : null}
          </Label>
          <Textarea
            id="analysisReport"
            value={analysisReport}
            onChange={(e) => setAnalysisReport(e.target.value)}
            className="min-h-24 bg-black/20 border-white/10"
            placeholder="أدخل تقرير تحليل سابق إن وجد (اختياري — يُحسِّن دقة المخرجات)..."
            disabled={fieldsLocked}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="specialRequirements">متطلبات خاصة</Label>
            <Textarea
              id="specialRequirements"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="توجيهات خاصة للأداة..."
              className="bg-black/20 border-white/10 min-h-20"
            />
          </div>
          <div>
            <Label htmlFor="additionalInfo">معلومات إضافية</Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="سياق أو معلومات داعمة..."
              className="bg-black/20 border-white/10 min-h-20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolCatalogCard({
  isAnalysisComplete,
  catalogByCategory,
  selectedCatalogTaskId,
  handleCatalogTaskSelect,
}: {
  isAnalysisComplete: boolean;
  catalogByCategory: Record<string, ReturnType<typeof getTasksByCategory>>;
  selectedCatalogTaskId: string | null;
  handleCatalogTaskSelect: (id: string) => void;
}) {
  return (
    <Card className={SHELL_CARD} data-testid="tool-catalog">
      <CardHeader>
        <CardTitle>كتالوج أدوات التطوير الإبداعي (27 أداة)</CardTitle>
        <CardDescription>
          {isAnalysisComplete
            ? "اختر الأداة المناسبة ثم اضغط «تنفيذ» للحصول على مخرجات فعلية"
            : "أدخل 100 حرف على الأقل من النص الدرامي لتفعيل الكتالوج"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(
          ["core", "analysis", "creative", "predictive", "advanced"] as const
        ).map((category) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-white/55 mb-3 uppercase tracking-wide">
              {CATEGORY_LABELS[category]}
            </h3>
            <CatalogTaskButtons
              tasks={catalogByCategory[category] ?? []}
              selectedTaskId={selectedCatalogTaskId}
              onTaskSelect={handleCatalogTaskSelect}
              disabled={!isAnalysisComplete}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AIResultCard({
  aiResponse,
  showReport,
  exportReport,
}: {
  aiResponse: NonNullable<
    ReturnType<typeof useCreativeDevelopment>["aiResponse"]
  >;
  showReport: () => void;
  exportReport: () => void;
}) {
  return (
    <Card className={SHELL_CARD}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>نتائج التطوير الإبداعي</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={showReport}>
              <Eye className="w-4 h-4 mr-2" /> التقرير الكامل
            </Button>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" /> تصدير
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-white/10 bg-white/[0.04]">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>المخرجات</AlertTitle>
          <AlertDescription className="prose prose-sm dark:prose-invert mt-2 whitespace-pre-wrap">
            {toText(aiResponse.raw)}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

interface AnalysisStatusSectionProps {
  unlockStatus: UnlockStatus;
  analysisId: string | null;
  isManualMode: boolean;
  isAnalysisComplete: boolean;
  enableManualMode: () => void;
  clearAnalysisData: () => void;
}

function AnalysisStatusSection({
  unlockStatus,
  analysisId,
  isManualMode,
  isAnalysisComplete,
  enableManualMode,
  clearAnalysisData,
}: AnalysisStatusSectionProps) {
  return (
    <>
      {unlockStatus.locked ? <LockedStateAlert status={unlockStatus} /> : null}
      {isAnalysisComplete && analysisId && !isManualMode ? (
        <LoadedStateAlert />
      ) : null}

      {analysisId ? (
        <div className="flex items-center justify-between text-sm text-white/52">
          <span>
            {isManualMode
              ? "الوضع اليدوي — يمكنك تعديل جميع الحقول"
              : `تم تحميل نتائج تحليل المحطات السبع تلقائياً (ID: ${analysisId.slice(0, 8)}...)`}
          </span>
          <div className="flex gap-2">
            {!isManualMode ? (
              <Button
                variant="link"
                size="sm"
                onClick={enableManualMode}
                className="p-0 h-auto"
              >
                تعديل يدوي
              </Button>
            ) : null}
            <Button
              variant="link"
              size="sm"
              onClick={clearAnalysisData}
              className="p-0 h-auto ml-2"
            >
              مسح البيانات
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const DramaAnalystApp: React.FC = () => {
  const {
    textInput,
    selectedTask,
    selectedCatalogTaskId,
    specialRequirements,
    additionalInfo,
    completionScope,
    selectedCompletionEnhancements,
    analysisReport,
    isAnalysisComplete,
    isManualMode,
    taskResults,
    showReportModal,
    analysisId,
    advancedSettings,
    aiResponse,
    catalogResult,
    error,
    isLoading,
    creativeTasks,
    tasksRequiringScope,
    completionEnhancements,
    unlockStatus,
    setTextInput,
    setSpecialRequirements,
    setAdditionalInfo,
    setCompletionScope,
    setAnalysisReport,
    handleTaskSelect,
    handleCatalogTaskSelect,
    handleToggleEnhancement,
    handleSubmit,
    executeTask,
    handleFileContent,
    clearAnalysisData,
    enableManualMode,
    updateAdvancedSettings,
    exportReport,
    showReport,
    getAgentReport,
  } = useCreativeDevelopment();

  const fieldsLocked = Boolean(analysisId) && !isManualMode;

  const handleCatalogSubmit = useCallback(async () => {
    if (!selectedCatalogTaskId) return;
    await executeTask(selectedCatalogTaskId);
  }, [selectedCatalogTaskId, executeTask]);

  const catalogByCategory = useMemo(
    () => ({
      core: getTasksByCategory("core"),
      analysis: getTasksByCategory("analysis"),
      creative: getTasksByCategory("creative"),
      predictive: getTasksByCategory("predictive"),
      advanced: getTasksByCategory("advanced"),
    }),
    []
  );

  const handleSettingChange = useCallback(
    (key: keyof AdvancedAISettings, value: boolean) => {
      updateAdvancedSettings({ [key]: value });
    },
    [updateAdvancedSettings]
  );

  const agentReport = useMemo(() => getAgentReport(), [getAgentReport]);

  const selectedCatalogTask = useMemo(
    () =>
      selectedCatalogTaskId
        ? DEVELOPMENT_TASKS.find((t) => t.id === selectedCatalogTaskId)
        : null,
    [selectedCatalogTaskId]
  );

  const activeResult = catalogResult ?? aiResponse;
  const activeResultText = activeResult
    ? toText(activeResult.raw || activeResult.text)
    : null;

  return (
    <div
      dir="rtl"
      className="container mx-auto max-w-6xl p-6 space-y-6 text-white"
    >
      <CardSpotlight className="overflow-hidden rounded-[30px] border border-white/8 bg-black/22 p-2 backdrop-blur-2xl">
        <Card className={SHELL_CARD}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              مختبر تطوير النصوص الدرامية
            </CardTitle>
            <CardDescription className="text-center">
              أدخل نصًا أو حمِّل ملفًا، ثم اختر أداة من الكتالوج واضغط تنفيذ
              للحصول على مخرجات فعلية
            </CardDescription>
          </CardHeader>
        </Card>
      </CardSpotlight>

      <AnalysisStatusSection
        unlockStatus={unlockStatus}
        analysisId={analysisId}
        isManualMode={isManualMode}
        isAnalysisComplete={isAnalysisComplete}
        enableManualMode={enableManualMode}
        clearAnalysisData={clearAnalysisData}
      />

      <TextInputCard
        textInput={textInput}
        analysisReport={analysisReport}
        specialRequirements={specialRequirements}
        additionalInfo={additionalInfo}
        isAnalysisComplete={isAnalysisComplete}
        fieldsLocked={fieldsLocked}
        unlockStatus={unlockStatus}
        setTextInput={setTextInput}
        setAnalysisReport={setAnalysisReport}
        setSpecialRequirements={setSpecialRequirements}
        setAdditionalInfo={setAdditionalInfo}
        handleFileContent={handleFileContent}
      />

      <ToolCatalogCard
        isAnalysisComplete={isAnalysisComplete}
        catalogByCategory={catalogByCategory}
        selectedCatalogTaskId={selectedCatalogTaskId}
        handleCatalogTaskSelect={handleCatalogTaskSelect}
      />

      {isAnalysisComplete && selectedCatalogTask ? (
        <ExecutionPanel
          selectedCatalogTask={selectedCatalogTask}
          textInput={textInput}
          isLoading={isLoading}
          error={error}
          activeResultText={activeResultText}
          hasCatalogResult={!!catalogResult}
          onSubmit={handleCatalogSubmit}
        />
      ) : null}

      {isAnalysisComplete ? (
        <ClassicToolsCard
          creativeTasks={creativeTasks}
          selectedTask={selectedTask}
          onTaskSelect={handleTaskSelect}
          completionEnhancements={completionEnhancements}
          selectedCompletionEnhancements={selectedCompletionEnhancements}
          onToggleEnhancement={handleToggleEnhancement}
          tasksRequiringScope={tasksRequiringScope}
          completionScope={completionScope}
          onCompletionScopeChange={setCompletionScope}
          advancedSettings={advancedSettings}
          onSettingChange={handleSettingChange}
          isLoading={isLoading}
          textInput={textInput}
          onSubmit={handleSubmit}
        />
      ) : null}

      {error && !selectedCatalogTaskId ? (
        <Alert variant="destructive" className="border-white/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {aiResponse && !catalogResult ? (
        <AIResultCard
          aiResponse={aiResponse}
          showReport={showReport}
          exportReport={exportReport}
        />
      ) : null}

      {showReportModal && agentReport ? (
        <AgentReportViewer report={agentReport} />
      ) : null}

      {Object.keys(taskResults).length > 0 ? (
        <Card className={SHELL_CARD}>
          <CardHeader>
            <CardTitle>التقارير المجمعة</CardTitle>
            <CardDescription>
              تم إنجاز {Object.keys(taskResults).length} مهمة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentReportsExporter
              reports={taskResults}
              originalText={textInput}
              onExport={() => {
                /* empty */
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default DramaAnalystApp;

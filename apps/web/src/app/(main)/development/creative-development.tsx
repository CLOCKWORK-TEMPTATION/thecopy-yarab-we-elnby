"use client";

/**
 * الصفحة: development / creative-development
 * الهوية: قلب استوديو التطوير الإبداعي داخل قشرة مختبرية داكنة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import {
  Loader2,
  Lightbulb,
  Lock,
  Unlock,
  Wand2,
  Brain,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Database,
  Eye,
  Shield,
  Users,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { useMemo, useCallback } from "react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useCreativeDevelopment } from "./hooks";
import {
  CreativeTaskType,
  CREATIVE_TASK_LABELS,
  type AdvancedAISettings,
  type DevelopmentTaskDefinition,
} from "./types";
import { DEVELOPMENT_TASKS, getTasksByCategory } from "./utils/task-catalog";
import {
  getCreativeTaskIcon,
  getCatalogTaskIcon,
} from "./utils/task-icon-mapper";

import type { UnlockStatus } from "./hooks/useCreativeDevelopment";



const FileUpload = dynamic(() => import("@/components/file-upload"), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

const SHELL_CARD = "border-white/8 bg-black/10 backdrop-blur-xl";

interface LockedStateAlertProps {
  status: UnlockStatus;
}

const LockedStateAlert = React.memo(function LockedStateAlert({
  status,
}: LockedStateAlertProps) {
  const message =
    status.reason === "no-report"
      ? "أدخل تقرير التحليل (المحطة السابعة) في الحقل أدناه لفتح أدوات التطوير الإبداعي. يلزم 100 حرف على الأقل."
      : `تقرير التحليل أقصر من الحد الأدنى المطلوب (${status.reportLength}/${status.minRequired} حرف).`;
  return (
    <Alert className="border-white/10 bg-white/[0.04]">
      <Lock className="h-4 w-4" />
      <AlertTitle>قسم التطوير الإبداعي مقفل</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {status.progress > 0 && status.progress < 100 ? (
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
});

const LoadedStateAlert = React.memo(function LoadedStateAlert() {
  return (
    <Alert className="border-white/10 bg-white/[0.04]">
      <Unlock className="h-4 w-4" />
      <AlertTitle>تم تحميل نتائج التحليل</AlertTitle>
      <AlertDescription>
        يمكنك الآن استخدام أدوات التطوير الإبداعي لتحليل النص الخاص بك
      </AlertDescription>
    </Alert>
  );
});

interface AISettingsProps {
  settings: AdvancedAISettings;
  onSettingChange: (key: keyof AdvancedAISettings, value: boolean) => void;
}

const AdvancedAISettingsCard = React.memo(function AdvancedAISettingsCard({
  settings,
  onSettingChange,
}: AISettingsProps) {
  const settingsConfig = useMemo(
    () => [
      {
        key: "enableRAG" as const,
        icon: <Database className="w-4 h-4 text-blue-500" />,
        title: "RAG (الاسترجاع المعزز)",
        description: "يسترجع سياق ذي صلة من النص الأصلي والتحليل لضمان الدقة",
      },
      {
        key: "enableSelfCritique" as const,
        icon: <Brain className="w-4 h-4 text-purple-500" />,
        title: "النقد الذاتي",
        description: "مراجعة وتحسين المخرجات تلقائياً قبل العرض النهائي",
      },
      {
        key: "enableConstitutional" as const,
        icon: <Shield className="w-4 h-4 text-green-500" />,
        title: "الذكاء الدستوري",
        description: "التأكد من الالتزام بقواعد الأمانة والتماسك السردي",
      },
      {
        key: "enableHallucination" as const,
        icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
        title: "كشف الهلوسات",
        description: "اكتشاف وتصحيح المحتوى غير المستند للنص الأصلي",
      },
      {
        key: "enableUncertainty" as const,
        icon: <CheckCircle2 className="w-4 h-4 text-cyan-500" />,
        title: "قياس عدم اليقين",
        description: "قياس مستوى الثقة في المخرجات (قد يبطئ الأداء)",
      },
      {
        key: "enableDebate" as const,
        icon: <Users className="w-4 h-4 text-indigo-500" />,
        title: "النقاش متعدد الوكلاء",
        description: "نقاش بين وكلاء متعددة للتوصل لأفضل حل (بطيء جداً)",
      },
    ],
    []
  );

  return (
    <Card className={SHELL_CARD}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          الإعدادات المتقدمة لأنظمة الذكاء الاصطناعي
        </CardTitle>
        <CardDescription>
          تفعيل/تعطيل الأنظمة المتقدمة (RAG، النقد الذاتي، الذكاء الدستوري، كشف
          الهلوسات)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsConfig.map((config) => (
            <div
              key={config.key}
              className="flex items-start space-x-3 space-x-reverse p-3 rounded-lg border border-white/8 bg-white/[0.04]"
            >
              <Checkbox
                id={config.key}
                checked={settings[config.key]}
                onCheckedChange={(checked) =>
                  onSettingChange(config.key, checked as boolean)
                }
              />
              <div className="space-y-1 flex-1">
                <Label
                  htmlFor={config.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  {config.icon}
                  {config.title}
                </Label>
                <p className="text-xs text-white/55">{config.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

interface TaskButtonsProps {
  tasks: CreativeTaskType[];
  selectedTask: CreativeTaskType | null;
  onTaskSelect: (task: CreativeTaskType) => void;
}

const TaskButtons = React.memo(function TaskButtons({
  tasks,
  selectedTask,
  onTaskSelect,
}: TaskButtonsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {tasks.map((task) => (
        <Button
          key={task}
          variant={selectedTask === task ? "default" : "outline"}
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => onTaskSelect(task)}
        >
          {getCreativeTaskIcon(task)}
          <span className="text-xs text-center">
            {CREATIVE_TASK_LABELS[task]}
          </span>
        </Button>
      ))}
    </div>
  );
});

interface CatalogTaskButtonsProps {
  tasks: DevelopmentTaskDefinition[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  disabled?: boolean;
}

const CatalogTaskButtons = React.memo(function CatalogTaskButtons({
  tasks,
  selectedTaskId,
  onTaskSelect,
  disabled = false,
}: CatalogTaskButtonsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {tasks.map((task) => (
        <Button
          key={task.id}
          variant={selectedTaskId === task.id ? "default" : "outline"}
          className="h-auto p-3 flex flex-col items-center space-y-1.5"
          onClick={() => onTaskSelect(task.id)}
          title={
            disabled
              ? "أدخل 100 حرف على الأقل من النص الدرامي لفتح الأداة"
              : task.description
          }
          disabled={disabled}
          aria-disabled={disabled}
        >
          {getCatalogTaskIcon(task.id)}
          <span className="text-xs text-center leading-tight">
            {task.nameAr}
          </span>
        </Button>
      ))}
    </div>
  );
});

const CATEGORY_LABELS: Record<DevelopmentTaskDefinition["category"], string> = {
  core: "الأساسية",
  analysis: "التحليل",
  creative: "الإبداع",
  predictive: "التنبؤية",
  advanced: "المتقدمة",
};

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

  /** هل حقول النص مقفلة (تم التحميل التلقائي ولم يُفعَّل الوضع اليدوي)؟ */
  const fieldsLocked = !!analysisId && !isManualMode;

  /** تنفيذ المهمة المختارة من الكتالوج */
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

  /** معلومات المهمة المختارة من الكتالوج */
  const selectedCatalogTask = useMemo(
    () =>
      selectedCatalogTaskId
        ? DEVELOPMENT_TASKS.find((t) => t.id === selectedCatalogTaskId)
        : null,
    [selectedCatalogTaskId]
  );

  /** النص الذي يعرض النتيجة — يستوعب كلا المسارين */
  const activeResult = catalogResult ?? aiResponse;
  const activeResultText = activeResult
    ? toText(activeResult.raw || activeResult.text)
    : null;

  return (
    <div
      dir="rtl"
      className="container mx-auto max-w-6xl p-6 space-y-6 text-white"
    >
      {/* ---- رأس الصفحة ---- */}
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

      {/* ---- تنبيه الحالة ---- */}
      {unlockStatus.locked ? <LockedStateAlert status={unlockStatus} /> : null}
      {isAnalysisComplete && analysisId && !isManualMode ? (
        <LoadedStateAlert />
      ) : null}

      {/* ---- شريط معلومات الجلسة ---- */}
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

      {/* ---- المدخلات الأساسية ---- */}
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

          {/* تقرير التحليل (اختياري — يُحسِّن جودة المخرجات) */}
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

          {/* الإعدادات المشتركة */}
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

      {/* ---- كتالوج الأدوات (27 أداة) — يظهر دائمًا، وتُقفل أزراره قبل بلوغ
           الحد الأدنى لطول النص. هذا هو العقد الذي تفترضه اختبارات النهاية إلى النهاية. ---- */}
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
                tasks={catalogByCategory[category]}
                selectedTaskId={selectedCatalogTaskId}
                onTaskSelect={handleCatalogTaskSelect}
                disabled={!isAnalysisComplete}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- لوحة تنفيذ الأداة المختارة ---- */}
      {isAnalysisComplete && selectedCatalogTask ? (
        <Card
          className="border-[var(--page-accent)]/30 bg-black/30 backdrop-blur-xl"
          data-testid="execution-panel"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getCatalogTaskIcon(selectedCatalogTask.id)}
              <span>
                تنفيذ:{" "}
                <span className="text-[var(--page-accent)]">
                  {selectedCatalogTask.nameAr}
                </span>
              </span>
            </CardTitle>
            <CardDescription>{selectedCatalogTask.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* تحذير النص الفارغ */}
            {!textInput.trim() ? (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-300">
                  النص مطلوب للتنفيذ
                </AlertTitle>
                <AlertDescription className="text-amber-200/80">
                  أدخل النص الدرامي في الحقل أعلاه ثم اضغط تنفيذ
                </AlertDescription>
              </Alert>
            ) : null}

            {/* زر التنفيذ الرئيسي */}
            <div className="flex justify-center">
              <Button
                onClick={handleCatalogSubmit}
                disabled={isLoading || !textInput.trim()}
                size="lg"
                className="px-12 py-6 text-lg bg-[var(--page-accent)] hover:bg-[var(--page-accent)]/80 text-white"
                data-testid="execute-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري التنفيذ...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 ml-2" />
                    تنفيذ: {selectedCatalogTask.nameAr}
                  </>
                )}
              </Button>
            </div>

            {/* عرض الخطأ */}
            {error ? (
              <Alert variant="destructive" data-testid="error-display">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>خطأ في التنفيذ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {/* عرض نتيجة كتالوج الأدوات */}
            {catalogResult && activeResultText ? (
              <div
                className="mt-4 space-y-3"
                data-testid="catalog-result-panel"
              >
                <Alert className="border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertTitle className="text-green-300">
                    ✅ مخرجات: {selectedCatalogTask.nameAr}
                  </AlertTitle>
                  <AlertDescription className="mt-3 text-white/90 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                    {activeResultText}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([activeResultText], {
                        type: "text/plain;charset=utf-8",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedCatalogTask.id}_result.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تصدير النتيجة
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ---- الأدوات الكلاسيكية (14 أداة — مسار handleSubmit) ---- */}
      {isAnalysisComplete ? (
        <Card className={SHELL_CARD}>
          <CardHeader>
            <CardTitle>أدوات التطوير الإبداعي (الكلاسيكية)</CardTitle>
            <CardDescription>
              مسار بديل يستخدم نظام المناظرة متعدد الوكلاء
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TaskButtons
              tasks={creativeTasks}
              selectedTask={selectedTask}
              onTaskSelect={handleTaskSelect}
            />

            {/* خيارات إضافية للمسار الكلاسيكي */}
            {selectedTask === CreativeTaskType.COMPLETION ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white/70">
                  تحسينات الإكمال:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {completionEnhancements.map((enhancement) => (
                    <div
                      key={enhancement}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={enhancement}
                        checked={selectedCompletionEnhancements.includes(
                          enhancement
                        )}
                        onCheckedChange={() =>
                          handleToggleEnhancement(enhancement)
                        }
                      />
                      <Label htmlFor={enhancement} className="text-sm">
                        {CREATIVE_TASK_LABELS[enhancement] || enhancement}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedTask && tasksRequiringScope.includes(selectedTask) ? (
              <div>
                <Label htmlFor="completionScope">نطاق الإكمال المطلوب</Label>
                <Input
                  id="completionScope"
                  value={completionScope}
                  onChange={(e) => setCompletionScope(e.target.value)}
                  placeholder="مثال: فصل واحد، 3 مشاهد، حتى نهاية المسرحية..."
                  className="bg-black/20 border-white/10 mt-1"
                />
              </div>
            ) : null}

            {selectedTask ? (
              <AdvancedAISettingsCard
                settings={advancedSettings}
                onSettingChange={handleSettingChange}
              />
            ) : null}

            {selectedTask ? (
              <div className="text-center pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !selectedTask || !textInput}
                  size="lg"
                  className="px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري التطوير...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      بدء التطوير الإبداعي
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ---- خطأ المسار الكلاسيكي ---- */}
      {error && !selectedCatalogTaskId ? (
        <Alert variant="destructive" className="border-white/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* ---- نتيجة المسار الكلاسيكي ---- */}
      {aiResponse && !catalogResult ? (
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
      ) : null}

      {/* ---- Modal التقرير الكامل ---- */}
      {showReportModal && agentReport ? (
        <AgentReportViewer report={agentReport} />
      ) : null}

      {/* ---- التقارير المجمعة (عند وجود نتائج متراكمة) ---- */}
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
              onExport={() => {}}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default DramaAnalystApp;

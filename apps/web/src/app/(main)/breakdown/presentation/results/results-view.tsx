import {
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Loader2,
  MapPin,
  RotateCcw,
} from "lucide-react";
import React from "react";

import { useSceneAnalysis } from "../../application/workspace/use-scene-analysis";
import { useToastQueue } from "../../application/workspace/use-toast-queue";
import CastBreakdownView from "../cast/cast-breakdown-view";
import { ToastContainer } from "../shared/toast-container";

import AgentCard from "./agent-card";
import ScenarioNavigator from "./scenario-navigator";

import type {
  BreakdownReport,
  Scene,
  SceneBreakdown,
  ScenarioAnalysis,
  TechnicalBreakdownKey,
} from "../../domain/models";

interface ResultsViewProps {
  report: BreakdownReport | null;
  scenes: Scene[];
  onUpdateScene: (
    id: number,
    breakdown: SceneBreakdown | undefined,
    scenarios?: ScenarioAnalysis,
    scenePatch?: Partial<Scene>
  ) => void;
  onRestoreVersion: (sceneId: number, versionId: string) => void;
}

function resolveAgentItems(
  analysis: SceneBreakdown | undefined,
  key: TechnicalBreakdownKey
): string[] {
  if (!analysis) return [];
  return analysis[key];
}

function ReportSummaryCards({ report }: { report: BreakdownReport }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-white/8 bg-white/6 p-4">
        <p className="text-xs text-white/55">عدد المشاهد</p>
        <p className="mt-2 text-2xl font-bold text-white">
          {report.sceneCount}
        </p>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/6 p-4">
        <p className="text-xs text-white/55">إجمالي الصفحات</p>
        <p className="mt-2 text-2xl font-bold text-white">
          {report.totalPages}
        </p>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/6 p-4">
        <p className="text-xs text-white/55">أيام التصوير المقدرة</p>
        <p className="mt-2 text-2xl font-bold text-white">
          {report.totalEstimatedShootDays}
        </p>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/6 p-4">
        <p className="text-xs text-white/55">آخر تحديث</p>
        <p className="mt-2 text-sm font-medium text-white">
          {new Date(report.updatedAt).toLocaleString("ar-EG")}
        </p>
      </div>
    </div>
  );
}

function ScheduleSection({ report }: { report: BreakdownReport }) {
  if (!report.schedule.length) return null;
  return (
    <div className="rounded-xl border border-white/8 bg-white/6 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <CalendarClock className="h-5 w-5 text-cyan-400" />
        الجدولة الأولية
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {report.schedule.map((day) => (
          <div
            key={`${day.dayNumber}-${day.location}-${day.timeOfDay}`}
            className="rounded-[22px] border border-white/8 bg-black/28 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
              <span className="rounded-full bg-white/6 px-2 py-1">
                اليوم {day.dayNumber}
              </span>
              <span className="rounded-full bg-white/6 px-2 py-1">
                {day.timeOfDay}
              </span>
              <span className="rounded-full bg-white/6 px-2 py-1">
                {day.estimatedHours} ساعة
              </span>
            </div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <MapPin className="h-4 w-4 text-emerald-400" />
              {day.location}
            </p>
            <div className="space-y-1 text-sm text-white/68">
              {day.scenes.map((scheduleScene) => (
                <div key={`${day.dayNumber}-${scheduleScene.sceneId}`}>
                  المشهد {scheduleScene.sceneNumber} - {scheduleScene.header}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionHistoryBar({
  scene,
  activeVersionId,
  onVersionSelect,
}: {
  scene: Scene;
  activeVersionId: string | null | undefined;
  onVersionSelect: (sceneId: number, versionId: string | null) => void;
}) {
  if (!scene.versions || scene.versions.length === 0) return null;
  return (
    <div className="flex items-center gap-3 overflow-x-auto rounded-[22px] border border-white/8 bg-[var(--background,#09090b)]/50 p-3">
      <div className="flex shrink-0 items-center gap-2 border-l border-white/8 px-2 text-sm text-white/55">
        <History className="h-4 w-4" />
        <span>سجل التغييرات:</span>
      </div>
      <button
        onClick={() => onVersionSelect(scene.id, null)}
        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${!activeVersionId ? "bg-blue-600 text-white shadow-md" : "bg-white/6 text-white/55 hover:bg-white/8"}`}
      >
        الحالية (الأحدث)
      </button>
      {scene.versions.map((version) => (
        <button
          key={version.id}
          onClick={() => onVersionSelect(scene.id, version.id)}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeVersionId === version.id ? "bg-blue-600 text-white shadow-md" : "bg-white/6 text-white/55 hover:bg-white/8"}`}
        >
          <Clock className="h-3 w-3" />
          {version.label}
        </button>
      ))}
    </div>
  );
}

function SceneExpandedContent({
  scene,
  isHistoryView,
  activeVersionId,
  displayAnalysis,
  isProcessing,
  breakdownAgents,
  onVersionSelect,
  onRestoreClick,
}: {
  scene: Scene;
  isHistoryView: boolean;
  activeVersionId: string | null | undefined;
  displayAnalysis: SceneBreakdown | undefined;
  isProcessing: boolean;
  breakdownAgents: ReturnType<typeof useSceneAnalysis>["breakdownAgents"];
  onVersionSelect: (sceneId: number, versionId: string | null) => void;
  onRestoreClick: (sceneId: number, versionId: string) => void;
}) {
  return (
    <div className="animate-fadeIn space-y-8 border-t border-white/8 bg-black/28 p-6">
      <VersionHistoryBar
        scene={scene}
        activeVersionId={activeVersionId}
        onVersionSelect={onVersionSelect}
      />

      <div className="group relative rounded-[22px] border border-white/8 bg-[var(--background,#09090b)] p-4">
        {isHistoryView && (
          <div className="absolute left-2 top-2 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] text-orange-400">
              <History className="h-3 w-3" />
              وضع الأرشيف
            </span>
            {activeVersionId && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onRestoreClick(scene.id, activeVersionId);
                }}
                className="flex items-center gap-1 rounded-full border border-blue-400/50 bg-blue-600 px-3 py-1 text-[10px] text-white shadow-lg transition-all hover:bg-blue-500"
              >
                <RotateCcw className="h-3 w-3" />
                استعادة هذه النسخة
              </button>
            )}
          </div>
        )}
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
          نص المشهد
        </h4>
        <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-white/68">
          {scene.content}
        </p>
      </div>

      {displayAnalysis?.warnings.length ? (
        <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="mb-2 font-semibold">تحذيرات المشهد</p>
          <ul className="space-y-1">
            {displayAnalysis.warnings.map((warning) => (
              <li key={`${scene.id}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <CastBreakdownView
        cast={displayAnalysis ? displayAnalysis.cast : []}
        isProcessing={isProcessing}
      />

      <div>
        <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45">
          تفارير التفريغ (Breakdown Reports)
          {isHistoryView && (
            <span className="text-xs font-normal text-white/45">
              (نسخة قديمة)
            </span>
          )}
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {breakdownAgents.map((agent) => (
            <AgentCard
              key={agent.key}
              agent={agent}
              items={resolveAgentItems(
                displayAnalysis,
                agent.key as TechnicalBreakdownKey
              )}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneRowHeader({
  scene,
  isExpanded,
  isProcessing,
  isStrategizing,
  displayScenarios,
  isHistoryView,
  onToggle,
  onAnalyze,
  onRunStrategy,
  onShowNavigator,
}: {
  scene: Scene;
  isExpanded: boolean;
  isProcessing: boolean;
  isStrategizing: boolean;
  displayScenarios: ScenarioAnalysis | undefined;
  isHistoryView: boolean;
  onToggle: () => void;
  onAnalyze: () => void;
  onRunStrategy: () => void;
  onShowNavigator: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onToggle();
      }}
      className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/8"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="rounded bg-black/14 px-2 py-1 font-mono text-xs text-white/55">
            SCENE {scene.id}
          </span>
          <h3 className="text-lg font-bold uppercase tracking-wide text-white/85">
            {scene.header}
          </h3>
        </div>
        {!isExpanded && (
          <p className="max-w-2xl truncate pr-14 text-sm text-white/45">
            {scene.content.substring(0, 100)}...
          </p>
        )}
        {scene.headerData && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
            <span>{scene.headerData.sceneType}</span>
            <span>{scene.headerData.location}</span>
            <span>{scene.headerData.timeOfDay}</span>
            <span>{scene.headerData.pageCount} صفحة</span>
            <span>اليوم {scene.headerData.storyDay}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {scene.isAnalyzed && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              if (displayScenarios) onShowNavigator();
              else if (!isHistoryView) onRunStrategy();
            }}
            disabled={isStrategizing || (isHistoryView && !displayScenarios)}
            className={`flex items-center gap-2 rounded-[22px] border px-3 py-2 text-sm font-medium transition-all ${isStrategizing ? "border-white/8 bg-white/6 text-white/55" : "border-indigo-500/50 bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30"} ${isHistoryView && !displayScenarios ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {isStrategizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            <span className="hidden md:inline">
              {displayScenarios ? "فتح مركز القيادة" : "محاكاة الإنتاج"}
            </span>
          </button>
        )}

        {scene.isAnalyzed ? (
          <>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAnalyze();
              }}
              disabled={isProcessing}
              className={`rounded-[22px] px-4 py-2 text-sm font-medium transition-all ${isProcessing ? "cursor-not-allowed bg-black/22 text-white/55" : "bg-black/22 text-white hover:bg-black/28"}`}
            >
              {isProcessing ? "جاري العمل..." : "إعادة التحليل"}
            </button>
            <span className="flex items-center gap-1 px-3 text-sm font-medium text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden md:inline">تم التحليل</span>
            </span>
          </>
        ) : (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAnalyze();
            }}
            disabled={isProcessing}
            className={`rounded-[22px] px-4 py-2 text-sm font-medium transition-all ${isProcessing ? "cursor-not-allowed bg-black/22 text-white/55" : "bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500"}`}
          >
            {isProcessing ? "جاري العمل..." : "تحليل المشهد"}
          </button>
        )}

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-white/55" />
        ) : (
          <ChevronDown className="h-5 w-5 text-white/55" />
        )}
      </div>
    </div>
  );
}

const ResultsView: React.FC<ResultsViewProps> = ({
  report,
  scenes,
  onUpdateScene,
  onRestoreVersion,
}) => {
  const toast = useToastQueue();
  const sceneAnalysis = useSceneAnalysis({
    scenes,
    onUpdateScene,
    onRestoreVersion,
    success: toast.success,
    error: toast.error,
  });

  return (
    <div className="space-y-6">
      {report && <ReportSummaryCards report={report} />}

      {report?.warnings.length ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
          <p className="mb-2 text-sm font-semibold">تحذيرات التقرير</p>
          <ul className="space-y-1 text-sm">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report && <ScheduleSection report={report} />}

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
          <BrainCircuit className="text-blue-500" />
          المشاهد المستخرجة
          <span className="rounded-full bg-black/22 px-3 py-1 text-sm font-normal text-white/68">
            {scenes.length}
          </span>
        </h2>
      </div>

      <div className="space-y-4">
        {scenes.map((scene) => {
          const isExpanded = sceneAnalysis.expandedSceneId === scene.id;
          const isProcessing = sceneAnalysis.analyzingIds.has(scene.id);
          const isStrategizing = sceneAnalysis.strategizingIds.has(scene.id);
          const activeData = sceneAnalysis.resolveActiveSceneData(scene);
          const activeVersionId = sceneAnalysis.previewVersion[scene.id];
          const displayAnalysis = activeData?.analysis;
          const displayScenarios = activeData?.scenarios;
          const isHistoryView = !!activeVersionId;

          return (
            <div
              key={scene.id}
              className={`overflow-hidden rounded-xl border ${isExpanded ? "border-blue-500/50 shadow-lg shadow-blue-900/10" : "border-white/8"} bg-white/6`}
            >
              <SceneRowHeader
                scene={scene}
                isExpanded={isExpanded}
                isProcessing={isProcessing}
                isStrategizing={isStrategizing}
                displayScenarios={displayScenarios}
                isHistoryView={isHistoryView}
                onToggle={() => sceneAnalysis.toggleScene(scene.id)}
                onAnalyze={() => void sceneAnalysis.handleAnalyzeScene(scene)}
                onRunStrategy={() =>
                  void sceneAnalysis.handleRunStrategy(scene)
                }
                onShowNavigator={() =>
                  sceneAnalysis.setShowNavigatorForScene(scene.id)
                }
              />

              {isExpanded && (
                <SceneExpandedContent
                  scene={scene}
                  isHistoryView={isHistoryView}
                  activeVersionId={activeVersionId}
                  displayAnalysis={displayAnalysis}
                  isProcessing={isProcessing}
                  breakdownAgents={sceneAnalysis.breakdownAgents}
                  onVersionSelect={sceneAnalysis.handleVersionSelect}
                  onRestoreClick={sceneAnalysis.handleRestoreClick}
                />
              )}
            </div>
          );
        })}
      </div>

      {sceneAnalysis.showNavigatorForScene &&
        sceneAnalysis.activeNavigatorData?.scenarios && (
          <ScenarioNavigator
            analysis={sceneAnalysis.activeNavigatorData.scenarios}
            onClose={() => sceneAnalysis.setShowNavigatorForScene(null)}
          />
        )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
};

export default ResultsView;

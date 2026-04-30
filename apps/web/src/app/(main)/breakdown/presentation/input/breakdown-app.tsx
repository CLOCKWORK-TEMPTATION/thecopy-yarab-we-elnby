"use client";

import {
  AlertCircle,
  Clapperboard,
  FileText,
  LayoutList,
  MessageSquare,
  Sparkles,
  UserCircle,
} from "lucide-react";

import { useBreakdownShortcuts } from "../../application/workspace/use-breakdown-shortcuts";
import { useScriptWorkspace } from "../../application/workspace/use-script-workspace";
import CastBreakdownView from "../cast/cast-breakdown-view";
import ChatBot from "../chat/chat-bot";
import ResultsView from "../results/results-view";
import { OnboardingTour } from "../shared/onboarding-tour";
import { ToastContainer } from "../shared/toast-container";

import type { BreakdownSection } from "../../application/workspace/use-script-workspace";

// ============================================================
// تعريف أقسام التنقل
// ============================================================

interface SectionTab {
  id: BreakdownSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTION_TABS: SectionTab[] = [
  { id: "input",   label: "الإدخال",  icon: FileText      },
  { id: "cast",    label: "الطاقم",   icon: UserCircle    },
  { id: "results", label: "التقرير",  icon: LayoutList    },
  { id: "chat",    label: "المساعد",  icon: MessageSquare },
];

// ============================================================
// شريط التنقل — دائم الظهور في كل الحالات
// ============================================================

function SectionNav({
  active,
  isProcessed,
  onSelect,
}: {
  active: BreakdownSection;
  isProcessed: boolean;
  onSelect: (s: BreakdownSection) => void;
}) {
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto"
      aria-label="أقسام التفكيك"
    >
      {SECTION_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        const isLocked = !isProcessed && id !== "input";
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={isActive}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30"
                : "text-white/55 hover:bg-white/8 hover:text-white",
              isLocked ? "opacity-45" : "",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            {isLocked && (
              <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/35">
                قريباً
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================
// واجهة الإدخال
// ============================================================

type PreviewAgent = ReturnType<typeof useScriptWorkspace>["previewAgents"][number];

function ScriptInputView({
  scriptText,
  isSegmenting,
  error,
  previewAgents,
  onScriptChange,
  onProcess,
}: {
  scriptText: string;
  isSegmenting: boolean;
  error: { message: string } | null;
  previewAgents: PreviewAgent[];
  onScriptChange: (text: string) => void;
  onProcess: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl animate-fadeIn space-y-8">
      <div className="mb-12 space-y-4 text-center">
        <h2 className="text-4xl font-bold leading-tight text-white">
          نظام تفريغ السيناريو السينمائي
          <br />
          <span className="text-blue-500">بالذكاء الاصطناعي</span>
        </h2>
        <p className="mx-auto max-w-xl text-lg text-white/55">
          قم بلصق السيناريو الخاص بك، وسيقوم النظام بتقسيمه وتفعيل &quot;مساعد
          الإنتاج الاستباقي&quot; لتوليد سيناريوهات العمل.
        </p>
      </div>
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error.message}</p>
        </div>
      )}
      <div className="rounded-[22px] border border-white/8 bg-white/6 p-1 shadow-2xl shadow-blue-900/10">
        <div className="group relative overflow-hidden rounded-[22px] bg-black/14">
          <textarea
            value={scriptText}
            onChange={(event) => onScriptChange(event.target.value)}
            placeholder="مشهد داخلي. المطبخ - ليل..."
            className="h-96 w-full resize-none bg-black/14 p-6 font-mono text-base leading-relaxed text-white/85 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            dir="auto"
          />
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-white/55 backdrop-blur">
            INT. SCRIPT EDITOR
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={onProcess}
          disabled={isSegmenting || !scriptText.trim()}
          className="group relative overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/30 transition-all hover:scale-105 hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
        >
          <div className="flex items-center gap-3">
            {isSegmenting ? (
              <>
                <Sparkles className="h-5 w-5 animate-spin" />
                جاري معالجة السيناريو...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                ابدأ التحليل والتفريغ
              </>
            )}
          </div>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-white/8 pt-10 md:grid-cols-4">
        {previewAgents.map((agent) => (
          <div
            key={agent.key}
            className="flex flex-col items-center gap-2 rounded-lg bg-white/[0.04] p-4 text-center"
          >
            <div
              className={`rounded-full ${agent.color} bg-opacity-20 p-2 text-white/85`}
            >
              {agent.icon}
            </div>
            <span className="text-xs text-white/55">{agent.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Placeholder موحد للأقسام قبل اكتمال المعالجة
// ============================================================

function SectionPlaceholder({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
        <Icon className="h-9 w-9 text-white/30" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white/60">{title}</h3>
        <p className="text-sm text-white/35">{hint}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-xs text-white/35">
        <Sparkles className="h-3.5 w-3.5" />
        أدخل السيناريو أولاً وابدأ التحليل
      </div>
    </div>
  );
}

// ============================================================
// المكوّن الرئيسي
// ============================================================

function BreakdownApp() {
  const {
    scriptText,
    setScriptText,
    scenes,
    report,
    isSegmenting,
    error,
    section,
    setSection,
    isProcessed,
    processScript,
    updateScene,
    restoreVersion,
    resetWorkspace,
    previewAgents,
    toast,
  } = useScriptWorkspace();

  // ---- اختصارات لوحة المفاتيح ----
  useBreakdownShortcuts({
    onSave: () => {
      if (isProcessed) toast.success("تم الحفظ");
    },
    onUndo: () => {
      if (!scenes.length) return;
      const first = scenes[0];
      const lastVer = first?.versions?.at(-1);
      if (first && lastVer) restoreVersion(first.id, lastVer.id);
    },
  });

  return (
    <div className="min-h-screen pb-20">
      {/* ===== الهيدر — شريط التنقل دائم ===== */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-black/18 shadow-sm backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          {/* الشعار */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 p-2">
              <Clapperboard className="h-6 w-6 text-white" />
            </div>
            <h1 className="hidden bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:block">
              BreakBreak AI
            </h1>
          </div>

          {/* شريط أقسام التنقل — يظهر دائمًا */}
          <SectionNav
            active={section}
            isProcessed={isProcessed}
            onSelect={setSection}
          />

          {/* زر بدء تحليل جديد */}
          {isProcessed && (
            <button
              onClick={resetWorkspace}
              className="shrink-0 text-sm font-medium text-white/55 transition-colors hover:text-white"
            >
              تحليل جديد
            </button>
          )}
        </div>
      </header>

      {/* ===== المحتوى الرئيسي ===== */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* قسم الإدخال */}
        {section === "input" && (
          <ScriptInputView
            scriptText={scriptText}
            isSegmenting={isSegmenting}
            error={error}
            previewAgents={previewAgents}
            onScriptChange={setScriptText}
            onProcess={processScript}
          />
        )}

        {/* قسم الطاقم */}
        {section === "cast" && (
          isProcessed && scenes.length > 0 ? (
            <CastBreakdownView
              cast={scenes.flatMap((s) => s.analysis?.cast ?? [])}
              isProcessing={false}
            />
          ) : (
            <SectionPlaceholder
              icon={UserCircle}
              title="طاقم التمثيل"
              hint="بعد تحليل السيناريو ستظهر هنا قائمة الشخصيات وتحليل الطاقم الكامل."
            />
          )
        )}

        {/* قسم التقرير */}
        {section === "results" && (
          isProcessed && report ? (
            <ResultsView
              report={report}
              scenes={scenes}
              onUpdateScene={updateScene}
              onRestoreVersion={restoreVersion}
            />
          ) : (
            <SectionPlaceholder
              icon={LayoutList}
              title="التقرير النهائي"
              hint="بعد تحليل السيناريو سيظهر هنا تقرير التفريغ الكامل لكل مشهد."
            />
          )
        )}

        {/* قسم المساعد */}
        {section === "chat" ? (
          <ChatBot />
        ) : (
          <div className="hidden">
            <ChatBot />
          </div>
        )}

        {section !== "chat" && isProcessed && <div />}

        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      </main>

      {/* جولة الإعداد الأولي — تظهر للمستخدم الجديد مرة واحدة فقط */}
      <OnboardingTour />
    </div>
  );
}

export default BreakdownApp;

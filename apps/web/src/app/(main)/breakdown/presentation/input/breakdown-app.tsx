import { AlertCircle, Clapperboard, FileText, Sparkles } from "lucide-react";

import { useScriptWorkspace } from "../../application/workspace/use-script-workspace";
import ChatBot from "../chat/chat-bot";
import ResultsView from "../results/results-view";
import ToastContainer from "../shared/toast-container";

function BreakdownApp() {
  const {
    scriptText,
    setScriptText,
    scenes,
    report,
    isSegmenting,
    error,
    view,
    processScript,
    updateScene,
    restoreVersion,
    resetWorkspace,
    previewAgents,
    toast,
  } = useScriptWorkspace();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-black/18 shadow-sm backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 p-2">
              <Clapperboard className="h-6 w-6 text-white" />
            </div>
            <h1 className="hidden bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:block">
              BreakBreak AI
            </h1>
          </div>

          {view === "results" && (
            <button
              onClick={resetWorkspace}
              className="text-sm font-medium text-white/55 transition-colors hover:text-white"
            >
              تحليل جديد
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {view === "input" ? (
          <div className="mx-auto max-w-3xl animate-fadeIn space-y-8">
            <div className="mb-12 space-y-4 text-center">
              <h2 className="text-4xl font-bold leading-tight text-white">
                نظام تفريغ السيناريو السينمائي
                <br />
                <span className="text-blue-500">بالذكاء الاصطناعي</span>
              </h2>
              <p className="mx-auto max-w-xl text-lg text-white/55">
                قم بلصق السيناريو الخاص بك، وسيقوم النظام بتقسيمه وتفعيل
                &quot;مساعد الإنتاج الاستباقي&quot; لتوليد سيناريوهات العمل.
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
                  onChange={(event) => setScriptText(event.target.value)}
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
                onClick={processScript}
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
        ) : (
          <ResultsView
            report={report}
            scenes={scenes}
            onUpdateScene={updateScene}
            onRestoreVersion={restoreVersion}
          />
        )}

        <ChatBot />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      </main>
    </div>
  );
}

export default BreakdownApp;

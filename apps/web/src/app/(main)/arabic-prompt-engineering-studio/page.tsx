"use client";

/**
 * الصفحة: arabic-prompt-engineering-studio
 * الهوية: استوديو هندسة توجيهات بطابع مختبري/منهجي داخل قشرة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import * as React from "react";
import {
  Sparkles,
  Wand2,
  BookOpen,
  ArrowUpDown,
  History,
  FlaskConical,
  PenTool,
} from "lucide-react";

import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import { usePromptStudio } from "./hooks/usePromptStudio";
import { PromptEditor } from "./components/PromptEditor";
import { PromptAnalysisResult } from "./components/PromptAnalysisResult";

export default function ArabicPromptEngineeringStudioPage() {
  const {
    prompt,
    setPrompt,
    analysis,
    isAnalyzing,
    activeTab,
    setActiveTab,
    suggestions,
    handleAnalyze,
    handleCopy,
  } = usePromptStudio();

  return (
    <TooltipProvider>
      <main
        dir="rtl"
        className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
        style={{
          ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
          ["--page-accent-2" as string]: "var(--accent-creative, #c2255c)",
          ["--page-border" as string]: "rgba(255,255,255,0.08)",
        }}
      >
        <NoiseBackground />
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <BackgroundBeams />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,91,219,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(194,37,92,0.16),transparent_34%)]" />

        <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
          <div className="space-y-6">
            <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
              <header className="px-6 py-8 text-white md:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                      <Wand2 className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                        PROMPT ENGINEERING LAB
                      </p>
                      <h1 className="mt-2 text-3xl font-bold mb-1 md:text-4xl">
                        استوديو هندسة التوجيهات العربي
                      </h1>
                      <p className="max-w-3xl text-white/66 leading-7">
                        طبقة بصرية موحدة بنبرة مختبرية/منهجية تساعد على التحرير
                        والتحليل والمقارنة وبناء القوالب داخل نفس لغة المنصة
                        الداكنة.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-purple-400/50 text-purple-200"
                    >
                      <Sparkles className="h-3 w-3 ml-1" />
                      مدعوم بالذكاء الاصطناعي
                    </Badge>
                  </div>
                </div>
              </header>
            </CardSpotlight>

            <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
              <div className="p-4 md:p-6">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="space-y-6"
                >
                  <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto bg-white/6 border border-white/8">
                    <TabsTrigger value="editor" className="gap-2">
                      <PenTool className="h-4 w-4" />
                      المحرر
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      القوالب
                    </TabsTrigger>
                    <TabsTrigger value="compare" className="gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      المقارنة
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                      <History className="h-4 w-4" />
                      السجل
                    </TabsTrigger>
                    <TabsTrigger value="lab" className="gap-2">
                      <FlaskConical className="h-4 w-4" />
                      المختبر
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <PromptEditor
                        prompt={prompt}
                        setPrompt={setPrompt}
                        isAnalyzing={isAnalyzing}
                        handleAnalyze={handleAnalyze}
                        handleCopy={handleCopy}
                        suggestions={suggestions}
                      />
                      <div className="space-y-4">
                        <PromptAnalysisResult analysis={analysis} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardSpotlight>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

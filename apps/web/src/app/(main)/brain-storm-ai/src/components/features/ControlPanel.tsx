"use client";

/**
 * الصفحة: brain-storm-ai / ControlPanel
 * الهوية: لوحة تحكم داخلية بطابع شبكي/تحليلي متسق مع القشرة الداكنة الجديدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الغلاف الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Cpu, Settings, Play, Rocket, RotateCcw } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FileUpload from "@/components/file-upload";
import type { Session, BrainstormPhase, PhaseDisplayInfo } from "../../types";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface ControlPanelProps {
  phases: PhaseDisplayInfo[];
  activePhase: BrainstormPhase;
  setActivePhase: (phase: BrainstormPhase) => void;
  currentSession: Session | null;
  brief: string;
  setBrief: (value: string) => void;
  isLoading: boolean;
  progressPercent: string;
  onStartSession: () => void;
  onStopSession: () => void;
  onAdvancePhase: () => void;
  onFileContent: (content: string) => void;
}

export default function ControlPanel({
  phases,
  activePhase,
  setActivePhase,
  currentSession,
  brief,
  setBrief,
  isLoading,
  progressPercent,
  onStartSession,
  onStopSession,
  onAdvancePhase,
  onFileContent,
}: ControlPanelProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 backdrop-blur-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <Cpu className="w-6 h-6 text-[var(--page-accent,#3b5bdb)]" />
          لوحة التحكم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">المراحل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {phases.map((phase) => (
              <TooltipProvider key={phase.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activePhase === phase.id ? "default" : "outline"}
                      className="p-4 h-auto"
                      onClick={() =>
                        setActivePhase(phase.id as BrainstormPhase)
                      }
                    >
                      <div className="flex items-center gap-3 w-full">
                        {phase.icon}
                        <div className="text-left flex-1">
                          <p className="font-bold text-sm">{phase.name}</p>
                          <p className="text-xs opacity-75">{phase.nameEn}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {phase.agentCount}
                        </Badge>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{phase.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {!currentSession ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white/82">
                ملخص الفكرة
              </label>
              <FileUpload onFileContent={onFileContent} className="mb-4" />
              <Textarea
                value={brief}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setBrief(e.target.value)
                }
                placeholder="اكتب فكرتك..."
                className="min-h-[120px] bg-black/20 border-white/10"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={onStartSession}
              disabled={isLoading || !brief.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Settings className="w-5 h-5 mr-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  بدء جلسة
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
              <h3 className="font-medium mb-2 text-white">الملخص</h3>
              <p className="text-sm leading-7 text-white/74">
                {currentSession.brief}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onAdvancePhase}
                disabled={activePhase >= 5}
                className="flex-1"
              >
                <Rocket className="w-5 h-5 mr-2" />
                التالي
              </Button>
              <Button onClick={onStopSession} variant="destructive">
                <RotateCcw className="w-5 h-5 mr-2" />
                إعادة
              </Button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/55">التقدم</span>
                <span className="text-sm font-medium text-white">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </CardSpotlight>
  );
}

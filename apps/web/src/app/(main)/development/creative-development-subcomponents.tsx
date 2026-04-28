"use client";

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Database,
  Lock,
  Settings,
  Shield,
  Unlock,
  Users,
} from "lucide-react";
import React, { useMemo } from "react";

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
import { Label } from "@/components/ui/label";

import {
  CREATIVE_TASK_LABELS,
  CreativeTaskType,
  type AdvancedAISettings,
  type DevelopmentTaskDefinition,
} from "./types";
import {
  getCatalogTaskIcon,
  getCreativeTaskIcon,
} from "./utils/task-icon-mapper";

import type { UnlockStatus } from "./hooks/useCreativeDevelopment";

export const SHELL_CARD = "border-white/8 bg-black/10 backdrop-blur-xl";

export const CATEGORY_LABELS: Record<
  DevelopmentTaskDefinition["category"],
  string
> = {
  core: "الأساسية",
  analysis: "التحليل",
  creative: "الإبداع",
  predictive: "التنبؤية",
  advanced: "المتقدمة",
};

interface LockedStateAlertProps {
  status: UnlockStatus;
}

export const LockedStateAlert = React.memo(function LockedStateAlert({
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

export const LoadedStateAlert = React.memo(function LoadedStateAlert() {
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

export const AdvancedAISettingsCard = React.memo(
  function AdvancedAISettingsCard({
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
            تفعيل/تعطيل الأنظمة المتقدمة (RAG، النقد الذاتي، الذكاء الدستوري،
            كشف الهلوسات)
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
  }
);

interface TaskButtonsProps {
  tasks: CreativeTaskType[];
  selectedTask: CreativeTaskType | null;
  onTaskSelect: (task: CreativeTaskType) => void;
}

export const TaskButtons = React.memo(function TaskButtons({
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

export const CatalogTaskButtons = React.memo(function CatalogTaskButtons({
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

export { CreativeTaskType };

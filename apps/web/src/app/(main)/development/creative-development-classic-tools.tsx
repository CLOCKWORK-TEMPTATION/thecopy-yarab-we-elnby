"use client";

import { Loader2, Wand2 } from "lucide-react";
import React from "react";

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

import {
  AdvancedAISettingsCard,
  SHELL_CARD,
  TaskButtons,
} from "./creative-development-subcomponents";
import {
  CREATIVE_TASK_LABELS,
  CreativeTaskType,
  type AdvancedAISettings,
} from "./types";

interface ClassicToolsCardProps {
  creativeTasks: CreativeTaskType[];
  selectedTask: CreativeTaskType | null;
  onTaskSelect: (task: CreativeTaskType) => void;
  completionEnhancements: CreativeTaskType[];
  selectedCompletionEnhancements: CreativeTaskType[];
  onToggleEnhancement: (enhancement: CreativeTaskType) => void;
  tasksRequiringScope: CreativeTaskType[];
  completionScope: string;
  onCompletionScopeChange: (value: string) => void;
  advancedSettings: AdvancedAISettings;
  onSettingChange: (key: keyof AdvancedAISettings, value: boolean) => void;
  isLoading: boolean;
  textInput: string;
  onSubmit: () => void | Promise<void>;
}

export function ClassicToolsCard({
  creativeTasks,
  selectedTask,
  onTaskSelect,
  completionEnhancements,
  selectedCompletionEnhancements,
  onToggleEnhancement,
  tasksRequiringScope,
  completionScope,
  onCompletionScopeChange,
  advancedSettings,
  onSettingChange,
  isLoading,
  textInput,
  onSubmit,
}: ClassicToolsCardProps) {
  return (
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
          onTaskSelect={onTaskSelect}
        />

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
                    onCheckedChange={() => onToggleEnhancement(enhancement)}
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
              onChange={(e) => onCompletionScopeChange(e.target.value)}
              placeholder="مثال: فصل واحد، 3 مشاهد، حتى نهاية المسرحية..."
              className="bg-black/20 border-white/10 mt-1"
            />
          </div>
        ) : null}

        {selectedTask ? (
          <AdvancedAISettingsCard
            settings={advancedSettings}
            onSettingChange={onSettingChange}
          />
        ) : null}

        {selectedTask ? (
          <div className="text-center pt-2">
            <Button
              onClick={() => {
                void onSubmit();
              }}
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
  );
}

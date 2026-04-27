import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TOOLS } from "./cine-studio-config";
import { StudioMetricCell, StudioPanel, StudioRailButton } from "./studio-ui";

import type { ToolDefinition } from "./cine-studio-config";
import type { VisualMood } from "../types";
import type { ReactNode } from "react";

interface CineToolWorkspaceProps {
  tool: ToolDefinition;
  visualMood: VisualMood;
  moodLabel: string;
  onMoodChange: (mood: string) => void;
  onOpenTool: (toolId: string) => void;
  onCloseTool: () => void;
  children: ReactNode;
}

export function CineToolWorkspace({
  tool,
  visualMood,
  moodLabel,
  onMoodChange,
  onOpenTool,
  onCloseTool,
  children,
}: CineToolWorkspaceProps) {
  return (
    <main className="overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(229,181,79,0.08),transparent_28%),linear-gradient(180deg,#030303_0%,#000_100%)] p-4">
      <div className="grid gap-4 xl:grid-cols-[104px_minmax(0,1fr)]">
        <StudioPanel
          title="Live Tools"
          subtitle="أدوات العمل السريع"
          className="h-fit"
          contentClassName="space-y-2 px-2 py-2"
        >
          {TOOLS.map((item) => (
            <StudioRailButton
              key={item.id}
              icon={item.icon}
              label={item.name}
              caption={item.nameEn}
              active={item.id === tool.id}
              onClick={() => onOpenTool(item.id)}
              className="min-h-[86px]"
            />
          ))}
        </StudioPanel>

        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <StudioPanel
              title={tool.name}
              subtitle={tool.description}
              headerRight={
                <Badge className="border-0 bg-[#1b150b] px-3 py-1 text-[#f6cf72]">
                  {tool.nameEn}
                </Badge>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[8px] border border-[#262626] bg-[#070707] p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br ${tool.color}`}
                    >
                      <tool.icon className="h-6 w-6 text-black" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#7f7b71]">
                        Active View
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {tool.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StudioMetricCell label="Mode" value={moodLabel} />
                  <StudioMetricCell
                    label="Status"
                    value="Ready"
                    tone="success"
                  />
                </div>
              </div>
            </StudioPanel>

            <StudioPanel
              title="Session Controls"
              subtitle="إعدادات الجلسة الحالية"
            >
              <div className="space-y-4">
                <div className="rounded-[8px] border border-[#262626] bg-[#070707] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[#7f7b71]">
                    Project Mood
                  </p>
                  <Select value={visualMood} onValueChange={onMoodChange}>
                    <SelectTrigger className="mt-3 h-11 border-[#343434] bg-[#0d0d0d] text-right text-[#f2e4bc]">
                      <SelectValue placeholder="اختر المود" />
                    </SelectTrigger>
                    <SelectContent className="border-[#343434] bg-[#090909] text-[#f2e4bc]">
                      <SelectItem value="noir">نوير</SelectItem>
                      <SelectItem value="realistic">واقعي</SelectItem>
                      <SelectItem value="surreal">غرائبي</SelectItem>
                      <SelectItem value="vintage">كلاسيكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onCloseTool}
                  className="h-11 w-full border-[#73572a] bg-[#120d06] text-[#f6cf72] hover:bg-[#23160a]"
                >
                  العودة إلى لوحة الاستوديو
                </Button>
              </div>
            </StudioPanel>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}

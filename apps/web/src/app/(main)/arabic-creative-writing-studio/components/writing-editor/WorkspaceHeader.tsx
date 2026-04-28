import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import type { ExportFormat } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";

interface WorkspaceHeaderProps {
  title: string;
  autoSaveEnabled: boolean;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  onSave: () => void;
  onTitleChange: (value: string) => void;
}

export function WorkspaceHeader({
  title,
  autoSaveEnabled,
  canAnalyze,
  isAnalyzing,
  onAnalyze,
  onExport,
  onSave,
  onTitleChange,
}: WorkspaceHeaderProps) {
  return (
    <CardSpotlight className="mb-6 rounded-[22px] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 items-center space-x-4 space-x-reverse">
          <Input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="text-xl font-bold"
            placeholder="عنوان المشروع..."
          />
          {autoSaveEnabled ? (
            <span className="text-sm text-green-600">💾 حفظ تلقائي مفعل</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing || !canAnalyze}
            variant="default"
          >
            {isAnalyzing ? "🔄 جاري التحليل..." : "🔍 تحليل النص"}
          </Button>

          <Button onClick={onSave} variant="default">
            💾 حفظ
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default">📤 تصدير</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void onExport("txt")}>
                📄 نص خالص
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("html")}>
                🌐 صفحة ويب
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("json")}>
                📋 بيانات منظمة
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("rtf")}>
                📝 نص غني
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardSpotlight>
  );
}

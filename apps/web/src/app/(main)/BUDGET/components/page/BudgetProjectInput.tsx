import { Download, FileSearch, Loader2, Sparkles } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BudgetProjectInputProps {
  title: string;
  scenario: string;
  analyzing: boolean;
  generating: boolean;
  exporting: boolean;
  restoringState: boolean;
  hasBudget: boolean;
  onTitleChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onAnalyze: () => void;
  onGenerate: () => void;
  onExport: () => void;
}

export function BudgetProjectInput({
  title,
  scenario,
  analyzing,
  generating,
  exporting,
  restoringState,
  hasBudget,
  onTitleChange,
  onScenarioChange,
  onAnalyze,
  onGenerate,
  onExport,
}: BudgetProjectInputProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-white">مدخلات المشروع</CardTitle>
          <CardDescription className="text-white/52">
            استخدم نفس السيناريو لتحليل المخاطر والتوصيات ثم إنشاء الميزانية
            الفعلية.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="budget-title">عنوان المشروع</Label>
            <Input
              id="budget-title"
              data-testid="budget-title-input"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="مثال: مطاردة في القاهرة"
              className="border-white/10 bg-black/20"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-scenario">السيناريو أو الوصف الإنتاجي</Label>
            <Textarea
              id="budget-scenario"
              data-testid="budget-scenario-input"
              value={scenario}
              onChange={(event) => onScenarioChange(event.target.value)}
              placeholder="اكتب السيناريو أو وصفًا إنتاجيًا مفصلًا يتضمن المواقع، الأيام، الشخصيات، ومتطلبات التصوير."
              rows={16}
              className="border-white/10 bg-black/20 font-mono"
              dir="rtl"
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              onClick={onAnalyze}
              data-testid="budget-analyze-button"
              disabled={analyzing || generating || restoringState}
              className="gap-2"
              variant="secondary"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSearch className="h-4 w-4" />
              )}
              تحليل السيناريو
            </Button>
            <Button
              onClick={onGenerate}
              data-testid="budget-generate-button"
              disabled={generating || analyzing || restoringState}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              إنشاء الميزانية
            </Button>
            <Button
              onClick={onExport}
              data-testid="budget-export-button"
              disabled={!hasBudget || exporting || restoringState}
              variant="outline"
              className="gap-2 border-white/10 bg-black/18"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              تصدير Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

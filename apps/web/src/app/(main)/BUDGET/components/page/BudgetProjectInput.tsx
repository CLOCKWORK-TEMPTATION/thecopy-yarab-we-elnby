import { Download, FileSearch, Loader2, Save, Sparkles } from "lucide-react";

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

const CURRENCIES = [
  { code: "EGP", label: "جنيه مصري" },
  { code: "USD", label: "دولار أمريكي" },
  { code: "SAR", label: "ريال سعودي" },
  { code: "AED", label: "درهم إماراتي" },
  { code: "EUR", label: "يورو" },
] as const;

interface BudgetProjectInputProps {
  title: string;
  scenario: string;
  currency: string;
  analyzing: boolean;
  generating: boolean;
  exporting: boolean;
  saving: boolean;
  restoringState: boolean;
  hasBudget: boolean;
  hasEdits: boolean;
  onTitleChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onAnalyze: () => void;
  onGenerate: () => void;
  onExport: () => void;
  onSave: () => void;
}

export function BudgetProjectInput({
  title,
  scenario,
  currency,
  analyzing,
  generating,
  exporting,
  saving,
  restoringState,
  hasBudget,
  hasEdits,
  onTitleChange,
  onScenarioChange,
  onCurrencyChange,
  onAnalyze,
  onGenerate,
  onExport,
  onSave,
}: BudgetProjectInputProps) {
  const busy = analyzing || generating || restoringState;

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
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="budget-title">عنوان المشروع</Label>
            <Input
              id="budget-title"
              data-testid="budget-title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="مثال: مطاردة في القاهرة"
              className="border-white/10 bg-black/20"
              dir="rtl"
            />
          </div>

          {/* Scenario */}
          <div className="space-y-2">
            <Label htmlFor="budget-scenario">
              السيناريو أو الوصف الإنتاجي
            </Label>
            <Textarea
              id="budget-scenario"
              data-testid="budget-scenario-input"
              value={scenario}
              onChange={(e) => onScenarioChange(e.target.value)}
              placeholder="اكتب السيناريو أو وصفًا إنتاجيًا مفصلًا يتضمن المواقع، الأيام، الشخصيات، ومتطلبات التصوير."
              rows={14}
              className="border-white/10 bg-black/20 font-mono"
              dir="rtl"
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="budget-currency">العملة</Label>
            <select
              id="budget-currency"
              data-testid="budget-currency-select"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              dir="rtl"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onAnalyze}
              data-testid="budget-analyze-button"
              disabled={busy}
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
              disabled={busy}
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
              onClick={onSave}
              data-testid="budget-save-button"
              disabled={!hasBudget || saving || restoringState}
              variant="outline"
              className="gap-2 border-white/10 bg-black/18"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {hasEdits ? "حفظ التعديلات" : "حفظ المشروع"}
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

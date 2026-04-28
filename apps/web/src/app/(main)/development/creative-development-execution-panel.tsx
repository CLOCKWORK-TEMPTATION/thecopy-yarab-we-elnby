"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Wand2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getCatalogTaskIcon } from "./utils/task-icon-mapper";

import type { DevelopmentTaskDefinition } from "./types";

interface ExecutionPanelProps {
  selectedCatalogTask: DevelopmentTaskDefinition;
  textInput: string;
  isLoading: boolean;
  error: string | null;
  activeResultText: string | null;
  hasCatalogResult: boolean;
  onSubmit: () => void | Promise<void>;
}

export function ExecutionPanel({
  selectedCatalogTask,
  textInput,
  isLoading,
  error,
  activeResultText,
  hasCatalogResult,
  onSubmit,
}: ExecutionPanelProps) {
  return (
    <Card
      className="border-[var(--page-accent)]/30 bg-black/30 backdrop-blur-xl"
      data-testid="execution-panel"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {getCatalogTaskIcon(selectedCatalogTask.id)}
          <span>
            تنفيذ:{" "}
            <span className="text-[var(--page-accent)]">
              {selectedCatalogTask.nameAr}
            </span>
          </span>
        </CardTitle>
        <CardDescription>{selectedCatalogTask.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!textInput.trim() ? (
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertTitle className="text-amber-300">
              النص مطلوب للتنفيذ
            </AlertTitle>
            <AlertDescription className="text-amber-200/80">
              أدخل النص الدرامي في الحقل أعلاه ثم اضغط تنفيذ
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-center">
          <Button
            onClick={() => {
              void onSubmit();
            }}
            disabled={isLoading || !textInput.trim()}
            size="lg"
            className="px-12 py-6 text-lg bg-[var(--page-accent)] hover:bg-[var(--page-accent)]/80 text-white"
            data-testid="execute-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري التنفيذ...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 ml-2" />
                تنفيذ: {selectedCatalogTask.nameAr}
              </>
            )}
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" data-testid="error-display">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>خطأ في التنفيذ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {hasCatalogResult && activeResultText ? (
          <div className="mt-4 space-y-3" data-testid="catalog-result-panel">
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertTitle className="text-green-300">
                ✅ مخرجات: {selectedCatalogTask.nameAr}
              </AlertTitle>
              <AlertDescription className="mt-3 text-white/90 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                {activeResultText}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([activeResultText], {
                    type: "text/plain;charset=utf-8",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${selectedCatalogTask.id}_result.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير النتيجة
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

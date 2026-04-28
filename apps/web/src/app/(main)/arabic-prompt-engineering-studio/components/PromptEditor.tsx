import {
  Sparkles,
  Copy,
  Trash2,
  Hash,
  FileText,
  Zap,
  RefreshCw,
  BarChart3,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface PromptEditorProps {
  prompt: string;
  setPrompt: (value: string) => void;
  isAnalyzing: boolean;
  handleAnalyze: () => void;
  handleCopy: (text: string) => void;
  suggestions: string[];
}

export function PromptEditor({
  prompt,
  setPrompt,
  isAnalyzing,
  handleAnalyze,
  handleCopy,
  suggestions,
}: PromptEditorProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <Card className="border-purple-500/20 bg-black/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              محرر التوجيهات
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(prompt)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPrompt("")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="اكتب توجيهك هنا... مثال: اكتب مقالاً تحليلياً عن تأثير الذكاء الاصطناعي على سوق العمل العربي"
            className="min-h-[300px] bg-black/20 border-purple-500/20 focus:border-purple-500/50 text-lg leading-relaxed"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            dir="auto"
          />
          <div className="flex items-center justify-between text-sm text-white/55">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                {prompt.split(/\s+/).filter(Boolean).length} كلمة
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {prompt.length} حرف
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-4 w-4" />~{Math.ceil(prompt.length / 4)}{" "}
                tokens
              </span>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!prompt.trim() || isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 ml-2" />
                  تحليل التوجيه
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-500">
              <Lightbulb className="h-5 w-5" />
              اقتراحات للتحسين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

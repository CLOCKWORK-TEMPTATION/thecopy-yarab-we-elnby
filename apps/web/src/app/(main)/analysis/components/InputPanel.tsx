"use client";

import { Loader2, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  text: string;
  onTextChange: (value: string) => void;
  onStart: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export function InputPanel({ text, onTextChange, onStart, onReset, isRunning }: Props) {
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="ألصق النص الدرامي هنا لبدء التحليل ..."
        className="min-h-48 w-full rounded-[22px] border-2 bg-white/[0.04] p-4 shadow-sm"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={isRunning}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Button
            onClick={onStart}
            disabled={isRunning || !text.trim()}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="ml-2 h-4 w-4" />
            )}
            {isRunning ? "جاري التحليل..." : "ابدأ التحليل"}
          </Button>
          {text && !isRunning && (
            <Button variant="outline" onClick={onReset} disabled={isRunning}>
              <X className="ml-2 h-4 w-4" />
              إعادة تعيين
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

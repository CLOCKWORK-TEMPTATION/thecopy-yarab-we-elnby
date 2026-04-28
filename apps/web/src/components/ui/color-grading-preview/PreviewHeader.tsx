import { Check, Copy, Eye, EyeOff, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PreviewHeaderProps {
  showOriginal: boolean;
  copied: boolean;
  onToggleOriginal: () => void;
  onCopy: () => void;
}

export function PreviewHeader({
  showOriginal,
  copied,
  onToggleOriginal,
  onCopy,
}: PreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Palette className="h-5 w-5 text-amber-500" />
          معاينة التدرج اللوني
        </h2>
        <p className="text-sm text-zinc-400">Color Grading Preview</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleOriginal}
          className="border-zinc-700"
        >
          {showOriginal ? (
            <Eye className="h-4 w-4 ml-2" />
          ) : (
            <EyeOff className="h-4 w-4 ml-2" />
          )}
          {showOriginal ? "معالج" : "أصلي"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          className="border-zinc-700"
        >
          {copied ? (
            <Check className="h-4 w-4 ml-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 ml-2" />
          )}
          نسخ
        </Button>
      </div>
    </div>
  );
}

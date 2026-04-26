"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  disabled: boolean;
  formats: string[];
  onExport: (format: "json" | "docx" | "pdf") => void;
}

export function ExportBar({ disabled, formats, onExport }: Props) {
  const allowed = new Set(formats);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {(["pdf", "docx", "json"] as const).map((f) =>
        allowed.has(f) ? (
          <Button
            key={f}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onExport(f)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {f === "pdf"
              ? "تصدير PDF"
              : f === "docx"
                ? "تصدير DOCX"
                : "تصدير JSON"}
          </Button>
        ) : null
      )}
    </div>
  );
}

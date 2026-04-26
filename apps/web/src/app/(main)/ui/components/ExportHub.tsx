import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ExportHubProps {
  formats?: string[];
  onExport?: (format: string) => void;
  scope?: string;
}

export function ExportHub({
  formats = ["PDF", "DOCX", "TXT"],
  onExport,
}: ExportHubProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Download className="h-5 w-5" />
        تصدير
      </h3>
      <div className="flex gap-2 flex-wrap">
        {formats.map((format) => (
          <Button
            key={format}
            variant="outline"
            size="sm"
            onClick={() => onExport?.(format)}
          >
            {format}
          </Button>
        ))}
      </div>
    </div>
  );
}

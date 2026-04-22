import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";

interface Version {
  id: string;
  name: string;
  date: string;
  isCurrent?: boolean;
}

interface VersionsPanelProps {
  versions?: Version[];
  onVersionSelect?: (id: string) => void;
  onRestore?: (id: string) => void;
}

export function VersionsPanel({
  versions = [],
  onVersionSelect,
}: VersionsPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <GitBranch className="h-5 w-5" />
        الإصدارات
      </h3>
      {versions.length === 0 ? (
        <Card className="p-6 text-center text-white/55">
          لا توجد إصدارات محفوظة
        </Card>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <Card
              key={version.id}
              className={`p-3 ${version.isCurrent ? "border-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{version.name}</p>
                  <p className="text-sm text-white/55">{version.date}</p>
                </div>
                <Button
                  size="sm"
                  variant={version.isCurrent ? "default" : "outline"}
                  onClick={() => onVersionSelect?.(version.id)}
                >
                  {version.isCurrent ? "الحالي" : "استعادة"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

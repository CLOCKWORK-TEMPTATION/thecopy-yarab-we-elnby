"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Download,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { useState, memo, useMemo, useCallback, type ReactElement } from "react";

import { toText } from "@/ai/gemini-core";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { cn } from "@/lib/utils";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

interface Station {
  id: number;
  name: string;
  description: string;
  Icon: LucideIcon;
}

type Status = "pending" | "running" | "completed" | "failed";
type StationResults = Partial<Record<number, unknown>>;
type UnknownRecord = Record<string, unknown>;

interface StationCardProps {
  station: Station;
  status: Status;
  results: StationResults;
  isActive: boolean;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

/**
 * Export station text to file
 */
function exportStationToFile(
  stationNum: number,
  content: string,
  stationName: string
) {
  const header = `===========================================
المحطة ${stationNum} - ${stationName}
===========================================

`;
  const fullContent = header + content;
  const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `station-${stationNum}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get full text output from station result
 */
function getStationFullText(id: number, data: unknown): string {
  if (!data) return "";

  // If data is already a string, return it
  if (typeof data === "string") {
    return data;
  }

  const record = toRecord(data);

  // Try to extract text from common structures
  let text = "";

  switch (id) {
    case 1: {
      text += "## الشخصيات الرئيسية:\n";
      if (Array.isArray(record.majorCharacters)) {
        text += record.majorCharacters
          .map((character: unknown) => `- ${toText(character)}`)
          .join("\n");
      } else {
        text += toText(record.majorCharacters);
      }
      const narrativeStyleAnalysis = toRecord(record.narrativeStyleAnalysis);
      text += "\n\n## التحليل السردي:\n";
      text += `النغمة العامة: ${toText(narrativeStyleAnalysis.overallTone)}\n`;
      text += `تحليل الوتيرة: ${toText(narrativeStyleAnalysis.pacingAnalysis)}\n`;
      text += `أسلوب اللغة: ${toText(narrativeStyleAnalysis.languageStyle)}\n`;
      break;
    }

    case 2: {
      text += "## بيان القصة:\n";
      text += toText(record.storyStatement) + "\n\n";
      text += "## النوع الهجين:\n";
      text += toText(
        isRecord(record.hybridGenre)
          ? record.hybridGenre.genre
          : record.hybridGenre
      );
      break;
    }

    case 3: {
      const networkSummary = toRecord(record.networkSummary);
      text += "## ملخص الشبكة:\n";
      text += `عدد الشخصيات: ${toText(networkSummary.charactersCount)}\n`;
      text += `عدد العلاقات: ${toText(networkSummary.relationshipsCount)}\n`;
      text += `عدد الصراعات: ${toText(networkSummary.conflictsCount)}\n`;
      if (record.conflictNetwork) {
        text += "\n## شبكة الصراع:\n" + toText(record.conflictNetwork);
      }
      break;
    }

    case 4: {
      const efficiencyMetrics = toRecord(record.efficiencyMetrics);
      const recommendations = toRecord(record.recommendations);
      text += "## مقاييس الكفاءة:\n";
      text += `الدرجة الإجمالية: ${toText(efficiencyMetrics.overallEfficiencyScore)}/100\n\n`;
      if (recommendations.priorityActions) {
        text += "## التوصيات ذات الأولوية:\n";
        if (Array.isArray(recommendations.priorityActions)) {
          text += recommendations.priorityActions
            .map((action: unknown) => `- ${toText(action)}`)
            .join("\n");
        } else {
          text += toText(recommendations.priorityActions);
        }
      }
      break;
    }

    case 5: {
      text += "## التحليل الديناميكي:\n";
      text += toText(record.dynamicAnalysisResults ?? data);
      break;
    }

    case 6: {
      const diagnosticsReport = toRecord(record.diagnosticsReport);
      text += "## تقرير التشخيص:\n";
      text += `درجة الصحة العامة: ${toText(diagnosticsReport.overallHealthScore)}/100\n\n`;
      if (diagnosticsReport.criticalIssues) {
        text += "## المشاكل الحرجة:\n";
        if (Array.isArray(diagnosticsReport.criticalIssues)) {
          text += diagnosticsReport.criticalIssues
            .map((issue: unknown) => {
              const issueRecord = toRecord(issue);
              return `- ${toText(issueRecord.description ?? issue)}`;
            })
            .join("\n");
        } else {
          text += toText(diagnosticsReport.criticalIssues);
        }
      }
      break;
    }

    case 7: {
      const finalReport = toRecord(record.finalReport);
      text += "## التقرير النهائي:\n";
      text += toText(
        finalReport.executiveSummary ?? record.executiveSummary ?? data
      );
      break;
    }

    default:
      // Try to convert entire object to text
      text = JSON.stringify(data, null, 2);
  }

  return text || toText(data);
}

const StationCard = memo(
  ({ station, status, results, isActive }: StationCardProps) => {
    const { id, name, description, Icon } = station;
    const result = results[id];
    const hasResults = status === "completed" && result != null;
    const [showModal, setShowModal] = useState(false);

    // Memoize status icons to prevent recreation on every render
    const statusIcons: Record<Status, ReactElement> = useMemo(
      () => ({
        pending: <MinusCircle className="text-white/55" />,
        running: <Loader2 className="animate-spin text-primary" />,
        completed: <CheckCircle2 className="text-green-500" />,
        failed: <AlertCircle className="text-destructive" />,
      }),
      []
    );

    // Memoize export handler
    const handleExport = useCallback(() => {
      const data = result;
      if (!data) return;
      const fullText = getStationFullText(id, data);
      exportStationToFile(id, fullText, name);
    }, [result, id, name]);

    // Memoize view handler
    const handleView = useCallback(() => {
      setShowModal(true);
    }, []);

    // Memoize full text calculation
    const fullText = useMemo(() => {
      const data = result;
      if (!data) return "";
      return getStationFullText(id, data);
    }, [result, id]);

    const renderSummary = useCallback(() => {
      if (!hasResults) return null;

      const summary = fullText.substring(0, 300);

      return (
        <div className="space-y-2">
          <p className="text-sm text-white/55 whitespace-pre-wrap">
            {summary}
            {fullText.length > 300 && "..."}
          </p>
        </div>
      );
    }, [fullText, hasResults]);

    const renderFullContent = useCallback(() => {
      if (!hasResults) return null;

      return (
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          <pre className="whitespace-pre-wrap text-sm font-sans" dir="rtl">
            {fullText}
          </pre>
        </ScrollArea>
      );
    }, [fullText, hasResults]);

    return (
      <>
        <CardSpotlight>
          <Card
            className={cn(
              "flex h-full flex-col transition-all duration-300",
              isActive ? "border-primary shadow-lg" : "border-dashed",
              status === "pending" && "bg-white/[0.03]"
            )}
          >
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[22px] bg-white/[0.04] text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="font-headline text-lg">{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <div>{statusIcons[status]}</div>
            </CardHeader>
            {(hasResults ?? isActive) && (
              <CardContent className="flex-1">
                {isActive && status === "running" && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {hasResults && renderSummary()}
              </CardContent>
            )}
            {hasResults && (
              <CardFooter className="flex gap-2 flex-wrap">
                <Badge variant="secondary">مكتمل</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleView}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  عرض
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  تصدير
                </Button>
              </CardFooter>
            )}
          </Card>
        </CardSpotlight>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">
                {name} - التقرير الكامل
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {renderFullContent()}
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

StationCard.displayName = "StationCard";

export default StationCard;

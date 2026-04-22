"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Download,
  Star,
  ArrowUp,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * SWOT Analysis Component for Breakdown
 * Strengths, Weaknesses, Opportunities, Threats visualization
 *
 * Features:
 * - Visual SWOT matrix
 * - Score indicators
 * - Interactive items
 * - Priority highlighting
 * - Export functionality
 */

interface SWOTItem {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  impact: number; // 1-10
  details?: string;
}

interface SWOTData {
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
  overallScore: {
    narrative: number;
    structure: number;
    characters: number;
    conflict: number;
    total: number;
    rating: string;
  };
  summary?: string;
}

interface SWOTAnalysisProps {
  data: SWOTData;
  title?: string;
  className?: string;
  onItemClick?: (
    item: SWOTItem,
    category: keyof Omit<SWOTData, "overallScore" | "summary">
  ) => void;
}

// Category configurations
const CATEGORIES = {
  strengths: {
    title: "نقاط القوة",
    titleEn: "Strengths",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    gradientFrom: "from-green-500/20",
    gradientTo: "to-emerald-500/5",
  },
  weaknesses: {
    title: "نقاط الضعف",
    titleEn: "Weaknesses",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    gradientFrom: "from-red-500/20",
    gradientTo: "to-rose-500/5",
  },
  opportunities: {
    title: "الفرص",
    titleEn: "Opportunities",
    icon: Lightbulb,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    gradientFrom: "from-blue-500/20",
    gradientTo: "to-cyan-500/5",
  },
  threats: {
    title: "التهديدات",
    titleEn: "Threats",
    icon: Shield,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    gradientFrom: "from-amber-500/20",
    gradientTo: "to-orange-500/5",
  },
};

// Get priority badge style
const getPriorityStyle = (priority: SWOTItem["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
  }
};

// Get score color
const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
};

// Get rating emoji
const getRatingEmoji = (rating: string) => {
  if (rating.includes("ممتاز")) return "🌟";
  if (rating.includes("جيد جداً")) return "⭐";
  if (rating.includes("جيد")) return "👍";
  if (rating.includes("مقبول")) return "📝";
  return "⚠️";
};

export function SWOTAnalysis({
  data,
  title = "تحليل SWOT",
  className,
  onItemClick,
}: SWOTAnalysisProps) {
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(
    null
  );

  // Calculate category scores
  const getCategoryScore = (items: SWOTItem[]) => {
    if (items.length === 0) return 0;
    const totalImpact = items.reduce((sum, item) => sum + item.impact, 0);
    return Math.round((totalImpact / (items.length * 10)) * 100);
  };

  // Render SWOT item
  const renderItem = (item: SWOTItem, category: keyof typeof CATEGORIES) => {
    const isExpanded = expandedItem === item.id;
    const config = CATEGORIES[category];

    return (
      <div
        key={item.id}
        className={cn(
          "p-3 rounded-lg border transition-all cursor-pointer",
          config.borderColor,
          isExpanded ? config.bgColor : "hover:bg-muted/50",
          item.priority === "high" &&
            "ring-1 ring-offset-1 ring-offset-background",
          item.priority === "high" &&
            config.borderColor.replace("border-", "ring-")
        )}
        onClick={() => {
          setExpandedItem(isExpanded ? null : item.id);
          onItemClick?.(item, category);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {item.priority === "high" && (
                <ArrowUp className="h-3 w-3 text-red-500" />
              )}
              <p className="text-sm font-medium">{item.text}</p>
            </div>
            {isExpanded && item.details && (
              <p className="text-xs text-muted-foreground mt-2 animate-in fade-in">
                {item.details}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", getPriorityStyle(item.priority))}
            >
              {item.priority === "high"
                ? "عالي"
                : item.priority === "medium"
                  ? "متوسط"
                  : "منخفض"}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              {item.impact}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render category card
  const renderCategory = (
    category: keyof typeof CATEGORIES,
    items: SWOTItem[]
  ) => {
    const config = CATEGORIES[category];
    const Icon = config.icon;
    const score = getCategoryScore(items);
    const isHovered = hoveredCategory === category;

    return (
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300",
          isHovered && "shadow-lg scale-[1.02]"
        )}
        onMouseEnter={() => setHoveredCategory(category)}
        onMouseLeave={() => setHoveredCategory(null)}
      >
        <div className={cn("h-1", config.bgColor)} />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
              <div>
                <span className={config.color}>{config.title}</span>
                <span className="text-xs text-muted-foreground block">
                  {config.titleEn}
                </span>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{items.length}</Badge>
              <div className="text-sm font-bold text-muted-foreground">
                {score}%
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد عناصر
            </p>
          ) : (
            items.map((item) => renderItem(item, category))
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn("swot-analysis space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-brand" />
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              تحليل نقاط القوة والضعف والفرص والتهديدات
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>

        {/* Overall Score */}
        <Card className="bg-gradient-to-br from-brand/5 to-purple-500/5 border-brand/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {/* Total Score */}
              <div className="col-span-2 md:col-span-2 flex flex-col items-center justify-center">
                <div className="relative">
                  <svg className="w-32 h-32" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${data.overallScore.total * 2.83} 283`}
                      transform="rotate(-90 50 50)"
                      className={getScoreColor(data.overallScore.total)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={cn(
                        "text-3xl font-bold",
                        getScoreColor(data.overallScore.total)
                      )}
                    >
                      {data.overallScore.total}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      من 100
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <Badge className="text-lg px-4 py-1">
                    {getRatingEmoji(data.overallScore.rating)}{" "}
                    {data.overallScore.rating}
                  </Badge>
                </div>
              </div>

              {/* Individual Scores */}
              <div className="col-span-2 md:col-span-4 grid grid-cols-2 gap-4">
                {[
                  {
                    label: "جودة السرد",
                    score: data.overallScore.narrative,
                    icon: FileText,
                  },
                  {
                    label: "السلامة الهيكلية",
                    score: data.overallScore.structure,
                    icon: Target,
                  },
                  {
                    label: "تطوير الشخصيات",
                    score: data.overallScore.characters,
                    icon: Star,
                  },
                  {
                    label: "فعالية الصراع",
                    score: data.overallScore.conflict,
                    icon: Zap,
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <span
                        className={cn("font-bold", getScoreColor(item.score))}
                      >
                        {item.score}
                      </span>
                    </div>
                    <Progress value={item.score} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {data.summary && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  الملخص التنفيذي
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.summary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SWOT Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Internal Factors */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              العوامل الداخلية
            </div>
            {renderCategory("strengths", data.strengths)}
            {renderCategory("weaknesses", data.weaknesses)}
          </div>

          {/* External Factors */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              العوامل الخارجية
            </div>
            {renderCategory("opportunities", data.opportunities)}
            {renderCategory("threats", data.threats)}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map(
            (key) => {
              const config = CATEGORIES[key];
              const items = data[key];
              const highPriority = items.filter(
                (i) => i.priority === "high"
              ).length;
              const Icon = config.icon;

              return (
                <Card key={key} className={cn("border", config.borderColor)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {config.title}
                        </p>
                        <p className="text-2xl font-bold">{items.length}</p>
                      </div>
                      <div className={cn("p-3 rounded-full", config.bgColor)}>
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>
                    </div>
                    {highPriority > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                        <ArrowUp className="h-3 w-3" />
                        {highPriority} أولوية عالية
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SWOTAnalysis;

/**
 * @fileoverview مكون عرض تفريغ طاقم التمثيل
 *
 * هذا المكون يعرض قائمة الشخصيات المستخرجة من المشهد
 * مع إمكانية البحث والتصفية والترتيب والتصدير.
 *
 * السبب: نوفر واجهة متكاملة لإدارة بيانات طاقم التمثيل
 * مع تحليلات متقدمة وتصدير للملفات.
 */

import React, { useState, useMemo } from "react";
import {
  CastMember,
  ExtendedCastMember,
  CastAnalysisResult,
} from "../../domain/models";
import {
  UserCircle,
  Star,
  User,
  HeartHandshake,
  Baby,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileText,
  Network,
  Eye,
  RefreshCw,
  Heart,
  Brain,
  Zap,
  HelpCircle,
  Users2,
  Shield,
} from "lucide-react";
import { logError } from "../../domain/errors";

// ============================================
// الأنواع
// ============================================

/**
 * خصائص المكون الرئيسي
 */
interface CastBreakdownViewProps {
  /** قائمة أعضاء طاقم التمثيل */
  cast?: CastMember[] | ExtendedCastMember[];
  /** حالة المعالجة */
  isProcessing?: boolean;
  /** محتوى المشهد للتحليل */
  sceneContent?: string;
  onAnalyze?: (content: string) => Promise<CastAnalysisResult>;
}

type SortField = "name" | "role" | "age" | "gender" | "dialogueCount";
type FilterRole =
  | "all"
  | "Lead"
  | "Supporting"
  | "Bit Part"
  | "Silent"
  | "Group"
  | "Mystery";
type FilterGender = "all" | "Male" | "Female" | "Non-binary" | "Unknown";

interface GenderAnalysis {
  gender: "Male" | "Female" | "Non-binary" | "Unknown";
  confidence: number;
  conflict: boolean;
  clues: string[];
}

interface ArcAnalysis {
  type: "rising" | "falling" | "flat" | "arc" | "unknown";
  description: string;
  confidence: number;
}

interface EmotionAnalysis {
  emotion: "positive" | "negative" | "intense" | "mysterious" | "neutral";
  intensity: number;
  keywords: string[];
}

interface CastCardData extends ExtendedCastMember {
  dialogueCount?: number;
  firstScene?: number;
  lastScene?: number;
  totalScenes?: number;
  sceneAppearances?: number[];
  genderAnalysis?: GenderAnalysis;
  arcAnalysis?: ArcAnalysis;
  emotionAnalysis?: EmotionAnalysis;
}

function exportCastToCSV(members: CastMember[] | ExtendedCastMember[]): string {
  const headers = [
    "Name",
    "Arabic Name",
    "Role",
    "Age",
    "Gender",
    "Description",
    "Motivation",
  ];
  const rows = members.map((member) => {
    const extended = member as ExtendedCastMember;
    return [
      member.name,
      extended.nameArabic || "",
      extended.roleCategory || member.role,
      extended.ageRange || member.age,
      member.gender,
      `"${(extended.visualDescription || member.description || "").replace(/"/g, '""')}"`,
      `"${(member.motivation || "").replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function exportCastToJSON(result: CastAnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

function generateCastingCall(
  members: CastMember[] | ExtendedCastMember[]
): string {
  let documentText = "CASTING CALL DOCUMENT\n";
  documentText += `${"=".repeat(50)}\n\n`;

  const leads = members.filter(
    (member) =>
      (member as ExtendedCastMember).roleCategory === "Lead" ||
      member.role === "Lead"
  );
  const supporting = members.filter(
    (member) =>
      (member as ExtendedCastMember).roleCategory === "Supporting" ||
      member.role === "Supporting"
  );

  if (leads.length > 0) {
    documentText += "LEAD ROLES\n";
    documentText += `${"-".repeat(30)}\n`;
    leads.forEach((member) => {
      const extended = member as ExtendedCastMember;
      documentText += `\n${member.name.toUpperCase()} (${member.gender}, ${extended.ageRange || member.age})\n`;
      documentText += `Description: ${extended.visualDescription || member.description || "N/A"}\n`;
      documentText += `In this scene: ${member.motivation || "N/A"}\n`;
    });
  }

  if (supporting.length > 0) {
    documentText += "\n\nSUPPORTING ROLES\n";
    documentText += `${"-".repeat(30)}\n`;
    supporting.forEach((member) => {
      const extended = member as ExtendedCastMember;
      documentText += `\n${member.name} (${member.gender}, ${extended.ageRange || member.age})\n`;
      documentText += `${extended.visualDescription || member.description || "N/A"}\n`;
    });
  }

  return documentText;
}

// ============================================
// SUB-COMPONENTS
// ============================================

const CastCard: React.FC<{
  member: CastCardData;
  showDetails: boolean;
  onToggleDetails: () => void;
}> = ({ member, showDetails, onToggleDetails }) => {
  const isLead = member.roleCategory === "Lead" || member.role === "Lead";
  const genderIcon =
    member.gender === "Male"
      ? "\u2642"
      : member.gender === "Female"
        ? "\u2640"
        : "\u2695";

  const arcIcon = useMemo(() => {
    switch (member.arcAnalysis?.type) {
      case "rising":
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case "falling":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case "arc":
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case "flat":
        return <Minus className="w-4 h-4 text-white/55" />;
      default:
        return <HelpCircle className="w-4 h-4 text-white/45" />;
    }
  }, [member.arcAnalysis]);

  const emotionIcon = useMemo(() => {
    switch (member.emotionAnalysis?.emotion) {
      case "positive":
        return <Heart className="w-4 h-4 text-pink-400" />;
      case "negative":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "intense":
        return <Zap className="w-4 h-4 text-orange-400" />;
      case "mysterious":
        return <Brain className="w-4 h-4 text-purple-400" />;
      default:
        return <Minus className="w-4 h-4 text-white/55" />;
    }
  }, [member.emotionAnalysis]);

  return (
    <div
      className={`
        group relative flex flex-col gap-3 p-5 rounded-[22px] border transition-all duration-300
        ${
          isLead
            ? "bg-gradient-to-br from-indigo-900/30 to-black/18 border-indigo-500/40 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-900/20"
            : "bg-white/6 bg-opacity-40 border-white/8 hover:border-white/8"
        }
      `}
    >
      {/* Header: Name & Badge */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className={`
            shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-inner relative
            ${isLead ? "bg-indigo-900/50 border-indigo-500" : "bg-white/8 border-white/8"}
          `}
          >
            <span className="text-lg">{genderIcon}</span>
            {isLead && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>
          <div>
            <h4 className="font-bold text-white text-lg leading-tight flex items-center gap-2">
              {member.name}
              {member.nameArabic && (
                <span className="text-sm text-white/55 font-normal">
                  ({member.nameArabic})
                </span>
              )}
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isLead
                  ? "text-indigo-300 border-indigo-500/30 bg-indigo-500/10"
                  : "text-white/55 border-white/8 bg-white/8/50"
              }`}
            >
              {member.roleCategory || member.role || "ROLE"}
            </span>
          </div>
        </div>
        <button
          onClick={onToggleDetails}
          className="p-1 hover:bg-white/8/50 rounded-[22px] transition-colors"
          aria-label="Toggle details"
        >
          {showDetails ? (
            <ChevronUp className="w-5 h-5 text-white/55" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/55" />
          )}
        </button>
      </div>

      {/* Demographics */}
      <div className="flex items-center gap-2 text-xs text-white/55 bg-black/28 p-2 rounded-[22px] border border-white/8">
        <div className="flex items-center gap-1">
          <Baby className="w-3 h-3" />
          <span>{member.ageRange || member.age || "N/A"}</span>
        </div>
        <span className="text-white/68">|</span>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{member.gender || "N/A"}</span>
        </div>
        {member.dialogueCount !== undefined && (
          <>
            <span className="text-white/68">|</span>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{member.dialogueCount} lines</span>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-white/68 leading-snug line-clamp-2 italic">
        &quot;
        {member.visualDescription ||
          member.description ||
          "No description available"}
        &quot;
      </p>

      {/* Analysis Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {member.genderAnalysis && (
          <div
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${
              member.genderAnalysis.conflict
                ? "bg-yellow-900/30 border-yellow-500/30 text-yellow-300"
                : "bg-emerald-900/30 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <Shield className="w-3 h-3" />
            {member.genderAnalysis.gender} (
            {Math.round(member.genderAnalysis.confidence * 100)}%)
            {member.genderAnalysis.conflict && "!"}
          </div>
        )}
        {member.arcAnalysis && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border bg-white/8/50 border-white/8 text-white/68">
            {arcIcon}
            {member.arcAnalysis.type}
          </div>
        )}
        {member.emotionAnalysis && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border bg-white/8/50 border-white/8 text-white/68">
            {emotionIcon}
            {member.emotionAnalysis.emotion}
          </div>
        )}
      </div>

      {/* Motivation / Goal */}
      {member.motivation && (
        <div className="mt-auto pt-3 border-t border-white/8/50">
          <div className="flex items-start gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] uppercase text-emerald-500 font-bold block mb-0.5">
                الدافع (Motivation)
              </span>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                {member.motivation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-white/8/50 space-y-3">
          {/* Personality Traits */}
          {member.personalityTraits && member.personalityTraits.length > 0 && (
            <div>
              <span className="text-[10px] uppercase text-purple-400 font-bold block mb-1">
                Personality Traits
              </span>
              <div className="flex flex-wrap gap-1">
                {member.personalityTraits.map((trait, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 bg-purple-900/30 border border-purple-500/30 text-purple-300 rounded-full"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {member.relationships && member.relationships.length > 0 && (
            <div>
              <span className="text-[10px] uppercase text-blue-400 font-bold block mb-1">
                Relationships
              </span>
              <div className="space-y-1">
                {member.relationships.map((rel, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Users2 className="w-3 h-3 text-blue-400" />
                    <span className="text-white/68">{rel.character}</span>
                    <span className="text-white/45">—</span>
                    <span className="text-blue-300">{rel.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scene Presence */}
          {member.scenePresence && (
            <div>
              <span className="text-[10px] uppercase text-cyan-400 font-bold block mb-1">
                Scene Presence
              </span>
              <div className="text-xs text-white/55 space-y-0.5">
                <div>
                  Scenes: {member.scenePresence.sceneNumbers.join(", ")}
                </div>
                <div>Dialogue: {member.scenePresence.dialogueLines} lines</div>
                {member.scenePresence.silentAppearances > 0 && (
                  <div>
                    Silent appearances: {member.scenePresence.silentAppearances}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emotion Analysis Details */}
          {member.emotionAnalysis &&
            member.emotionAnalysis.keywords.length > 0 && (
              <div>
                <span className="text-[10px] uppercase text-orange-400 font-bold block mb-1">
                  Emotional Keywords
                </span>
                <div className="flex flex-wrap gap-1">
                  {member.emotionAnalysis.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-orange-900/30 border border-orange-500/30 text-orange-300 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

const StatisticsPanel: React.FC<{
  cast: CastCardData[];
}> = ({ cast }) => {
  const stats = useMemo(() => {
    const total = cast.length;
    const leads = cast.filter((c) => c.roleCategory === "Lead").length;
    const supporting = cast.filter(
      (c) => c.roleCategory === "Supporting"
    ).length;
    const male = cast.filter((c) => c.gender === "Male").length;
    const female = cast.filter((c) => c.gender === "Female").length;
    const totalDialogue = cast.reduce(
      (sum, c) => sum + (c.dialogueCount || 0),
      0
    );

    const ageGroups: Record<string, number> = {};
    cast.forEach((c) => {
      const age = c.ageRange || "Unknown";
      ageGroups[age] = (ageGroups[age] || 0) + 1;
    });

    return { total, leads, supporting, male, female, totalDialogue, ageGroups };
  }, [cast]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-3 text-center">
        <div className="text-2xl font-bold text-indigo-400">{stats.total}</div>
        <div className="text-[10px] uppercase text-white/55">Total</div>
      </div>
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-3 text-center">
        <div className="text-2xl font-bold text-yellow-400">{stats.leads}</div>
        <div className="text-[10px] uppercase text-white/55">Leads</div>
      </div>
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-3 text-center">
        <div className="text-2xl font-bold text-blue-400">
          {stats.supporting}
        </div>
        <div className="text-[10px] uppercase text-white/55">Supporting</div>
      </div>
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-3 text-center">
        <div className="text-2xl font-bold text-cyan-400">{stats.male}</div>
        <div className="text-[10px] uppercase text-white/55">Male</div>
      </div>
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-3 text-center">
        <div className="text-2xl font-bold text-pink-400">{stats.female}</div>
        <div className="text-[10px] uppercase text-white/55">Female</div>
      </div>
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-3 text-center">
        <div className="text-2xl font-bold text-emerald-400">
          {stats.totalDialogue}
        </div>
        <div className="text-[10px] uppercase text-white/55">Lines</div>
      </div>
    </div>
  );
};

const NetworkVisualization: React.FC<{
  cast: CastCardData[];
}> = ({ cast }) => {
  const svgSize = 300;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const radius = Math.min(centerX, centerY) - 40;

  const nodes = useMemo(() => {
    return cast.map((member, i) => {
      const angle = (2 * Math.PI * i) / cast.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const isLead = member.roleCategory === "Lead";
      return {
        ...member,
        x,
        y,
        isLead,
        color: isLead
          ? "#fbbf24"
          : member.gender === "Male"
            ? "#22d3ee"
            : "#f472b6",
      };
    });
  }, [cast]);

  // Find relationships
  const edges = useMemo(() => {
    const connections: Array<{ from: number; to: number; type: string }> = [];
    nodes.forEach((node, i) => {
      node.relationships?.forEach((rel) => {
        const targetIndex = nodes.findIndex((n) => n.name === rel.character);
        if (targetIndex !== -1 && targetIndex > i) {
          connections.push({ from: i, to: targetIndex, type: rel.type });
        }
      });
    });
    return connections;
  }, [nodes]);

  return (
    <div className="bg-white/6/30 border border-white/8 rounded-[22px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold uppercase text-white/55">
          Character Network
        </span>
      </div>
      <svg width={svgSize} height={svgSize} className="mx-auto">
        {/* Connection lines */}
        {edges.map((edge, i) =>
          (() => {
            const fromNode = nodes[edge.from];
            const toNode = nodes[edge.to];
            if (!fromNode || !toNode) {
              return null;
            }

            return (
              <line
                key={i}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            );
          })()
        )}
        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isLead ? 20 : 14}
              fill={node.color}
              fillOpacity="0.3"
              stroke={node.color}
              strokeWidth="2"
              className="cursor-pointer hover:fill-opacity-50 transition-all"
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              className="text-[8px] fill-slate-300 pointer-events-none"
            >
              {node.name.slice(0, 6)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const CastBreakdownView: React.FC<CastBreakdownViewProps> = ({
  cast = [],
  isProcessing = false,
  sceneContent = "",
  onAnalyze,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [filterGender, setFilterGender] = useState<FilterGender>("all");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showNetwork, setShowNetwork] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<CastAnalysisResult | null>(null);

  // Convert cast to enhanced format with analysis
  const enhancedCast = useMemo(() => {
    return cast.map((member) => {
      const extended = member as ExtendedCastMember;
      return {
        ...member,
        dialogueCount: extended.scenePresence?.dialogueLines || 0,
        firstScene: extended.scenePresence?.sceneNumbers?.[0] || 1,
        lastScene:
          extended.scenePresence?.sceneNumbers?.[
            extended.scenePresence.sceneNumbers.length - 1
          ] || 1,
        totalScenes: 10, // Default, should be passed from props
        sceneAppearances: extended.scenePresence?.sceneNumbers || [],
      } as CastCardData;
    });
  }, [cast]);

  // Filter and sort
  const filteredCast = useMemo(() => {
    return enhancedCast.filter((member) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = member.name.toLowerCase().includes(query);
        const matchArabic = member.nameArabic?.toLowerCase().includes(query);
        const matchDesc = (member.visualDescription || member.description || "")
          .toLowerCase()
          .includes(query);
        if (!matchName && !matchArabic && !matchDesc) return false;
      }

      // Role filter
      if (
        filterRole !== "all" &&
        member.roleCategory !== filterRole &&
        member.role !== filterRole
      ) {
        return false;
      }

      // Gender filter
      if (filterGender !== "all" && member.gender !== filterGender) {
        return false;
      }

      return true;
    });
  }, [enhancedCast, searchQuery, filterRole, filterGender]);

  const sortedCast = useMemo(() => {
    return [...filteredCast].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "role":
          comparison = (a.roleCategory || a.role || "").localeCompare(
            b.roleCategory || b.role || ""
          );
          break;
        case "age":
          comparison = (a.ageRange || a.age || "").localeCompare(
            b.ageRange || b.age || ""
          );
          break;
        case "gender":
          comparison = a.gender.localeCompare(b.gender);
          break;
        case "dialogueCount":
          comparison = (a.dialogueCount || 0) - (b.dialogueCount || 0);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredCast, sortBy, sortOrder]);

  /**
   * يحلل طاقم التمثيل باستخدام AI
   *
   * السبب: نستخدم logError للتسجيل الموحد
   */
  const handleAnalyze = async () => {
    if (!sceneContent) return;

    setAnalyzing(true);
    try {
      if (!onAnalyze) {
        return;
      }

      const result = await onAnalyze(sceneContent);
      setAnalysisResult(result);
    } catch (error) {
      logError("CastBreakdownView.handleAnalyze", error);
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * يبدل حالة توسيع بطاقة معينة
   */
  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Export functions
  const handleExportCSV = () => {
    const csv = exportCastToCSV(sortedCast);
    downloadFile(csv, "cast-breakdown.csv", "text/csv");
  };

  const handleExportJSON = () => {
    const data = analysisResult || {
      members: sortedCast,
      summary: {},
      insights: [],
      warnings: [],
    };
    const json = exportCastToJSON(data as CastAnalysisResult);
    downloadFile(json, "cast-breakdown.json", "application/json");
  };

  const handleExportCastingCall = () => {
    const doc = generateCastingCall(sortedCast);
    downloadFile(doc, "casting-call.txt", "text/plain");
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isProcessing || analyzing) {
    return (
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-6 mb-6">
        <div className="flex items-center justify-center gap-4">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
          <span className="text-white/68">
            {analyzing
              ? "Analyzing cast with AI..."
              : "Processing cast breakdown..."}
          </span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!cast || cast.length === 0) {
    return (
      <div className="bg-white/6/50 border border-white/8 rounded-[22px] p-8 mb-6 text-center">
        <UserCircle className="w-12 h-12 text-white/55 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white/68 mb-2">No Cast Data</h3>
        <p className="text-sm text-white/45 mb-4">
          {sceneContent
            ? 'Click "Analyze" to extract cast information from the scene.'
            : "Load a scene to begin cast breakdown."}
        </p>
        {sceneContent && onAnalyze && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-black/28 text-white rounded-[22px] text-sm font-medium transition-colors"
            >
              Analyze
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-black/14 to-[var(--background,#09090b)] border border-white/8/50 rounded-[22px] overflow-hidden mb-8 shadow-2xl shadow-blue-900/10">
      {/* Header */}
      <div className="p-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-4 bg-black/14/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-[22px] text-white shadow-lg shadow-indigo-600/20">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">
              طاقم التمثيل (Casting Sheet)
            </h3>
            <p className="text-xs text-white/45 font-mono">
              INDEPENDENT CAST AGENT REPORT
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
            {sortedCast.length} شخصيات
          </span>
          {analysisResult && (
            <span className="text-xs bg-emerald-900/30 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
              AI Analyzed
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
            <input
              type="text"
              placeholder="Search cast..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white placeholder-white/45 focus:outline-none focus:border-indigo-500 w-48"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as FilterRole)}
            className="px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="Lead">Lead</option>
            <option value="Supporting">Supporting</option>
            <option value="Bit Part">Bit Part</option>
            <option value="Silent">Silent</option>
            <option value="Group">Group</option>
            <option value="Mystery">Mystery</option>
          </select>

          {/* Gender Filter */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as FilterGender)}
            className="px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Unknown">Unknown</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="name">Sort by Name</option>
            <option value="role">Sort by Role</option>
            <option value="age">Sort by Age</option>
            <option value="gender">Sort by Gender</option>
            <option value="dialogueCount">Sort by Lines</option>
          </select>

          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="p-2 bg-white/6 border border-white/8 rounded-[22px] hover:bg-white/8 transition-colors"
            aria-label="Toggle sort order"
          >
            {sortOrder === "asc" ? (
              <ChevronUp className="w-4 h-4 text-white/55" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/55" />
            )}
          </button>

          <div className="flex-1" />

          {/* Export Buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] hover:bg-white/8 transition-colors text-sm text-white/68"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-2 bg-white/6 border border-white/8 rounded-[22px] hover:bg-white/8 transition-colors text-sm text-white/68"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={handleExportCastingCall}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-700 border border-emerald-600 rounded-[22px] hover:bg-emerald-600 transition-colors text-sm text-white"
          >
            <FileText className="w-4 h-4" />
            Casting Call
          </button>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[22px] text-xs font-medium transition-colors ${
              showStats
                ? "bg-indigo-600 text-white"
                : "bg-white/6 text-white/55 hover:bg-white/8"
            }`}
          >
            <Filter className="w-3 h-3" />
            Statistics
          </button>
          <button
            onClick={() => setShowNetwork(!showNetwork)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[22px] text-xs font-medium transition-colors ${
              showNetwork
                ? "bg-indigo-600 text-white"
                : "bg-white/6 text-white/55 hover:bg-white/8"
            }`}
          >
            <Network className="w-3 h-3" />
            Network
          </button>
        </div>

        {/* Statistics Panel */}
        {showStats && <StatisticsPanel cast={sortedCast} />}

        {/* Network Visualization */}
        {showNetwork && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <NetworkVisualization cast={sortedCast} />
            {analysisResult && (
              <div className="lg:col-span-2 space-y-3">
                {/* Insights */}
                {analysisResult.insights.length > 0 && (
                  <div className="bg-white/6/30 border border-white/8 rounded-[22px] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase text-white/55">
                        Insights
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {analysisResult.insights.map((insight, i) => (
                        <li
                          key={i}
                          className="text-xs text-white/68 flex items-start gap-2"
                        >
                          <span className="text-emerald-400 mt-0.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Warnings */}
                {analysisResult.warnings.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-[22px] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs font-bold uppercase text-yellow-400">
                        Warnings
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {analysisResult.warnings.map((warning, i) => (
                        <li
                          key={i}
                          className="text-xs text-yellow-200 flex items-start gap-2"
                        >
                          <span className="text-yellow-400 mt-0.5">•</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cast Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedCast.map((member) => {
            const originalIndex = enhancedCast.indexOf(member);
            return (
              <CastCard
                key={originalIndex}
                member={member}
                showDetails={expandedCards.has(originalIndex)}
                onToggleDetails={() => toggleCard(originalIndex)}
              />
            );
          })}
        </div>

        {/* Empty state for filtered results */}
        {sortedCast.length === 0 &&
          filteredCast.length !== enhancedCast.length && (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 text-white/55 mx-auto mb-4" />
              <p className="text-white/55">
                No cast members match your filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterRole("all");
                  setFilterGender("all");
                }}
                className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default CastBreakdownView;

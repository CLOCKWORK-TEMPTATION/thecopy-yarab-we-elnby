/**
 * @fileoverview مكون بطاقة عضو طاقم التمثيل
 */

import {
  Star,
  User,
  HeartHandshake,
  Baby,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileText,
  Heart,
  Brain,
  Zap,
  HelpCircle,
  Users2,
  Shield,
} from "lucide-react";
import React from "react";

import type { CastCardData } from "../types";

interface CastCardProps {
  member: CastCardData;
  showDetails: boolean;
  onToggleDetails: () => void;
}

function getGenderIcon(member: CastCardData): string {
  if (member.gender === "Male") return "\u2642";
  if (member.gender === "Female") return "\u2640";
  return "\u2695";
}

function getCardClassName(isLead: boolean): string {
  return `
    group relative flex flex-col gap-3 p-5 rounded-[22px] border transition-all duration-300
    ${isLead ? "bg-gradient-to-br from-indigo-900/30 to-black/18 border-indigo-500/40 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-900/20" : "bg-white/6 bg-opacity-40 border-white/8 hover:border-white/8"}
  `;
}

function ArcIcon({
  type,
}: {
  type: NonNullable<CastCardData["arcAnalysis"]>["type"];
}) {
  switch (type) {
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
}

function EmotionIcon({
  emotion,
}: {
  emotion: NonNullable<CastCardData["emotionAnalysis"]>["emotion"];
}) {
  switch (emotion) {
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
}

function CastCardHeader({
  member,
  isLead,
  showDetails,
  onToggleDetails,
}: CastCardProps & { isLead: boolean }) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        <div
          className={`
            shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-inner relative
            ${isLead ? "bg-indigo-900/50 border-indigo-500" : "bg-white/8 border-white/8"}
          `}
        >
          <span className="text-lg">{getGenderIcon(member)}</span>
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
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isLead ? "text-indigo-300 border-indigo-500/30 bg-indigo-500/10" : "text-white/55 border-white/8 bg-white/8/50"}`}
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
  );
}

function Demographics({ member }: { member: CastCardData }) {
  return (
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
  );
}

function Description({ member }: { member: CastCardData }) {
  return (
    <p className="text-sm text-white/68 leading-snug line-clamp-2 italic">
      &quot;
      {member.visualDescription ||
        member.description ||
        "No description available"}
      &quot;
    </p>
  );
}

function AnalysisBadges({ member }: { member: CastCardData }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {member.genderAnalysis && (
        <div
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${member.genderAnalysis.conflict ? "bg-yellow-900/30 border-yellow-500/30 text-yellow-300" : "bg-emerald-900/30 border-emerald-500/30 text-emerald-300"}`}
        >
          <Shield className="w-3 h-3" />
          {member.genderAnalysis.gender} (
          {Math.round(member.genderAnalysis.confidence * 100)}%)
          {member.genderAnalysis.conflict && "!"}
        </div>
      )}
      {member.arcAnalysis && (
        <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border bg-white/8/50 border-white/8 text-white/68">
          <ArcIcon type={member.arcAnalysis.type} />
          {member.arcAnalysis.type}
        </div>
      )}
      {member.emotionAnalysis && (
        <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border bg-white/8/50 border-white/8 text-white/68">
          <EmotionIcon emotion={member.emotionAnalysis.emotion} />
          {member.emotionAnalysis.emotion}
        </div>
      )}
    </div>
  );
}

function MotivationSection({ member }: { member: CastCardData }) {
  if (!member.motivation) return null;

  return (
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
  );
}

function ExpandedDetails({ member }: { member: CastCardData }) {
  return (
    <div className="mt-3 pt-3 border-t border-white/8/50 space-y-3">
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

      {member.scenePresence && (
        <div>
          <span className="text-[10px] uppercase text-cyan-400 font-bold block mb-1">
            Scene Presence
          </span>
          <div className="text-xs text-white/55 space-y-0.5">
            <div>Scenes: {member.scenePresence.sceneNumbers.join(", ")}</div>
            <div>Dialogue: {member.scenePresence.dialogueLines} lines</div>
            {member.scenePresence.silentAppearances > 0 && (
              <div>
                Silent appearances: {member.scenePresence.silentAppearances}
              </div>
            )}
          </div>
        </div>
      )}

      {member.emotionAnalysis && member.emotionAnalysis.keywords.length > 0 && (
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
  );
}

const CastCard: React.FC<CastCardProps> = ({
  member,
  showDetails,
  onToggleDetails,
}) => {
  const isLead = member.roleCategory === "Lead" || member.role === "Lead";

  return (
    <div className={getCardClassName(isLead)}>
      <CastCardHeader
        member={member}
        showDetails={showDetails}
        onToggleDetails={onToggleDetails}
        isLead={isLead}
      />
      <Demographics member={member} />
      <Description member={member} />
      <AnalysisBadges member={member} />
      <MotivationSection member={member} />
      {showDetails && <ExpandedDetails member={member} />}
    </div>
  );
};

export default CastCard;

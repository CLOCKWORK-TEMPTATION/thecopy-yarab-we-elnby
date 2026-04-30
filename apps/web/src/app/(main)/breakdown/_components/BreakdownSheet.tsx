"use client";

import { useState } from "react";

interface BreakdownElement {
  id: string;
  type: string;
  category: string;
  description: string;
  notes?: string;
}

interface BreakdownSceneAnalysis {
  cast: {
    name: string;
    role: string;
    age?: string;
    description?: string;
  }[];
  props: string[];
  handProps: string[];
  costumes: string[];
  makeup: string[];
  vehicles: string[];
  stunts: string[];
  spfx: string[];
  vfx: string[];
  setDressing: string[];
  locations: string[];
  extras: string[];
  summary: string;
  warnings: string[];
  elements: BreakdownElement[];
}

interface BreakdownSheetProps {
  sceneHeader: string;
  analysis: BreakdownSceneAnalysis;
}

const TABS = [
  { id: "cast", label: "الكاست", icon: "👤" },
  { id: "locations", label: "المواقع", icon: "📍" },
  { id: "props", label: "الـ Props", icon: "🎭" },
  { id: "wardrobe", label: "الملابس", icon: "👗" },
  { id: "makeup", label: "المكياج", icon: "💄" },
  { id: "vehicles", label: "المركبات", icon: "🚗" },
  { id: "sfx", label: "المؤثرات", icon: "💥" },
  { id: "stunts", label: "المخاطر", icon: "⚡" },
  { id: "set_dressing", label: "الديكور", icon: "🛋️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function renderItems(items: string[]) {
  if (items.length === 0)
    return <p className="text-white/30 text-sm">لا يوجد</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
          <span className="text-white/20 mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function BreakdownSheet({ sceneHeader, analysis }: BreakdownSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>("cast");

  const tabContent: Record<TabId, React.ReactNode> = {
    cast:
      analysis.cast.length > 0 ? (
        <div className="space-y-3">
          {analysis.cast.map((member, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 border border-white/10 p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white text-sm">
                  {member.name}
                </span>
                <span className="text-xs text-white/40">{member.role}</span>
              </div>
              {member.description && (
                <p className="text-xs text-white/50">{member.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/30 text-sm">لا يوجد</p>
      ),
    locations: renderItems(analysis.locations),
    props: renderItems([...analysis.props, ...analysis.handProps]),
    wardrobe: renderItems(analysis.costumes),
    makeup: renderItems(analysis.makeup),
    vehicles: renderItems(analysis.vehicles),
    sfx: renderItems([...analysis.spfx, ...analysis.vfx]),
    stunts: renderItems(analysis.stunts),
    set_dressing: renderItems(analysis.setDressing),
  };

  return (
    <div dir="rtl" className="space-y-4" data-testid="breakdown-sheet">
      <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <p className="text-sm font-mono text-white/60">{sceneHeader}</p>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 space-y-1">
          {analysis.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`breakdown-tab-${tab.id}`}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/8"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white/3 border border-white/8 p-4">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}

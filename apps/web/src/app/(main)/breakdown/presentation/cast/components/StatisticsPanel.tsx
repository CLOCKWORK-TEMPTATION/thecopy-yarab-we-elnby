/**
 * @fileoverview لوحة إحصائيات طاقم التمثيل
 */

import React, { useMemo } from "react";

import type { CastCardData } from "../types";

interface StatisticsPanelProps {
  cast: CastCardData[];
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ cast }) => {
  const stats = useMemo(() => {
    const total = cast.length;
    const leads = cast.filter((c) => c.roleCategory === "Lead").length;
    const supporting = cast.filter(
      (c) => c.roleCategory === "Supporting"
    ).length;
    const male = cast.filter((c) => c.gender === "Male").length;
    const female = cast.filter((c) => c.gender === "Female").length;
    const totalDialogue = cast.reduce(
      (sum, c) => sum + (c.dialogueCount ?? 0),
      0
    );

    const ageGroups: Record<string, number> = {};
    cast.forEach((c) => {
      const age = c.ageRange || "Unknown";
      ageGroups[age] = (ageGroups[age] ?? 0) + 1;
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

export default StatisticsPanel;

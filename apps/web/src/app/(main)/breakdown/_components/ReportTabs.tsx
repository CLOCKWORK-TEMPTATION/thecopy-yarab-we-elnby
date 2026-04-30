"use client";

import { useState } from "react";

interface CastMember {
  name: string;
  role: string;
  age?: string;
  description?: string;
}

interface SceneRef {
  sceneNumber: number;
  location: string;
  type: string;
  timeOfDay: string;
}

interface CastEntry {
  name: string;
  role: string;
  age?: string;
  description?: string;
  scenes: SceneRef[];
  totalScenes: number;
}

interface LocationEntry {
  location: string;
  type: string;
  scenes: SceneRef[];
  totalScenes: number;
}

interface PropEntry {
  name: string;
  isHandProp: boolean;
  scenes: SceneRef[];
}

interface ShootingDay {
  day: number;
  date?: string;
  scenes: SceneRef[];
}

interface ReportScene {
  sceneId: string;
  header: string;
  headerData: {
    sceneNumber: number;
    type: string;
    location: string;
    timeOfDay: string;
    raw: string;
  };
  analysis?: {
    cast?: CastMember[];
    props?: string[];
    handProps?: string[];
    locations?: string[];
    warnings?: string[];
  };
}

interface ReportTabsProps {
  scenes: ReportScene[];
  schedule?: ShootingDay[];
}

type TabId = "cast" | "locations" | "props" | "schedule";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "cast", label: "قائمة الكاست", icon: "👤" },
  { id: "locations", label: "المواقع", icon: "📍" },
  { id: "props", label: "الـ Props", icon: "🎭" },
  { id: "schedule", label: "جدول التصوير", icon: "📅" },
];

function buildCastList(scenes: ReportScene[]): CastEntry[] {
  const map = new Map<string, CastEntry>();
  for (const scene of scenes) {
    const sceneRef: SceneRef = {
      sceneNumber: scene.headerData.sceneNumber,
      location: scene.headerData.location,
      type: scene.headerData.type,
      timeOfDay: scene.headerData.timeOfDay,
    };
    for (const member of scene.analysis?.cast ?? []) {
      const key = member.name.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.scenes.push(sceneRef);
        existing.totalScenes += 1;
      } else {
        const entry: CastEntry = {
          name: member.name,
          role: member.role,
          scenes: [sceneRef],
          totalScenes: 1,
        };
        if (member.age !== undefined) entry.age = member.age;
        if (member.description !== undefined)
          entry.description = member.description;
        map.set(key, entry);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalScenes - a.totalScenes);
}

function buildLocationList(scenes: ReportScene[]): LocationEntry[] {
  const map = new Map<string, LocationEntry>();
  for (const scene of scenes) {
    const sceneRef: SceneRef = {
      sceneNumber: scene.headerData.sceneNumber,
      location: scene.headerData.location,
      type: scene.headerData.type,
      timeOfDay: scene.headerData.timeOfDay,
    };
    const key = `${scene.headerData.type}:${scene.headerData.location}`;
    const existing = map.get(key);
    if (existing) {
      existing.scenes.push(sceneRef);
      existing.totalScenes += 1;
    } else {
      map.set(key, {
        location: scene.headerData.location,
        type: scene.headerData.type,
        scenes: [sceneRef],
        totalScenes: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalScenes - a.totalScenes);
}

function buildPropList(scenes: ReportScene[]): PropEntry[] {
  const map = new Map<string, PropEntry>();
  for (const scene of scenes) {
    const sceneRef: SceneRef = {
      sceneNumber: scene.headerData.sceneNumber,
      location: scene.headerData.location,
      type: scene.headerData.type,
      timeOfDay: scene.headerData.timeOfDay,
    };
    const allProps = [
      ...(scene.analysis?.props ?? []).map((p) => ({ name: p, hand: false })),
      ...(scene.analysis?.handProps ?? []).map((p) => ({
        name: p,
        hand: true,
      })),
    ];
    for (const { name, hand } of allProps) {
      const key = name.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.scenes.push(sceneRef);
      } else {
        map.set(key, { name, isHandProp: hand, scenes: [sceneRef] });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ar")
  );
}

export function ReportTabs({ scenes, schedule = [] }: ReportTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("cast");

  const castList = buildCastList(scenes);
  const locationList = buildLocationList(scenes);
  const propList = buildPropList(scenes);

  return (
    <div dir="rtl" className="space-y-4" data-testid="report-tabs">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`report-tab-${tab.id}`}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
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
        {activeTab === "cast" && (
          <div className="space-y-3" data-testid="cast-list">
            {castList.length === 0 ? (
              <p className="text-white/30 text-sm">لا يوجد كاست</p>
            ) : (
              castList.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/5 border border-white/10 p-3"
                  data-testid={`cast-entry-${i}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-medium text-white text-sm">
                        {entry.name}
                      </span>
                      {entry.age && (
                        <span className="text-xs text-white/40 mr-2">
                          ({entry.age})
                        </span>
                      )}
                      <div className="text-xs text-white/40 mt-0.5">
                        {entry.role}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs bg-white/10 rounded-full px-2 py-0.5 text-white/50">
                      {entry.totalScenes} مشهد
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.scenes.map((s, j) => (
                      <span
                        key={j}
                        className="text-[10px] font-mono bg-white/5 rounded px-1.5 py-0.5 text-white/30"
                      >
                        #{s.sceneNumber}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "locations" && (
          <div className="space-y-3" data-testid="locations-list">
            {locationList.length === 0 ? (
              <p className="text-white/30 text-sm">لا توجد مواقع</p>
            ) : (
              locationList.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/5 border border-white/10 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          entry.type === "INT"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {entry.type}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {entry.location}
                      </span>
                    </div>
                    <span className="text-xs bg-white/10 rounded-full px-2 py-0.5 text-white/50">
                      {entry.totalScenes} مشهد
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.scenes.map((s, j) => (
                      <span
                        key={j}
                        className="text-[10px] font-mono bg-white/5 rounded px-1.5 py-0.5 text-white/30"
                      >
                        #{s.sceneNumber}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "props" && (
          <div className="space-y-2" data-testid="props-list">
            {propList.length === 0 ? (
              <p className="text-white/30 text-sm">لا توجد props</p>
            ) : (
              propList.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {entry.isHandProp && (
                      <span className="text-[10px] bg-green-500/20 text-green-300 rounded-full px-1.5 py-0.5">
                        hand
                      </span>
                    )}
                    <span className="text-sm text-white/80">{entry.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {entry.scenes.map((s, j) => (
                      <span
                        key={j}
                        className="text-[10px] font-mono bg-white/5 rounded px-1.5 py-0.5 text-white/30"
                      >
                        #{s.sceneNumber}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-3" data-testid="schedule-list">
            {schedule.length === 0 ? (
              <p className="text-white/30 text-sm">
                لا يوجد جدول تصوير بعد. قم بتشغيل التحليل الكامل أولاً.
              </p>
            ) : (
              schedule.map((day, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/5 border border-white/10 p-3"
                >
                  <div className="text-sm font-medium text-white mb-2">
                    يوم التصوير #{day.day}
                    {day.date && (
                      <span className="text-white/40 font-normal mr-2 text-xs">
                        {day.date}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {day.scenes.map((s, j) => (
                      <div
                        key={j}
                        className="text-xs text-white/50 flex items-center gap-2"
                      >
                        <span className="font-mono text-white/30">
                          #{s.sceneNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            s.type === "INT"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {s.type}
                        </span>
                        <span>{s.location}</span>
                        <span className="text-white/30">{s.timeOfDay}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

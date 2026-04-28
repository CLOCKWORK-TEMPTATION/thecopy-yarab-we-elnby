"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useMemo } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { ProjectProvider, useProject } from "../contexts/ProjectContext";
import {
  evaluateSafety,
  FabricType,
  SceneHazard,
} from "../services/rulesEngine";
import { getSceneCostumes, assignSceneCostume } from "../services/styleistApi";
import { generateFullTechPack } from "../services/techPackService";
import { WardrobeItem } from "../types";

import ContinuityTimeline, { SceneCardData } from "./ContinuityTimeline";
import Dashboard from "./Dashboard";
import { ChevronLeftIcon, PlusIcon } from "./icons";
import LightingStudio from "./LightingStudio";
import { TechPackView } from "./TechPackView";
import WardrobeModal from "./WardrobeSheet";

interface FittingRoomProps {
  onBack: () => void;
  initialGarmentUrl?: string;
  initialGarmentName?: string;
  initialWeather?: string;
}

const EngineeringWorkspace: React.FC<FittingRoomProps> = ({
  onBack,
  initialGarmentUrl,
}) => {
  const { projectId, projectName, addNotification } = useProject();

  const [textureUrl, setTextureUrl] = useState<string | null>(
    initialGarmentUrl ?? null
  );
  const [selectedFabric, setSelectedFabric] = useState<FabricType>("cotton");
  const [hazards, setHazards] = useState<SceneHazard[]>([]);
  const [activeTab, setActiveTab] = useState<"3d" | "data">("3d");
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);

  const [projectYear, setProjectYear] = useState<number>(2024);
  const [showTechPackModal, setShowTechPackModal] = useState(false);
  const safetyReport = useMemo(
    () => evaluateSafety(selectedFabric, hazards),
    [hazards, selectedFabric]
  );
  const techPack = useMemo(
    () => generateFullTechPack(selectedFabric, "coat", projectYear, "black"),
    [projectYear, selectedFabric]
  );

  const [activeSceneId, setActiveSceneId] = useState("SC-4");
  const [scenes, setScenes] = useState<SceneCardData[]>([
    {
      id: "SC-1",
      sceneNumber: "SC-1",
      slugline: "INT. APARTMENT",
      time: "DAY",
      costumeId: "costume-a",
      isContinuous: false,
    },
    {
      id: "SC-2",
      sceneNumber: "SC-2",
      slugline: "EXT. STREET",
      time: "DAY",
      costumeId: "costume-a",
      isContinuous: true,
    },
    {
      id: "SC-3",
      sceneNumber: "SC-3",
      slugline: "INT. CAFE",
      time: "DAY",
      costumeId: "costume-a",
      isContinuous: true,
    },
    {
      id: "SC-4",
      sceneNumber: "SC-4",
      slugline: "EXT. ALLEY",
      time: "NIGHT",
      costumeId: null,
      isContinuous: true,
    },
    {
      id: "SC-5",
      sceneNumber: "SC-5",
      slugline: "INT. SAFEHOUSE",
      time: "NIGHT",
      costumeId: "costume-b",
      isContinuous: true,
    },
  ]);

  // تحميل ربط الأزياء بالمشاهد من الباكند
  useEffect(() => {
    if (!projectId) return;
    getSceneCostumes(projectId)
      .then((rows) => {
        if (rows.length === 0) return;
        setScenes((prev) =>
          prev.map((scene) => {
            const match = rows.find((r) => r.sceneId === scene.id);
            return match
              ? {
                  ...scene,
                  costumeId:
                    match.wardrobeItemId ??
                    match.costumeDesignId ??
                    scene.costumeId,
                  isContinuous: match.isContinuous,
                }
              : scene;
          })
        );
      })
      .catch(() => {
        /* empty */
      });
  }, [projectId]);

  useEffect(() => {
    if (safetyReport.status === "critical")
      addNotification(`تنبيه سلامة: ${safetyReport.issues[0]}`);
    if (techPack.historicalWarning) addNotification(techPack.historicalWarning);
  }, [safetyReport, techPack, addNotification]);

  const toggleHazard = (h: SceneHazard) =>
    setHazards((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );

  const handleGarmentSelect = (file: File, item: WardrobeItem) => {
    const url = URL.createObjectURL(file);
    setTextureUrl(url);
    setIsWardrobeOpen(false);
    setScenes((prev) =>
      prev.map((s) =>
        s.id === activeSceneId ? { ...s, costumeId: item.id } : s
      )
    );
    addNotification("Scene costume updated. Checking continuity...");
    // حفظ ربط الزي بالمشهد في الباكند
    assignSceneCostume({
      projectId,
      sceneId: activeSceneId,
      wardrobeItemId: item.id,
    }).catch(() => {
      /* empty */
    });
  };

  const handleFixContinuity = (
    targetSceneId: string,
    sourceOutfitId: string
  ) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === targetSceneId ? { ...s, costumeId: sourceOutfitId } : s
      )
    );
    addNotification(`Continuity fixed for ${targetSceneId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-black/8 text-white overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-white/8 flex items-center px-6 justify-between z-30 bg-black/14 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="text-white/55 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Exit
          </button>
          <div className="h-4 w-px bg-white/8"></div>
          <div>
            <h2 className="text-sm font-bold tracking-widest text-white">
              {projectName}
            </h2>
            <span className="text-[9px] text-[#d4b483] font-mono uppercase tracking-widest">
              Scene: {activeSceneId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <div className="flex items-center bg-black/14 rounded-[22px] border border-white/8 px-3 py-1 backdrop-blur-xl">
            <span className="text-[10px] font-bold text-white/55 mr-2 uppercase">
              Era:
            </span>
            <input
              type="number"
              value={projectYear}
              onChange={(e) => setProjectYear(parseInt(e.target.value))}
              className="bg-transparent w-12 text-xs font-bold text-white outline-none text-right font-mono"
            />
          </div>

          <div className="flex bg-black/14 rounded-[22px] p-1 border border-white/8 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab("3d")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-[18px] transition-all ${activeTab === "3d" ? "bg-white text-black" : "text-white/55 hover:text-white/85"}`}
            >
              Viewport
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-[18px] transition-all ${activeTab === "data" ? "bg-white text-black" : "text-white/55 hover:text-white/85"}`}
            >
              Analysis
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden relative">
        {/* Main Viewport */}
        <div className="flex-grow relative flex flex-col">
          {activeTab === "3d" ? (
            <div className="w-full h-full relative">
              <LightingStudio {...(textureUrl ? { textureUrl } : {})} />

              {/* Overlay Controls for Quick Material Change (Floating) */}
              <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                <CardSpotlight className="rounded-full backdrop-blur-xl">
                  <button
                    onClick={() => setIsWardrobeOpen(true)}
                    className="bg-black/14 backdrop-blur-xl border border-white/8 text-white p-3 rounded-full hover:bg-[#d4b483] hover:text-black transition-colors shadow-xl"
                    title="Change Outfit"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </CardSpotlight>
              </div>

              {/* Historical Warning Overlay */}
              {techPack?.historicalWarning && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-yellow-900/90 text-yellow-100 px-6 py-3 rounded-[22px] border border-yellow-600 shadow-2xl z-30 flex items-center gap-3 backdrop-blur-xl">
                  <span className="text-xl">⚠️</span>
                  <p className="text-xs font-bold uppercase tracking-wide">
                    {techPack.historicalWarning}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Dashboard />
          )}

          {/* Continuity Rail (Bottom) */}
          <div className="absolute bottom-0 left-0 w-full z-20">
            <ContinuityTimeline
              scenes={scenes}
              activeSceneId={activeSceneId}
              onSceneSelect={setActiveSceneId}
              onFixContinuity={handleFixContinuity}
            />
          </div>
        </div>

        {/* Right Floating Panel (Inspector) */}
        <CardSpotlight className="absolute top-6 right-6 bottom-40 w-72 rounded-[22px] overflow-hidden z-10">
          <div className="absolute top-6 right-6 bottom-40 w-72 bg-black/14 backdrop-blur-xl border border-white/8 rounded-[22px] flex flex-col z-10 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/8 bg-black/22">
              <h3 className="text-[10px] font-bold text-white/45 uppercase tracking-[0.2em]">
                Inspector
              </h3>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Fabric Selector */}
              <div>
                <label className="block text-[10px] font-bold text-[#d4b483] uppercase mb-2">
                  Material Physics
                </label>
                <select
                  value={selectedFabric}
                  onChange={(e) =>
                    setSelectedFabric(e.target.value as FabricType)
                  }
                  className="w-full bg-black/14 border border-white/8 text-xs text-white p-2 rounded-[22px] focus:border-[#d4b483] outline-none backdrop-blur-xl"
                >
                  <option value="cotton">Cotton</option>
                  <option value="polyester">Polyester</option>
                  <option value="silk">Silk</option>
                  <option value="wool">Wool</option>
                  <option value="leather">Leather</option>
                </select>
              </div>

              {/* Hazards */}
              <div>
                <label className="block text-[10px] font-bold text-[#d4b483] uppercase mb-2">
                  Scene Hazards
                </label>
                <div className="flex flex-wrap gap-2">
                  {["fire", "water", "stunt"].map((h) => (
                    <button
                      key={h}
                      onClick={() => toggleHazard(h as SceneHazard)}
                      className={`px-2 py-1 text-[9px] font-bold uppercase rounded-[18px] border transition-colors ${hazards.includes(h as SceneHazard) ? "bg-red-900/50 text-red-200 border-red-500" : "bg-transparent text-white/55 border-white/8 hover:border-white/12"}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Report */}
              <div className="p-4 bg-black/14 rounded-[22px] border border-white/8 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-white/55 uppercase">
                    Safety Score
                  </span>
                  <span
                    className={`text-lg font-mono font-bold ${safetyReport?.score > 80 ? "text-green-500" : "text-red-500"}`}
                  >
                    {safetyReport?.score}%
                  </span>
                </div>
                {safetyReport?.issues.map((issue: string, i: number) => (
                  <div
                    key={i}
                    className="text-[9px] text-red-300 border-l-2 border-red-500 pl-2 py-1 mb-1 leading-tight"
                  >
                    {issue}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/8 bg-black/22 mt-auto">
              <button
                onClick={() => setShowTechPackModal(true)}
                className="w-full bg-white text-black py-3 rounded-[22px] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#d4b483] transition-colors"
              >
                Generate Tech Pack
              </button>
            </div>
          </div>
        </CardSpotlight>
      </div>

      {/* Tech Pack Modal */}
      {showTechPackModal && techPack && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
          onClick={() => setShowTechPackModal(false)}
        >
          <CardSpotlight className="rounded-[22px] overflow-hidden">
            <div
              className="bg-white text-black p-0 w-full max-w-md shadow-2xl rounded-[22px] overflow-hidden border border-white/8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-black/14 text-white p-4 flex justify-between items-center border-b border-white/8">
                <h3 className="font-serif text-lg tracking-wider">
                  TECH PACK GENERATOR
                </h3>
                <button
                  onClick={() => setShowTechPackModal(false)}
                  className="text-white/55 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <TechPackView data={techPack} fabricName={selectedFabric} />
                <button className="w-full mt-4 border-2 border-black/14 text-black font-bold py-2 hover:bg-black/14 hover:text-white transition-colors text-xs uppercase tracking-widest rounded-[22px]">
                  Export PDF
                </button>
              </div>
            </div>
          </CardSpotlight>
        </div>
      )}

      <WardrobeModal
        isOpen={isWardrobeOpen}
        onClose={() => setIsWardrobeOpen(false)}
        onGarmentSelect={handleGarmentSelect}
        activeGarmentIds={[]}
        isLoading={false}
        projectId={projectId}
      />
    </div>
  );
};

const FittingRoom: React.FC<FittingRoomProps> = (props) => {
  return (
    <ProjectProvider>
      <EngineeringWorkspace {...props} />
    </ProjectProvider>
  );
};

export default FittingRoom;

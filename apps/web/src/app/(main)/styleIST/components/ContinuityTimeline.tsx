"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "framer-motion";
import React from "react";

export interface SceneCardData {
  id: string;
  sceneNumber: string;
  slugline: string;
  time: "DAY" | "NIGHT";
  costumeId: string | null;
  isContinuous: boolean;
}

interface ContinuityTimelineProps {
  scenes: SceneCardData[];
  activeSceneId: string;
  onSceneSelect: (id: string) => void;
  onFixContinuity: (targetSceneId: string, sourceOutfitId: string) => void;
}

const ContinuityTimeline: React.FC<ContinuityTimelineProps> = ({
  scenes,
  activeSceneId,
  onSceneSelect,
  onFixContinuity,
}) => {
  return (
    <div className="w-full bg-black/14 border-t border-white/8 flex flex-col">
      <div className="px-6 py-2 flex justify-between items-center bg-black/14">
        <h3 className="text-[10px] font-bold text-white/45 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 animate-pulse"></span>
          Timeline Sequence
        </h3>
        <div className="flex gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`w-px h-1 ${i % 5 === 0 ? "bg-white/55 h-2" : "bg-white/18"}`}
            ></div>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto p-4 gap-1 scrollbar-hide relative min-h-[100px] items-center">
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/18 -z-0"></div>

        {scenes.map((scene, index) => {
          const prevScene = scenes[index - 1];
          const hasRaccordError =
            scene.isContinuous &&
            prevScene &&
            prevScene.costumeId !== scene.costumeId;
          const isActive = scene.id === activeSceneId;

          return (
            <div
              key={scene.id}
              className="relative flex items-center group z-10"
            >
              {hasRaccordError && (
                <button
                  onClick={() =>
                    prevScene.costumeId &&
                    onFixContinuity(scene.id, prevScene.costumeId)
                  }
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600/20 border border-red-500/50 text-red-300 text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-xl"
                >
                  Fix Continuity
                </button>
              )}

              <motion.button
                onClick={() => onSceneSelect(scene.id)}
                whileHover={{ y: -2 }}
                className={`
                  relative w-28 h-16 rounded-[22px] overflow-hidden flex flex-col justify-between p-2 text-left transition-all border backdrop-blur-xl
                  ${isActive ? "bg-white/8 border-white/20 shadow-[0_0_15px_rgba(212,180,131,0.1)]" : "bg-black/18 border-white/8 hover:border-white/20"}
                  ${hasRaccordError ? "border-red-500/50 ring-1 ring-red-500/30" : ""}
                `}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] font-mono text-white/55 font-bold">
                    {scene.sceneNumber}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${scene.costumeId ? "bg-green-500" : "bg-white/18"}`}
                  ></div>
                </div>

                <div>
                  <span
                    className={`text-[8px] font-bold px-1 rounded ${scene.time === "DAY" ? "bg-blue-600/30 text-blue-200" : "bg-purple-600/30 text-purple-200"}`}
                  >
                    {scene.time}
                  </span>
                  <p className="text-[9px] text-white/55 truncate mt-1 font-mono uppercase opacity-85">
                    {scene.slugline.split(".")[1] ?? scene.slugline}
                  </p>
                </div>
              </motion.button>

              {/* Connector Line */}
              {index < scenes.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${scene.isContinuous ? "bg-white/55" : "bg-white/18 border-t border-dashed border-white/45 bg-transparent"}`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContinuityTimeline;

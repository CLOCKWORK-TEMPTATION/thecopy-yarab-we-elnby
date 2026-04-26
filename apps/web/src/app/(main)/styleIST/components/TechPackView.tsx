"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { TechPackSpec } from "../services/techPackService";

interface TechPackViewProps {
  data: TechPackSpec;
  fabricName: string;
}

export const TechPackView: React.FC<TechPackViewProps> = ({
  data,
  fabricName,
}) => {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] p-4 backdrop-blur-xl border border-white/8 shadow-lg">
      <div className="bg-white/[0.04] rounded-[22px] p-4 font-mono text-xs">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-white/20 pb-2 mb-4">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-tighter text-white">
              TECH PACK
            </h3>
            <span className="text-[10px] text-white/55">
              REF: {Math.floor(Math.random() * 10000)}
            </span>
          </div>
          <div className="text-right">
            <span className="block font-bold text-white uppercase">
              {fabricName}
            </span>
            <span className="block text-[10px] text-white/55">
              {data.threadCount}
            </span>
          </div>
        </div>

        {/* Color Swatch */}
        <div className="flex gap-4 mb-4">
          <div
            className="w-16 h-16 rounded border border-white/20 shadow-inner flex items-center justify-center text-[9px] text-white/50 bg-black/20"
            style={{
              backgroundColor:
                data.pantoneName === "Fiery Red"
                  ? "#ef4444"
                  : data.pantoneName === "Stretch Limo Black"
                    ? "#1a1a1a"
                    : data.hexPreview,
            }}
          >
            SWATCH
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <span className="block text-[9px] text-white/55 uppercase">
                  Pantone Ref
                </span>
                <span className="font-bold text-white">{data.pantoneCode}</span>
              </div>
              <div>
                <span className="block text-[9px] text-white/55 uppercase">
                  Color Name
                </span>
                <span className="font-bold text-white">{data.pantoneName}</span>
              </div>
              <div>
                <span className="block text-[9px] text-white/55 uppercase">
                  Est. Consumption
                </span>
                <span className="font-bold text-blue-400">
                  {data.fabricConsump}m / Unit
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-white/55 uppercase">
                  Lining
                </span>
                <span
                  className={`font-bold ${data.liningRequired ? "text-red-400" : "text-white"}`}
                >
                  {data.liningRequired ? "REQUIRED" : "NONE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/6 p-2 border border-white/8 text-[10px] text-white/55">
          <span className="font-bold mr-1">CARE:</span> {data.careLabel}
        </div>
      </div>
    </CardSpotlight>
  );
};

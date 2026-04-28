"use client";

import React from "react";

interface ScopePanelProps {
  title: string;
  variant: "wave" | "vector" | "histogram";
}

export const ScopePanel: React.FC<ScopePanelProps> = ({ title, variant }) => {
  return (
    <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-3">
      <p className="text-[10px] uppercase tracking-[0.26em] text-[#8f8a7d]">
        {title}
      </p>

      <div className="mt-3 h-32 overflow-hidden rounded-[8px] border border-[#1f1f1f] bg-[#030303] p-3">
        {variant === "wave" ? (
          <svg viewBox="0 0 200 100" className="h-full w-full">
            <polyline
              fill="none"
              stroke="#e5b54f"
              strokeWidth="1"
              points="0,78 10,42 20,63 30,25 40,70 50,44 60,65 70,30 80,74 90,38 100,68 110,35 120,76 130,46 140,58 150,28 160,70 170,48 180,64 190,34 200,76"
            />
          </svg>
        ) : variant === "vector" ? (
          <div className="flex h-full items-center justify-center">
            <div className="relative h-24 w-24 rounded-full border border-[#3d3d3d]">
              <div className="absolute inset-x-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#2a2a2a]" />
              <div className="absolute inset-y-1/2 left-0 h-px w-full -translate-y-1/2 bg-[#2a2a2a]" />
              <div className="absolute left-[58%] top-[32%] h-4 w-4 rounded-full bg-[#e5b54f]/40 blur-[4px]" />
            </div>
          </div>
        ) : variant === "histogram" ? (
          <svg viewBox="0 0 200 100" className="h-full w-full">
            <path
              d="M0,100 L0,90 L20,84 L40,80 L60,72 L80,68 L100,50 L120,44 L140,32 L160,12 L180,58 L200,100 Z"
              fill="#e5b54f"
              fillOpacity="0.85"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
};
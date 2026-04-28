"use client";

import React from "react";

interface BannerProps {
  children: React.ReactNode;
  tone: "warning" | "danger";
}

export const Banner: React.FC<BannerProps> = ({ children, tone }) => {
  return (
    <div
      className={
        tone === "warning"
          ? "rounded-[10px] border border-[#705523] bg-[#1d1509] px-4 py-3 text-sm text-[#f6cf72]"
          : "rounded-[10px] border border-[#6b2f2f] bg-[#211010] px-4 py-3 text-sm text-[#f3b4b4]"
      }
    >
      {children}
    </div>
  );
};
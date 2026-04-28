"use client";

import { Play } from "lucide-react";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

export function NoToolSelected() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
      <div className="art-no-tool-selected" style={{ height: "320px" }}>
        <Play size={64} aria-hidden="true" />
        <h2>اختر أداة للبدء</h2>
        <p>اختر أداة من القائمة الجانبية لتشغيلها</p>
      </div>
    </CardSpotlight>
  );
}

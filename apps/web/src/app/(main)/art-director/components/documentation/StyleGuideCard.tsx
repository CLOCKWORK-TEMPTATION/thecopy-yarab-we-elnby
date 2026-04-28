import { PenTool } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type { StyleGuideState } from "./types";

interface StyleGuideCardProps {
  guide: StyleGuideState;
}

export function StyleGuideCard({ guide }: StyleGuideCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <PenTool
            size={24}
            style={{ color: "var(--art-purple)" }}
            aria-hidden="true"
          />
          <div>
            <h3 style={{ margin: 0 }}>{guide.nameAr}</h3>
            <p
              style={{
                color: "var(--art-text-muted)",
                margin: 0,
                fontSize: "14px",
              }}
            >
              {guide.name}
            </p>
          </div>
        </div>
        <div>
          <h4 style={{ marginBottom: "12px" }}>العناصر:</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {guide.elements.map((element, index) => (
              <span key={index} className="art-element-tag">
                {element}
              </span>
            ))}
          </div>
        </div>
      </div>
    </CardSpotlight>
  );
}

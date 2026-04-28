"use client";

import { Play } from "lucide-react";

import { toolConfigs } from "../../core/toolConfigs";

import type { ToolItemProps, CSSPropertiesWithVars } from "./types";

export function ToolItem({ plugin, isActive, onClick }: ToolItemProps) {
  const config = toolConfigs[plugin.id];
  const Icon = config?.icon ?? Play;
  const color = config?.color ?? "#e94560";

  const buttonStyle: CSSPropertiesWithVars = {
    "--tool-color": color,
  };

  return (
    <button
      className={`art-tool-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      style={buttonStyle}
      aria-current={isActive ? "true" : undefined}
      type="button"
    >
      <Icon size={20} style={{ color }} aria-hidden="true" />
      <div className="art-tool-info">
        <span className="art-tool-name-ar">{plugin.nameAr}</span>
        <span className="art-tool-category">{plugin.category}</span>
      </div>
    </button>
  );
}

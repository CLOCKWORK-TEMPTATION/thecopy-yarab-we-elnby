"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { ToolItem } from "./ToolItem";
import type { ToolsSidebarProps } from "./types";

export function ToolsSidebar({
  plugins,
  selectedTool,
  onToolSelect,
}: ToolsSidebarProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <aside
        className="art-tools-sidebar"
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        <h3>الأدوات المتاحة ({plugins.length})</h3>
        <div
          className="art-tools-list"
          role="listbox"
          aria-label="قائمة الأدوات"
        >
          {plugins.map((plugin) => (
            <ToolItem
              key={plugin.id}
              plugin={plugin}
              isActive={selectedTool === plugin.id}
              onClick={() => onToolSelect(plugin.id)}
            />
          ))}
        </div>
      </aside>
    </CardSpotlight>
  );
}

"use client";

import { Aperture } from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";

interface ToggleRowProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full items-center justify-between rounded-[10px] border border-[#262626] bg-[#070707] px-4 py-3 transition-colors hover:border-[#73572a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070707]"
    >
      <div className="flex items-center gap-2">
        <Aperture className="h-4 w-4 text-[#e5b54f]" />
        <span className="text-sm text-[#ddd2b8]">{label}</span>
      </div>
      <Badge
        className={
          active
            ? "border-0 bg-[#112010] text-[#97d85c]"
            : "border-0 bg-[#201510] text-[#d0c6ad]"
        }
      >
        {active ? "ON" : "OFF"}
      </Badge>
    </button>
  );
};
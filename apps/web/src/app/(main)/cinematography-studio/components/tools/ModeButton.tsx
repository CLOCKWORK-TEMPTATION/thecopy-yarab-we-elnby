"use client";

import { ScanLine } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";

interface ModeButtonProps {
  label: string;
  icon: typeof ScanLine;
  active: boolean;
  onClick: () => void;
}

export const ModeButton: React.FC<ModeButtonProps> = ({
  label,
  icon: Icon,
  active,
  onClick,
}) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-10 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
          : "h-10 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
      }
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
};

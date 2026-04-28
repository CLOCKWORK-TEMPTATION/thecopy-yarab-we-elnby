"use client";

import { RefreshCcw } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";

interface ActionButtonProps {
  label: string;
  onClick: () => void | Promise<void>;
  icon?: typeof RefreshCcw;
  disabled?: boolean;
  variant?: "default" | "ghost";
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  icon: Icon,
  disabled,
  variant = "default",
}) => {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className={
        variant === "ghost"
          ? "h-10 border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
          : "h-10 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
      }
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );
};
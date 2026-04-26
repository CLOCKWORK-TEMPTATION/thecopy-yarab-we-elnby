import { motion } from "framer-motion";
import React from "react";

interface UniverseNodeProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function UniverseNode({
  label,
  icon,
  x,
  y,
  isActive,
  onClick,
}: UniverseNodeProps) {
  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className={`
          relative flex flex-col items-center gap-3
          ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}
          transition-opacity duration-300
        `}
      >
        <div
          className={`
            w-24 h-24 rounded-full flex items-center justify-center
            backdrop-blur-md border-2 transition-all duration-300
            ${
              isActive
                ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)]"
                : "bg-[var(--color-surface)]/50 border-[var(--color-surface)] group-hover:border-[var(--color-accent-weak)]"
            }
          `}
          style={{
            boxShadow: isActive
              ? "0 0 40px rgba(138, 155, 255, 0.3)"
              : "0 8px 24px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div className="text-[var(--color-text)] scale-150">{icon}</div>
        </div>
        <div className="text-[var(--color-text)] text-center px-4 py-2 rounded-lg bg-[var(--color-panel)]/80 backdrop-blur-sm border border-[var(--color-surface)]">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

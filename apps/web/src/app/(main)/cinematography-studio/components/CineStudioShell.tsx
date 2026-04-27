import { Toaster } from "react-hot-toast";

import { APP_NAV } from "./cine-studio-config";
import {
  StudioFooterBar,
  StudioRailButton,
  StudioStatusBar,
} from "./studio-ui";

import type { ReactNode } from "react";

interface CineStudioShellProps {
  moodLabel: string;
  footerText: string;
  diagnosticOverlay: ReactNode;
  children: ReactNode;
}

export function CineStudioShell({
  moodLabel,
  footerText,
  diagnosticOverlay,
  children,
}: CineStudioShellProps) {
  return (
    <div className="min-h-screen bg-black text-[#e5b54f]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(12,12,12,0.95)",
            color: "#f3e6c0",
            border: "1px solid rgba(229,181,79,0.2)",
          },
        }}
      />

      <StudioStatusBar />

      {diagnosticOverlay}

      <div className="grid min-h-[calc(100vh-84px)] grid-cols-[84px_minmax(0,1fr)]">
        <aside className="border-r border-[#343434] bg-[#050505] px-2 py-3">
          <div className="flex h-full flex-col gap-2">
            {APP_NAV.map((item) => (
              <StudioRailButton
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={item.active}
                className="min-h-[74px]"
              />
            ))}

            <div className="mt-auto rounded-[8px] border border-[#262626] bg-[#0c0c0c] px-2 py-3 text-center">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#7f7b71]">
                Mood
              </p>
              <p className="mt-2 text-sm text-white">{moodLabel}</p>
            </div>
          </div>
        </aside>

        {children}
      </div>

      <StudioFooterBar
        centerText={
          <span className="text-[10px] uppercase tracking-[0.28em]">
            {footerText}
          </span>
        }
      />
    </div>
  );
}

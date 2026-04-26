"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { HeroAnimation } from "@/components/HeroAnimation";

const AppGrid = dynamic(
  () =>
    import("@/components/AppGrid").then((mod) => ({ default: mod.AppGrid })),
  {
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    ),
  }
);

export default function Page() {
  const [showApps, setShowApps] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-hidden">
      {!showApps ? (
        <HeroAnimation onContinue={() => setShowApps(true)} />
      ) : (
        <AppGrid />
      )}
    </main>
  );
}

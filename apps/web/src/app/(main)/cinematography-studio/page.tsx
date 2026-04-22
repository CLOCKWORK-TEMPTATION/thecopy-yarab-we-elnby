"use client";

import dynamic from "next/dynamic";
import { Aperture } from "lucide-react";

const CineAIStudio = dynamic(
  () =>
    import("./components/CineAIStudio").then((mod) => ({
      default: mod.CineAIStudio,
    })),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 py-12 text-[#e5b54f]">
        <div className="w-full max-w-xl rounded-[14px] border border-[#343434] bg-[#070707] p-8 text-center shadow-[0_0_60px_rgba(229,181,79,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#73572a] bg-[#140f08]">
            <Aperture className="h-7 w-7 animate-spin text-[#f6cf72]" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-white">
            Vision CineAI
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#c6b999]">
            جاري تحميل محطة مدير التصوير بالواجهة التنفيذية الجديدة.
          </p>
        </div>
      </main>
    ),
  }
);

export default function CinematographyStudioPage() {
  return <CineAIStudio />;
}

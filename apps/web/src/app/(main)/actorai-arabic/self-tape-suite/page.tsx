"use client";

import dynamic from "next/dynamic";

const SelfTapeSuite = dynamic(
  () =>
    import("./components/SelfTapeSuite").then((mod) => ({
      default: mod.SelfTapeSuite,
    })),
  {
    loading: () => (
      <main
        className="min-h-screen bg-gradient-to-bl from-black/14 via-purple-900 to-black/14 flex items-center justify-center"
        role="main"
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">جاري تحميل Self-Tape Suite...</p>
        </div>
      </main>
    ),
    ssr: false,
  }
);

export default function SelfTapeSuitePage() {
  return <SelfTapeSuite />;
}

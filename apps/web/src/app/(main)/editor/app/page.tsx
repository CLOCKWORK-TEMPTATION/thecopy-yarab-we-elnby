"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const EditorApp = dynamic(
  () => import("../src/App").then((module) => ({ default: module.App })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[oklch(0.145_0_0)] text-[oklch(0.985_0_0)]">
        <span className="text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
          جارٍ تحميل المحرر...
        </span>
      </div>
    ),
  }
);

let initialized = false;

function initClientSideProviders() {
  if (initialized) return;
  initialized = true;

  void import("../src/providers").then(({ createThemeProvider }) => {
    createThemeProvider({
      attribute: "class",
      defaultTheme: "dark",
      enableSystem: false,
      storageKey: "filmlane.theme",
    });
  });

  void import("../src/components/ui/toaster").then(({ createToaster }) => {
    const toaster = createToaster();
    document.body.appendChild(toaster.element);
  });
}

export default function HomePage() {
  useEffect(() => {
    initClientSideProviders();
  }, []);

  return <EditorApp />;
}

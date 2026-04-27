"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_EVENT = "directors-studio-theme-change";

function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function subscribeThemeChange(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_STORAGE_EVENT, onStoreChange);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeThemeChange,
    getStoredTheme,
    () => "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </Button>
  );
}

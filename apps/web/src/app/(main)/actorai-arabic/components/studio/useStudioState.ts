"use client";

import { useState, useCallback } from "react";

import type { ViewType, User } from "../../types";

export const useStudioState = () => {
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
    },
    []
  );

  const navigate = useCallback((view: ViewType) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, [theme]);

  return {
    currentView,
    user,
    theme,
    notification,
    setUser,
    showNotification,
    navigate,
    toggleTheme,
  };
};

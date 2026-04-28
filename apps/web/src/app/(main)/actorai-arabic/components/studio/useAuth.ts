"use client";

import { useCallback } from "react";

import type { User, ViewType } from "../../types";

export const useAuth = (
  setUser: (user: User | null) => void,
  showNotification: (
    type: "success" | "error" | "info",
    message: string
  ) => void,
  navigate: (view: ViewType) => void
) => {
  const handleLogin = useCallback(
    (email: string, password: string) => {
      if (email && password) {
        setUser({ id: "1", name: "أحمد محمد", email });
        showNotification("success", "تم تسجيل الدخول بنجاح!");
        navigate("dashboard");
      } else {
        showNotification("error", "يرجى إدخال البيانات الصحيحة");
      }
    },
    [setUser, showNotification, navigate]
  );

  const handleRegister = useCallback(
    (name: string, email: string, password: string) => {
      if (name && email && password) {
        setUser({ id: "1", name, email });
        showNotification("success", "تم إنشاء الحساب بنجاح!");
        navigate("dashboard");
      } else {
        showNotification("error", "يرجى ملء جميع الحقول");
      }
    },
    [setUser, showNotification, navigate]
  );

  const handleLogout = useCallback(() => {
    setUser(null);
    showNotification("info", "تم تسجيل الخروج");
    navigate("home");
  }, [setUser, showNotification, navigate]);

  return {
    handleLogin,
    handleRegister,
    handleLogout,
  };
};

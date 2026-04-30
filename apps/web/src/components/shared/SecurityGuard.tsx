"use client";

import { useEffect } from "react";

export function SecurityGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent F12
        if (e.key === "F12") {
          e.preventDefault();
        }
        // Prevent Ctrl+Shift+I (or Cmd+Option+I on Mac)
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "I" || e.key === "i")
        ) {
          e.preventDefault();
        }
      };

      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
    return undefined;
  }, []);

  return null;
}

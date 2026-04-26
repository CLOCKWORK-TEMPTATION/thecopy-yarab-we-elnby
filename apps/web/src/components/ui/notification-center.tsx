"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Enhanced Notification Center Component
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Animated toast notifications
 * - Multiple notification types
 * - Auto-dismiss with progress bar
 * - Action buttons
 * - Stacking notifications
 * - Sound effects (optional)
 */

export type NotificationType = "success" | "error" | "warning" | "info" | "ai";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  maxVisible?: number;
}

const iconMap: Record<NotificationType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  ai: Sparkles,
};

const colorMap: Record<NotificationType, string> = {
  success:
    "bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20 text-green-700 dark:text-green-300",
  error:
    "bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/20 text-red-700 dark:text-red-300",
  warning:
    "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  info: "bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
  ai: "bg-gradient-to-r from-purple-500/10 to-pink-600/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
};

const iconColorMap: Record<NotificationType, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  ai: "text-purple-600 dark:text-purple-400",
};

const positionMap = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

export function NotificationCenter({
  notifications,
  onDismiss,
  position = "top-right",
  maxVisible = 3,
}: NotificationCenterProps) {
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div
      className={cn(
        "fixed z-[100] flex flex-col gap-2 w-full max-w-md pointer-events-none",
        positionMap[position]
      )}
      dir="rtl"
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  index: number;
}

function NotificationItem({
  notification,
  onDismiss,
  index,
}: NotificationItemProps) {
  const [progress, setProgress] = React.useState(100);
  const Icon = iconMap[notification.type];
  const duration = notification.duration ?? 5000;

  React.useEffect(() => {
    if (duration === Infinity) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        onDismiss(notification.id);
        notification.onDismiss?.();
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, notification, onDismiss]);

  const handleDismiss = () => {
    onDismiss(notification.id);
    notification.onDismiss?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 500,
          damping: 30,
        },
      }}
      exit={{
        opacity: 0,
        x: 100,
        scale: 0.95,
        transition: {
          duration: 0.2,
        },
      }}
      className="pointer-events-auto"
      style={{
        zIndex: 100 - index,
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border backdrop-blur-md shadow-lg",
          "transition-all duration-300",
          colorMap[notification.type]
        )}
      >
        {/* Progress bar */}
        {duration !== Infinity && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
            <motion.div
              className="h-full bg-current opacity-30"
              initial={{ width: "100%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
        )}

        <div className="p-4 pr-12">
          <div className="flex items-start gap-3">
            {/* Icon with pulse animation for AI notifications */}
            <div className="flex-shrink-0">
              {notification.type === "ai" ? (
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Icon
                    className={cn("h-5 w-5", iconColorMap[notification.type])}
                  />
                </motion.div>
              ) : (
                <>
                  <Icon
                    className={cn("h-5 w-5", iconColorMap[notification.type])}
                  />
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {notification.title}
              </p>
              {notification.message && (
                <p className="mt-1 text-sm opacity-80 leading-relaxed">
                  {notification.message}
                </p>
              )}

              {/* Action button */}
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="mt-2 text-sm font-medium underline hover:no-underline transition-all"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="إغلاق الإشعار"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Hook to manage notifications
 *
 * @example
 * ```tsx
 * const { notifications, addNotification, dismissNotification } = useNotifications();
 *
 * addNotification({
 *   type: "success",
 *   title: "تم الحفظ بنجاح",
 *   message: "تم حفظ التغييرات",
 * });
 * ```
 */
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const addNotification = React.useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = Math.random().toString(36).substring(7);
      setNotifications((prev) => [...prev, { ...notification, id }]);
      return id;
    },
    []
  );

  const dismissNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
  };
}

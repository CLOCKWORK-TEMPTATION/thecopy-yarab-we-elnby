import { create } from "zustand";

import type { Notification } from "@/components/ui/notification-center";

/**
 * Notification Store
 * Global state management for notifications using Zustand
 */

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => string;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification: Notification = { ...notification, id };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    return id;
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

/**
 * Hook for using notifications
 * Provides convenient methods for showing notifications
 */
export function useNotifications() {
  const store = useNotificationStore();

  return {
    ...store,
    success: (
      title: string,
      message?: string,
      action?: Notification["action"]
    ) => {
      const notification: Omit<Notification, "id"> = { type: "success", title };
      if (message !== undefined) notification.message = message;
      if (action !== undefined) notification.action = action;
      return store.addNotification(notification);
    },

    error: (
      title: string,
      message?: string,
      action?: Notification["action"]
    ) => {
      const notification: Omit<Notification, "id"> = { type: "error", title };
      if (message !== undefined) notification.message = message;
      if (action !== undefined) notification.action = action;
      return store.addNotification(notification);
    },

    warning: (
      title: string,
      message?: string,
      action?: Notification["action"]
    ) => {
      const notification: Omit<Notification, "id"> = { type: "warning", title };
      if (message !== undefined) notification.message = message;
      if (action !== undefined) notification.action = action;
      return store.addNotification(notification);
    },

    info: (
      title: string,
      message?: string,
      action?: Notification["action"]
    ) => {
      const notification: Omit<Notification, "id"> = { type: "info", title };
      if (message !== undefined) notification.message = message;
      if (action !== undefined) notification.action = action;
      return store.addNotification(notification);
    },

    ai: (title: string, message?: string, action?: Notification["action"]) => {
      const notification: Omit<Notification, "id"> = {
        type: "ai",
        title,
        duration: Infinity,
      };
      if (message !== undefined) notification.message = message;
      if (action !== undefined) notification.action = action;
      return store.addNotification(notification);
    },
  };
}

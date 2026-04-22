"use client";

import * as React from "react";
import { NotificationCenter } from "@/components/ui/notification-center";
import { useNotificationStore } from "@/hooks/use-notifications";

/**
 * Notification Provider
 * Renders the notification center and manages global notifications
 */

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { notifications, dismissNotification } = useNotificationStore();

  return (
    <>
      {children}
      <NotificationCenter
        notifications={notifications}
        onDismiss={dismissNotification}
        position="top-right"
        maxVisible={3}
      />
    </>
  );
}

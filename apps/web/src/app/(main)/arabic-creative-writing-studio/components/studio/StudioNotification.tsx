"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { NotificationState } from "../../types/studio";

interface StudioNotificationProps {
  notification: NotificationState | null;
}

export function StudioNotification({ notification }: StudioNotificationProps) {
  if (!notification) return null;

  const variants = {
    success: "default" as const,
    error: "destructive" as const,
    warning: "default" as const,
    info: "default" as const,
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <CardSpotlight className="overflow-hidden rounded-[20px] border border-white/8 bg-black/28 backdrop-blur-2xl">
        <Alert
          variant={variants[notification.type]}
          className="border-0 bg-transparent"
        >
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      </CardSpotlight>
    </div>
  );
}

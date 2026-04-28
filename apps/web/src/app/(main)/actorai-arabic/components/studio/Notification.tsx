import { Alert, AlertDescription } from "@/components/ui/alert";
import React from "react";

interface NotificationProps {
  notification: { type: string; message: string } | null;
}

export const Notification: React.FC<NotificationProps> = ({ notification }) => {
  if (!notification) return null;
  return (
    <div className="fixed top-4 left-4 z-50 animate-in slide-in-from-top">
      <Alert
        variant={notification.type === "error" ? "destructive" : "default"}
      >
        <AlertDescription>{notification.message}</AlertDescription>
      </Alert>
    </div>
  );
};

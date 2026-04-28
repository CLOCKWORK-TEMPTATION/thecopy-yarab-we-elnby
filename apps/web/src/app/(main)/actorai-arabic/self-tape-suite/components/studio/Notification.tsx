import { Alert, AlertDescription } from "@/components/ui/alert";

type NotificationState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface NotificationProps {
  notification: NotificationState;
}

export const Notification: React.FC<NotificationProps> = ({ notification }) => {
  if (!notification) return null;

  return (
    <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2">
      <Alert
        className={`${
          notification.type === "success"
            ? "border-green-500 bg-green-500/20 text-green-300"
            : notification.type === "error"
              ? "border-red-500 bg-red-500/20 text-red-300"
              : "border-blue-500 bg-blue-500/20 text-blue-300"
        }`}
      >
        <AlertDescription>{notification.message}</AlertDescription>
      </Alert>
    </div>
  );
};

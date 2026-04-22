"use client";

/**
 * الصفحة: actorai-arabic / NotificationBanner
 * الهوية: إشعار داخلي عائم متسق مع القشرة الداكنة الجديدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات ActorAiArabicStudioV2 المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApp } from "../context/AppContext";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

export function NotificationBanner() {
  const { notification } = useApp();

  if (!notification) return null;

  return (
    <div className="fixed top-4 left-4 z-50 animate-in slide-in-from-top">
      <CardSpotlight className="overflow-hidden rounded-[20px] border border-white/8 bg-black/28 backdrop-blur-2xl">
        <Alert
          variant={notification.type === "error" ? "destructive" : "default"}
          className="border-0 bg-transparent"
        >
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      </CardSpotlight>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * ScriptUploadZone - مكون معطّل
 * تم إلغاء خاصية الاستيراد من directors-studio لتطبيق إجراء الملكية على محرّر الملفات
 * الاستيراد متاح حصراً من /editor
 */
export default function ScriptUploadZone() {
  const router = useRouter();

  const handleRedirect = () => {
    router.push("/editor");
  };

  return (
    <Card className="w-full border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-900">الاستيراد معطّل</CardTitle>
        </div>
        <CardDescription className="text-amber-800 mt-1">
          تم إلغاء الاستيراد من هذه الصفحة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-amber-900 leading-relaxed">
          المالك الوحيد للاستيراد هو المحرر{" "}
          <code className="bg-amber-100 px-2 py-1 rounded text-xs font-mono">
            /editor
          </code>
        </p>
        <Button
          onClick={handleRedirect}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          انتقل إلى المحرر
        </Button>
      </CardContent>
    </Card>
  );
}

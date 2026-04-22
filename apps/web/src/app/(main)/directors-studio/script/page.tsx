"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// تحرير السيناريو معطّل بشكل كامل
// المالك الحصري لتحرير السيناريو هو صفحة المحرر /editor فقط
export default function ScriptPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md border-amber-600/30 bg-amber-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <CardTitle className="text-amber-200 text-lg">
              تحرير السيناريو معطّل
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-amber-100/70 leading-relaxed">
            تم إلغاء تحرير وتحليل السيناريو من هذه الصفحة. المالك الوحيد لتحرير
            السيناريو هو المحرر /editor.
          </p>
          <Button
            onClick={() => router.push("/editor")}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            انتقل إلى المحرر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

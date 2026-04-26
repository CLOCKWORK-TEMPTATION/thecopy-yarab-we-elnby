"use client";

import { RefreshCw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardErrorState({
  error,
  onManualRefresh,
}: {
  error: Error;
  onManualRefresh: () => void;
}) {
  return (
    <div className="p-6">
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            خطأ في تحميل البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || "حدث خطأ أثناء جلب البيانات"}
          </p>
          <Button onClick={onManualRefresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

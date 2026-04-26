"use client";

import { CheckCircle2, Server } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ReportDataType } from "./system-metrics-dashboard.types";

export function RecommendationsCard({
  reportData,
}: {
  reportData: ReportDataType | undefined;
}) {
  if (!reportData?.recommendations?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          توصيات التحسين
        </CardTitle>
        <CardDescription>اقتراحات لتحسين أداء النظام</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {reportData.recommendations.map((rec, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

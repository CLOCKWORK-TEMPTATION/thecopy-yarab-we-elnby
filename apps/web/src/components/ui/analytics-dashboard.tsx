"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Activity,
  Target,
  Zap,
} from "lucide-react";

interface AnalyticsData {
  totalScripts: number;
  activeUsers: number;
  completionRate: number;
  avgAnalysisTime: string;
}

interface RecentActivity {
  id: string;
  type: "analysis" | "script" | "review";
  title: string;
  timestamp: string;
  status: "completed" | "in-progress" | "failed";
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");

  const analyticsData: AnalyticsData = {
    totalScripts: 1247,
    activeUsers: 89,
    completionRate: 94.2,
    avgAnalysisTime: "2.3 دقيقة",
  };

  const recentActivities: RecentActivity[] = [
    {
      id: "1",
      type: "analysis",
      title: "تحليل سيناريو - رحلة العودة",
      timestamp: "منذ 5 دقائق",
      status: "completed",
    },
    {
      id: "2",
      type: "script",
      title: "سيناريو جديد - قصة حب",
      timestamp: "منذ 15 دقيقة",
      status: "in-progress",
    },
    {
      id: "3",
      type: "review",
      title: "مراجعة تحليل - الصراع الداخلي",
      timestamp: "منذ 30 دقيقة",
      status: "completed",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "analysis":
        return <BarChart3 className="w-4 h-4" />;
      case "script":
        return <FileText className="w-4 h-4" />;
      case "review":
        return <Target className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحليلات</h1>
          <p className="text-muted-foreground">نظرة عامة على أداء المنصة</p>
        </div>
        <div className="flex gap-2">
          {["24h", "7d", "30d", "90d"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي السيناريوهات
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.totalScripts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> من الشهر الماضي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              المستخدمون النشطون
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5%</span> من الأسبوع الماضي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإكمال</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> من الشهر الماضي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              متوسط وقت التحليل
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.avgAnalysisTime}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-0.3 ثانية</span> تحسن في الأداء
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              النشاط الأخير
            </CardTitle>
            <CardDescription>آخر العمليات على المنصة</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="text-muted-foreground">
                      {getTypeIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              مقاييس الأداء
            </CardTitle>
            <CardDescription>إحصائيات مفصلة للأداء</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">معدل نجاح التحليل</span>
                <Badge variant="secondary">98.5%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">متوسط تقييم المستخدمين</span>
                <Badge variant="secondary">4.7/5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">وقت الاستجابة</span>
                <Badge variant="secondary">1.2 ثانية</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">معدل الأخطاء</span>
                <Badge variant="destructive">0.3%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

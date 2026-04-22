"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Lightbulb,
  Zap,
  Star,
  ArrowRight,
  Check,
  Rocket,
  Target,
  TrendingUp,
} from "lucide-react";
import { designTokens } from "@/app/(main)/ui/tokens/design-tokens";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

export default function NewFeature() {
  const [activeTab, setActiveTab] = useState("overview");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const features = [
    {
      icon: Sparkles,
      title: "ميزة إبداعية",
      description: "استكشف إمكانيات جديدة لتطوير المحتوى الإبداعي",
      color: designTokens.colors.accent,
    },
    {
      icon: Lightbulb,
      title: "أفكار مبتكرة",
      description: "توليد أفكار فريدة ومبتكرة بسهولة",
      color: designTokens.stateColors.alt,
    },
    {
      icon: Zap,
      title: "أداء سريع",
      description: "معالجة فورية وسريعة للمحتوى",
      color: designTokens.stateColors.final,
    },
    {
      icon: Target,
      title: "دقة عالية",
      description: "نتائج دقيقة ومخصصة حسب احتياجاتك",
      color: designTokens.colors.accentWeak,
    },
  ];

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    setIsProcessing(true);

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/8 rounded-[12px]">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              الصفحة الجديدة
            </h1>
            <p className="text-white/55 mt-1">
              اكتشف إمكانيات جديدة لتطوير محتواك الإبداعي
            </p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <Star className="h-3 w-3" />
          جديد
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <TrendingUp className="h-3 w-3" />
          قيد التطوير
        </Badge>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="features">المميزات</TabsTrigger>
          <TabsTrigger value="workspace">ورشة العمل</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              هذه صفحة تجريبية جديدة تم إضافتها للنظام. يمكنك استخدامها لاستكشاف
              الإمكانيات الجديدة.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {features.map((feature, index) => (
              <CardSpotlight
                key={index}
                className="overflow-hidden rounded-[22px] border-white/8 hover:border-primary/50 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${feature.color}15` }}
                    >
                      <feature.icon
                        className="h-6 w-6"
                        style={{ color: feature.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </CardSpotlight>
            ))}
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4 mt-6">
          <CardSpotlight className="overflow-hidden rounded-[22px]">
            <CardHeader>
              <CardTitle>المميزات الرئيسية</CardTitle>
              <CardDescription>
                قائمة شاملة بجميع المميزات المتاحة في هذه الصفحة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "تكامل كامل مع نظام التصميم",
                "دعم كامل للغة العربية والـ RTL",
                "واجهة مستخدم سريعة الاستجابة",
                "تصميم متسق مع باقي التطبيق",
                "استخدام Design Tokens القياسية",
                "دعم المكونات المشتركة (Shadcn UI)",
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-[10px] bg-white/6"
                >
                  <div className="p-1.5 bg-white/8 rounded-full">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-white/85">{feature}</span>
                </div>
              ))}
            </CardContent>
          </CardSpotlight>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-4 mt-6">
          <CardSpotlight className="overflow-hidden rounded-[22px]">
            <CardHeader>
              <CardTitle>ورشة العمل</CardTitle>
              <CardDescription>
                ابدأ بإدخال المحتوى الخاص بك هنا
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">العنوان</Label>
                <Input
                  id="title"
                  placeholder="أدخل عنوان المشروع..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">المحتوى</Label>
                <Textarea
                  id="content"
                  placeholder="أدخل محتوى المشروع هنا..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !content.trim() || isProcessing}
                  className="flex-1 sm:flex-none gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      ابدأ المعالجة
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTitle("");
                    setContent("");
                  }}
                  disabled={isProcessing}
                >
                  مسح
                </Button>
              </div>

              {isProcessing && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    جاري معالجة المحتوى... يرجى الانتظار
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </CardSpotlight>
        </TabsContent>
      </Tabs>

      {/* Info Footer */}
      <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.02] border-white/4 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-white/45 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-white/55">
                <strong className="text-white">ملاحظة:</strong> هذه الصفحة تم
                إنشاؤها باتباع نفس المعايير والأنماط المستخدمة في باقي صفحات
                التطبيق، مع دعم كامل للـ RTL، Design Tokens، والمكونات المشتركة.
              </p>
            </div>
          </div>
        </CardContent>
      </CardSpotlight>
    </div>
  );
}

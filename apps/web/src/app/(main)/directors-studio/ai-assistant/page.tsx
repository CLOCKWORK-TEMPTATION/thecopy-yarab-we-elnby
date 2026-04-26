"use client";

import { Bot, Sparkles, Film, Users } from "lucide-react";

import AIChatPanel from "@/app/(main)/directors-studio/components/AIChatPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AIAssistantPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Bot className="h-10 w-10 text-[var(--app-accent)]" />
          مساعد AI للإخراج
        </h1>
        <p className="text-[var(--app-text-muted)] mt-2">
          احصل على مساعدة ذكية في تخطيط المشاهد واللقطات
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[var(--app-accent)]" />
              </div>
              <div>
                <CardTitle className="text-lg">تحليل السيناريو</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              قم بتحليل السيناريو واستخراج المشاهد والشخصيات تلقائياً
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center">
                <Film className="h-5 w-5 text-[var(--app-accent)]" />
              </div>
              <div>
                <CardTitle className="text-lg">اقتراحات اللقطات</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              احصل على اقتراحات احترافية للقطات والزوايا المناسبة
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[var(--app-accent)]" />
              </div>
              <div>
                <CardTitle className="text-lg">تتبع الشخصيات</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              تحليل ظهور الشخصيات والتأكد من الاتساق
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AIChatPanel />
        </div>
      </div>

      <div className="mt-8 p-6 bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)]">
        <h3 className="font-semibold mb-3 text-[var(--app-text)]">
          أمثلة على الأسئلة:
        </h3>
        <ul className="space-y-2 text-sm text-[var(--app-text-muted)]">
          <li>• حلل السيناريو واستخرج المشاهد الرئيسية</li>
          <li>• اقترح لقطات للمشهد الافتتاحي</li>
          <li>• ما هي أفضل زاوية كاميرا لمشهد درامي؟</li>
          <li>• كيف يمكنني تحسين الإضاءة في المشهد الليلي؟</li>
          <li>• اقترح تسلسل لقطات لمشهد حوار بين شخصيتين</li>
        </ul>
      </div>
    </div>
  );
}

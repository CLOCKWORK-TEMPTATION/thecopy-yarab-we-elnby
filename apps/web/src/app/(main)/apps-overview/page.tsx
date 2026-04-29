"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { platformApps, type PlatformApp } from "@/config/apps.config";

const categoryNames: Record<string, string> = {
  production: "الإنتاج",
  creative: "الإبداع",
  analysis: "التحليل",
  management: "الإدارة",
};

const categoryColors: Record<string, string> = {
  production: "from-purple-600 to-pink-600",
  creative: "from-blue-600 to-cyan-600",
  analysis: "from-violet-600 to-purple-600",
  management: "from-green-600 to-emerald-600",
};

function getCategoryName(category: string) {
  return categoryNames[category] ?? category;
}

function getCategoryColor(category: string) {
  return categoryColors[category] ?? "from-white/10 to-white/5";
}

interface AppCardProps {
  app: PlatformApp;
}

function AppCard({ app }: AppCardProps) {
  return (
    <Card
      className="bg-white/[0.04] border-white/8 hover:bg-white/6 transition-all duration-300 hover:scale-105 hover:border-[#FFD700]/50 rounded-[22px] backdrop-blur-xl"
      data-testid={`app-card-${app.id}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <span className="text-3xl">{app.icon}</span>
          <div className="flex-1">
            <div className="text-xl">{app.nameAr}</div>
            <div className="text-sm text-white/55 font-normal">{app.name}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-white/68 mb-4 min-h-[3rem]">
          {app.description}
        </CardDescription>
        <div className="flex items-center justify-between gap-3">
          {app.badge && (
            <Badge
              variant="secondary"
              className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30"
              data-testid={`app-badge-${app.id}`}
            >
              {app.badge}
            </Badge>
          )}
          <Link href={app.path} className="mr-auto">
            <Button
              className={`bg-gradient-to-r ${app.color} hover:opacity-90 transition-opacity`}
              size="sm"
              data-testid={`app-launch-btn-${app.id}`}
            >
              فتح التطبيق ←
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DisabledAppCard({ app }: AppCardProps) {
  return (
    <Card
      className="bg-white/[0.02] border-white/5 rounded-[22px] backdrop-blur-xl opacity-50 cursor-not-allowed"
      aria-disabled="true"
      data-testid={`app-card-disabled-${app.id}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white/40">
          <span className="text-3xl grayscale">{app.icon}</span>
          <div className="flex-1">
            <div className="text-xl">{app.nameAr}</div>
            <div className="text-sm text-white/30 font-normal">{app.name}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-white/35 mb-4 min-h-[3rem]">
          {app.description}
        </CardDescription>
        <div className="flex items-center gap-3">
          {app.badge && (
            <Badge
              variant="secondary"
              className="bg-white/5 text-white/30 border-white/10"
            >
              {app.badge}
            </Badge>
          )}
          <Button
            className="mr-auto bg-white/5 text-white/30 cursor-not-allowed"
            size="sm"
            disabled
            data-testid={`app-launch-btn-disabled-${app.id}`}
          >
            غير متاح حاليًا
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategorySectionProps {
  category: string;
  apps: PlatformApp[];
}

function CategorySection({ category, apps }: CategorySectionProps) {
  return (
    <div data-testid={`category-section-${category}`}>
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <span
          className={`bg-gradient-to-r ${getCategoryColor(category)} px-4 py-2 rounded-lg`}
        >
          {getCategoryName(category)}
        </span>
        <span className="text-white/45">({apps.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

export default function AppsOverviewPage() {
  const enabledApps = platformApps.filter((app) => app.enabled);
  const disabledApps = platformApps.filter((app) => !app.enabled);
  const appsByCategory = enabledApps.reduce(
    (acc, app) => {
      const categoryApps = acc[app.category] ?? [];
      categoryApps.push(app);
      acc[app.category] = categoryApps;
      return acc;
    },
    {} as Record<string, PlatformApp[]>
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-black via-black/95 to-black text-white p-6 md:p-12 backdrop-blur-xl"
      dir="rtl"
      data-testid="apps-overview-page"
    >
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#FFD700] via-yellow-500 to-[#FFD700] bg-clip-text text-transparent">
            منصة النسخة
          </h1>
          <p className="text-xl md:text-2xl text-white/68 mb-2">{`مجموعة شاملة من ${enabledApps.length} تطبيقاً متخصصاً`}</p>
          <p className="text-lg text-white/55">
            للإنتاج السينمائي والدرامي العربي
          </p>
        </div>
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          data-testid="category-stats"
        >
          {Object.entries(appsByCategory).map(([category, apps]) => (
            <div
              key={category}
              className="bg-white/[0.04] border border-white/8 rounded-[22px] p-4 text-center hover:bg-white/6 transition-colors backdrop-blur-xl"
              data-testid={`category-stat-${category}`}
            >
              <div className="text-3xl font-bold text-[#FFD700]">
                {apps.length}
              </div>
              <div className="text-sm text-white/55">
                {getCategoryName(category)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="max-w-7xl mx-auto space-y-12"
        data-testid="apps-grid-enabled"
      >
        {Object.entries(appsByCategory).map(([category, apps]) => (
          <CategorySection key={category} category={category} apps={apps} />
        ))}
      </div>

      {disabledApps.length > 0 && (
        <div
          className="max-w-7xl mx-auto mt-16"
          data-testid="apps-grid-coming-soon"
        >
          <h2 className="text-2xl font-bold mb-6 text-white/40 flex items-center gap-3">
            <span className="border border-white/20 px-4 py-2 rounded-lg">
              قريبًا
            </span>
            <span className="text-white/30">({disabledApps.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disabledApps.map((app) => (
              <DisabledAppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mt-16 text-center text-white/45">
        <p className="text-lg">
          منصة متكاملة تجمع بين قوة الذكاء الاصطناعي وأدوات الإنتاج الاحترافية
        </p>
        <div className="mt-4">
          <Link href="/ui">
            <Button
              variant="outline"
              className="border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
              data-testid="back-to-launcher-btn"
            >
              العودة إلى القائمة الرئيسية
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

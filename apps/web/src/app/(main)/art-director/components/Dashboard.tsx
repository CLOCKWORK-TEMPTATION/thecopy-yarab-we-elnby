"use client";

/**
 * الصفحة: art-director / Dashboard
 * الهوية: لوحة قيادة داخلية داكنة مع بطاقات توهج خفيفة وإجراءات سريعة متسقة مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import {
  Palette,
  MapPin,
  Boxes,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { usePlugins } from "../hooks/usePlugins";
import { fetchArtDirectorJson } from "../lib/api-client";

import type { ApiResponse, PluginInfo } from "../types";

type TabId =
  | "dashboard"
  | "tools"
  | "inspiration"
  | "locations"
  | "sets"
  | "productivity"
  | "documentation";

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

interface QuickAction {
  id: TabId;
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}

interface Stat {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}

interface DashboardSummary {
  projectsActive: number;
  locationsCount: number;
  setsCount: number;
  completedTasks: number;
  pluginsCount: number;
  lastUpdated: string;
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "inspiration",
    icon: Palette,
    title: "إنشاء Mood Board",
    desc: "لوحة إلهام بصرية جديدة",
    color: "#e94560",
  },
  {
    id: "locations",
    icon: MapPin,
    title: "إضافة موقع",
    desc: "تسجيل موقع تصوير جديد",
    color: "#4ade80",
  },
  {
    id: "sets",
    icon: Boxes,
    title: "تحليل ديكور",
    desc: "فحص إعادة الاستخدام",
    color: "#fbbf24",
  },
  {
    id: "documentation",
    icon: FileText,
    title: "إنشاء تقرير",
    desc: "توليد كتاب الإنتاج",
    color: "#60a5fa",
  },
] as const;

const EMPTY_SUMMARY: DashboardSummary = {
  projectsActive: 0,
  locationsCount: 0,
  setsCount: 0,
  completedTasks: 0,
  pluginsCount: 0,
  lastUpdated: "",
};

interface StatCardProps {
  stat: Stat;
}

function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon;

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `${stat.color}22`, color: stat.color }}
          >
            <Icon size={22} aria-hidden="true" />
          </div>
          <span className="text-sm text-[var(--art-text-muted)]">
            {stat.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{stat.value}</div>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface QuickActionCardProps {
  action: QuickAction;
  onClick: () => void;
}

function QuickActionCard({ action, onClick }: QuickActionCardProps) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-right"
      aria-label={`${action.title}: ${action.desc}`}
    >
      <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl transition-transform hover:translate-y-[-2px]">
        <div className="flex items-center gap-4">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `${action.color}22`, color: action.color }}
          >
            <Icon size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {action.title}
            </h3>
            <p className="mt-1 text-sm text-[var(--art-text-muted)]">
              {action.desc}
            </p>
          </div>
        </div>
      </CardSpotlight>
    </button>
  );
}

interface PluginCardProps {
  plugin: PluginInfo;
}

function PluginCard({ plugin }: PluginCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="space-y-3 text-right">
        <div
          className="inline-flex rounded-full px-3 py-1 text-xs text-white"
          style={{
            background:
              "color-mix(in srgb, var(--art-primary) 80%, transparent)",
          }}
        >
          {plugin.category}
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            {plugin.nameAr}
          </h3>
          <p className="mt-1 text-sm text-[var(--art-text-muted)]">
            {plugin.name}
          </p>
        </div>
      </div>
    </CardSpotlight>
  );
}

function LoadingState() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="text-sm text-[var(--art-text-muted)]">
        جاري تحميل الأدوات من المنصة...
      </div>
    </CardSpotlight>
  );
}

interface ErrorAlertProps {
  message: string;
}

function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div
      className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"
      role="alert"
    >
      {message}
    </div>
  );
}

interface PluginsGridProps {
  plugins: PluginInfo[];
  loading: boolean;
}

function PluginsGrid({ plugins, loading }: PluginsGridProps) {
  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="art-grid-3">
      {plugins.map((plugin) => (
        <PluginCard key={plugin.id} plugin={plugin} />
      ))}
    </div>
  );
}

function formatArabicDate(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface SectionProps {
  title?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

function Section({ title, children, style }: SectionProps) {
  return (
    <section style={{ marginBottom: "32px", ...style }}>
      {title ? (
        <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { plugins, loading, error: pluginsError } = usePlugins();
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryError(null);

    try {
      const response = await fetchArtDirectorJson<
        ApiResponse<{ summary: DashboardSummary }> & {
          summary?: DashboardSummary;
        }
      >("/dashboard/summary");
      const nextSummary = response.data?.summary ?? response.summary;

      if (response.success && nextSummary) {
        setSummary(nextSummary);
        return;
      }

      setSummaryError(response.error ?? "تعذر تحميل ملخص لوحة التحكم");
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "تعذر تحميل ملخص لوحة التحكم"
      );
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSummary();
  }, [loadSummary]);

  const formattedDate = useMemo(() => formatArabicDate(), []);

  const stats = useMemo<Stat[]>(
    () => [
      {
        icon: Sparkles,
        label: "مشاريع نشطة",
        value: String(summary.projectsActive),
        color: "#e94560",
      },
      {
        icon: MapPin,
        label: "مواقع مسجلة",
        value: String(summary.locationsCount),
        color: "#4ade80",
      },
      {
        icon: Boxes,
        label: "ديكورات",
        value: String(summary.setsCount),
        color: "#fbbf24",
      },
      {
        icon: CheckCircle2,
        label: "مهام مكتملة",
        value: String(summary.completedTasks),
        color: "#60a5fa",
      },
    ],
    [summary]
  );

  return (
    <div className="art-director-page">
      <header
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            مرحباً بك في CineArchitect
          </h1>
          <p className="text-[var(--art-text-muted)] text-base">
            مساعدك الذكي لتصميم الديكورات السينمائية
          </p>
          {summary.lastUpdated ? (
            <p className="text-[13px] text-[var(--art-text-muted)] mt-2">
              آخر مزامنة:{" "}
              {new Date(summary.lastUpdated).toLocaleString("ar-EG")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--art-text-muted)]">
          <Clock size={16} aria-hidden="true" />
          <span>{formattedDate}</span>
        </div>
      </header>

      {summaryError ? <ErrorAlert message={summaryError} /> : null}
      {pluginsError ? <ErrorAlert message={pluginsError} /> : null}

      <Section>
        <div className="art-grid-4">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </div>
      </Section>

      <Section title="إجراءات سريعة">
        <div className="art-grid-4">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.id}
              action={action}
              onClick={() => onNavigate(action.id)}
            />
          ))}
        </div>
      </Section>

      <Section title={`الأدوات المتاحة (${plugins.length})`}>
        <PluginsGrid plugins={plugins} loading={loading} />
      </Section>
    </div>
  );
}

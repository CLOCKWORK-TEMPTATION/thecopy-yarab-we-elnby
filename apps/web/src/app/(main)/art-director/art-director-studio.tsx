"use client";

/**
 * الصفحة: art-director / studio shell
 * الهوية: استوديو مدير فن سينمائي داكن مع إبراز درامي ولمعان بصري متسق مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-highlight, --page-bg, --page-surface, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight, TextRevealCard
 */

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Palette,
  MapPin,
  Boxes,
  BarChart3,
  FileText,
  Film,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import "./art-director.css";

import Dashboard from "./components/Dashboard";
import Tools from "./components/Tools";
import Inspiration from "./components/Inspiration";
import Locations from "./components/Locations";
import Sets from "./components/Sets";
import Productivity from "./components/Productivity";
import Documentation from "./components/Documentation";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import {
  ArtDirectorPersistenceProvider,
  isArtDirectorTabId,
  useArtDirectorPersistence,
  type ArtDirectorTabId,
} from "./hooks/useArtDirectorPersistence";

interface NavItem {
  id: ArtDirectorTabId;
  icon: LucideIcon;
  label: string;
  labelEn: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "لوحة التحكم",
    labelEn: "Dashboard",
  },
  { id: "tools", icon: Wrench, label: "جميع الأدوات", labelEn: "All Tools" },
  {
    id: "inspiration",
    icon: Palette,
    label: "الإلهام البصري",
    labelEn: "Inspiration",
  },
  { id: "locations", icon: MapPin, label: "المواقع", labelEn: "Locations" },
  { id: "sets", icon: Boxes, label: "الديكورات", labelEn: "Sets" },
  {
    id: "productivity",
    icon: BarChart3,
    label: "الإنتاجية",
    labelEn: "Productivity",
  },
  {
    id: "documentation",
    icon: FileText,
    label: "التوثيق",
    labelEn: "Documentation",
  },
] as const;

function Logo() {
  return (
    <div className="art-director-logo">
      <Film size={32} />
      <div className="art-director-logo-text">
        <span className="art-director-logo-title">CineArchitect</span>
        <span className="art-director-logo-subtitle">مساعد مهندس الديكور</span>
      </div>
    </div>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
  const Icon = item.icon;

  return (
    <button
      className={`art-director-nav-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      title={item.labelEn}
      type="button"
    >
      <Icon size={20} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

interface NavigationProps {
  activeTab: ArtDirectorTabId;
  onTabChange: (tab: ArtDirectorTabId) => void;
}

function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav
      className="art-director-nav"
      role="navigation"
      aria-label="التنقل الرئيسي"
    >
      {NAV_ITEMS.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          isActive={activeTab === item.id}
          onClick={() => onTabChange(item.id)}
        />
      ))}
    </nav>
  );
}

function HeroStrip() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/4 p-5">
      <div className="space-y-3 text-right">
        <p className="text-[11px] font-semibold tracking-[0.32em] text-white/38">
          ART DIRECTION SHELL
        </p>
        <h2 className="text-xl font-bold leading-snug text-white">
          واجهة موحدة بإيقاع سينمائي أدكن
        </h2>
        <p className="text-sm leading-7 text-white/62">
          نفس نواة المنصة البصرية، لكن بلمعة درامية أوضح لتناسب الإلهام البصري
          والمواقع والديكورات وأدوات مدير الفن.
        </p>
      </div>
    </CardSpotlight>
  );
}

function ArtDirectorStudioInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, hydrated, setActiveTab } = useArtDirectorPersistence();
  const requestedTab = searchParams.get("tab");
  const activeTab: ArtDirectorTabId = isArtDirectorTabId(requestedTab)
    ? requestedTab
    : hydrated
      ? state.activeTab
      : "dashboard";

  useEffect(() => {
    setActiveTab(activeTab);
  }, [activeTab, setActiveTab]);

  const handleTabChange = useCallback(
    (tab: ArtDirectorTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      setActiveTab(tab);

      if (tab === "dashboard") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, setActiveTab]
  );

  const content = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={handleTabChange} />;
      case "tools":
        return <Tools />;
      case "inspiration":
        return <Inspiration />;
      case "locations":
        return <Locations />;
      case "sets":
        return <Sets />;
      case "productivity":
        return <Productivity />;
      case "documentation":
        return <Documentation />;
      default:
        return <Dashboard onNavigate={handleTabChange} />;
    }
  }, [activeTab, handleTabChange]);

  return (
    <div className="art-director-root">
      <NoiseBackground />
      <div className="art-director-beams" aria-hidden="true">
        <BackgroundBeams />
      </div>
      <div className="art-director-overlay" aria-hidden="true" />

      <div className="art-director-layout">
        <CardSpotlight className="art-director-sidebar-shell">
          <aside className="art-director-sidebar" role="complementary">
            <Logo />
            <HeroStrip />
            <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
          </aside>
        </CardSpotlight>

        <CardSpotlight className="art-director-main-shell">
          <main className="art-director-main" role="main">
            {content}
          </main>
        </CardSpotlight>
      </div>
    </div>
  );
}

export default function ArtDirectorStudio() {
  return (
    <ArtDirectorPersistenceProvider>
      <ArtDirectorStudioInner />
    </ArtDirectorPersistenceProvider>
  );
}

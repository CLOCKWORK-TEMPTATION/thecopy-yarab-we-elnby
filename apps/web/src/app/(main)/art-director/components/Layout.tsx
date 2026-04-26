import {
  LayoutDashboard,
  Palette,
  MapPin,
  Boxes,
  BarChart3,
  FileText,
  Film,
  Wrench,
} from "lucide-react";
import { Outlet, NavLink } from "react-router-dom";
import "./Layout.css";

const navItems = [
  {
    path: "/",
    icon: LayoutDashboard,
    label: "لوحة التحكم",
    labelEn: "Dashboard",
  },
  { path: "/tools", icon: Wrench, label: "جميع الأدوات", labelEn: "All Tools" },
  {
    path: "/inspiration",
    icon: Palette,
    label: "الإلهام البصري",
    labelEn: "Inspiration",
  },
  { path: "/locations", icon: MapPin, label: "المواقع", labelEn: "Locations" },
  { path: "/sets", icon: Boxes, label: "الديكورات", labelEn: "Sets" },
  {
    path: "/productivity",
    icon: BarChart3,
    label: "الإنتاجية",
    labelEn: "Productivity",
  },
  {
    path: "/documentation",
    icon: FileText,
    label: "التوثيق",
    labelEn: "Documentation",
  },
];

function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <Film size={32} />
          <div className="logo-text">
            <span className="logo-title">CineArchitect</span>
            <span className="logo-subtitle">مساعد مهندس الديكور</span>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              end={item.path === "/"}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

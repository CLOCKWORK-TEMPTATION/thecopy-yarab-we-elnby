import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Palette,
  MapPin,
  Boxes,
  FileText,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import "./Dashboard.css";
import { artDirectorApiPath } from "../lib/api-client";

interface Plugin {
  id: string;
  name: string;
  nameAr: string;
  category: string;
}

const quickActions = [
  {
    path: "/inspiration",
    icon: Palette,
    title: "إنشاء Mood Board",
    desc: "لوحة إلهام بصرية جديدة",
    color: "#e94560",
  },
  {
    path: "/locations",
    icon: MapPin,
    title: "إضافة موقع",
    desc: "تسجيل موقع تصوير جديد",
    color: "#4ade80",
  },
  {
    path: "/sets",
    icon: Boxes,
    title: "تحليل ديكور",
    desc: "فحص إعادة الاستخدام",
    color: "#fbbf24",
  },
  {
    path: "/documentation",
    icon: FileText,
    title: "إنشاء تقرير",
    desc: "توليد كتاب الإنتاج",
    color: "#60a5fa",
  },
];

const stats = [
  { icon: Sparkles, label: "مشاريع نشطة", value: "3", color: "#e94560" },
  { icon: MapPin, label: "مواقع مسجلة", value: "12", color: "#4ade80" },
  { icon: Boxes, label: "ديكورات", value: "28", color: "#fbbf24" },
  { icon: CheckCircle2, label: "مهام مكتملة", value: "156", color: "#60a5fa" },
];

function Dashboard() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(artDirectorApiPath("/plugins"))
      .then((res) => res.json())
      .then((data) => {
        setPlugins(data.plugins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard fade-in">
      <header className="dashboard-header">
        <div>
          <h1>مرحباً بك في CineArchitect</h1>
          <p>مساعدك الذكي لتصميم الديكورات السينمائية</p>
        </div>
        <div className="header-stats">
          <Clock size={16} />
          <span>
            {new Date().toLocaleDateString("ar-EG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </header>

      <section className="stats-section">
        <div className="grid grid-4">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card card">
              <div
                className="stat-icon"
                style={{ background: `${stat.color}20`, color: stat.color }}
              >
                <stat.icon size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="quick-actions-section">
        <h2>إجراءات سريعة</h2>
        <div className="grid grid-4">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.path} className="quick-action card">
              <div
                className="action-icon"
                style={{ background: `${action.color}20`, color: action.color }}
              >
                <action.icon size={28} />
              </div>
              <h3>{action.title}</h3>
              <p>{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="plugins-section">
        <h2>الأدوات المتاحة ({plugins.length})</h2>
        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <div className="grid grid-3">
            {plugins.map((plugin) => (
              <div key={plugin.id} className="plugin-card card">
                <div className="plugin-category">{plugin.category}</div>
                <h3>{plugin.nameAr}</h3>
                <p className="plugin-name-en">{plugin.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;

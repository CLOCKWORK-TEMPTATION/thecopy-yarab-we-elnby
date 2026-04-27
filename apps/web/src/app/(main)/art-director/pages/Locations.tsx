import { MapPin, Plus, Search, Building, Trees, Mountain } from "lucide-react";
import { useState } from "react";

import "./Locations.css";
import { artDirectorApiPath } from "../lib/api-client";

interface Location {
  id: string;
  name: string;
  nameAr: string;
  type: string;
  address: string;
  features: string[];
}

function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    type: "interior",
    address: "",
    features: "",
  });

  const handleSearch = async () => {
    try {
      const response = await fetch(artDirectorApiPath("/locations/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery || undefined }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: { locations?: Location[] };
      };
      if (data.success && data.data?.locations) {
        setLocations(data.data.locations);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAddLocation = async () => {
    try {
      const response = await fetch(artDirectorApiPath("/locations/add"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          features: formData.features
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
        }),
      });
      const data = (await response.json()) as { success?: boolean };
      if (data.success) {
        setShowAddForm(false);
        setFormData({
          name: "",
          nameAr: "",
          type: "interior",
          address: "",
          features: "",
        });
        handleSearch();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "exterior":
        return Trees;
      case "natural":
        return Mountain;
      default:
        return Building;
    }
  };

  return (
    <div className="locations-page fade-in">
      <header className="page-header">
        <MapPin size={32} className="header-icon" />
        <div>
          <h1>إدارة المواقع</h1>
          <p>قاعدة بيانات مواقع التصوير والديكورات</p>
        </div>
      </header>

      <div className="locations-toolbar">
        <div className="search-box">
          <input
            type="text"
            className="input"
            placeholder="ابحث عن موقع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="btn" onClick={handleSearch}>
            <Search size={18} />
            بحث
          </button>
        </div>
        <button className="btn" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          إضافة موقع جديد
        </button>
      </div>

      {showAddForm && (
        <div className="add-form card fade-in">
          <h3>إضافة موقع جديد</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>اسم الموقع (عربي)</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: قصر البارون"
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>اسم الموقع (إنجليزي)</label>
              <input
                type="text"
                className="input"
                placeholder="Example: Baron Palace"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>النوع</label>
              <select
                className="input"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
              >
                <option value="interior">داخلي</option>
                <option value="exterior">خارجي</option>
                <option value="natural">طبيعي</option>
                <option value="studio">استوديو</option>
              </select>
            </div>
            <div className="form-group">
              <label>العنوان</label>
              <input
                type="text"
                className="input"
                placeholder="العنوان الكامل"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="form-group full-width">
              <label>المميزات (مفصولة بفواصل)</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: إضاءة طبيعية, مساحة واسعة, موقف سيارات"
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={handleAddLocation}>
              <Plus size={18} />
              إضافة
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddForm(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="locations-grid grid grid-3">
        {locations.length === 0 ? (
          <div className="empty-state card">
            <MapPin size={48} />
            <h3>لا توجد مواقع</h3>
            <p>ابدأ بإضافة موقع جديد أو قم بالبحث</p>
          </div>
        ) : (
          locations.map((location) => {
            const TypeIcon = getTypeIcon(location.type);
            return (
              <div key={location.id} className="location-card card">
                <div className="location-type">
                  <TypeIcon size={16} />
                  {location.type}
                </div>
                <h3>{location.nameAr}</h3>
                <p className="location-name-en">{location.name}</p>
                <p className="location-address">{location.address}</p>
                {location.features && location.features.length > 0 && (
                  <div className="location-features">
                    {location.features.map((feature, index) => (
                      <span key={index} className="feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Locations;

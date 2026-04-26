"use client";

/**
 * الصفحة: art-director / Locations
 * الهوية: قاعدة مواقع داخلية بطابع سينمائي تشغيلي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import {
  MapPin,
  Plus,
  Search,
  Building,
  Trees,
  Mountain,
  type LucideIcon,
} from "lucide-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { useArtDirectorPersistence } from "../hooks/useArtDirectorPersistence";
import { fetchArtDirectorJson } from "../lib/api-client";

import type { LocationSimple, ApiResponse } from "../types";

interface LocationFormData {
  name: string;
  nameAr: string;
  type: string;
  address: string;
  features: string;
}

const DEFAULT_FORM_DATA: LocationFormData = {
  name: "",
  nameAr: "",
  type: "interior",
  address: "",
  features: "",
};

const LOCATION_TYPE_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  interior: { icon: Building, label: "داخلي" },
  exterior: { icon: Trees, label: "خارجي" },
  natural: { icon: Mountain, label: "طبيعي" },
  studio: { icon: Building, label: "استوديو" },
};

function getLocationTypeInfo(type: string) {
  return LOCATION_TYPE_MAP[type] ?? { icon: Building, label: type };
}

interface LocationCardProps {
  location: LocationSimple;
}

function LocationCard({ location }: LocationCardProps) {
  const { icon: TypeIcon, label: typeLabel } = getLocationTypeInfo(
    location.type
  );

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          color: "var(--art-success)",
          fontSize: "12px",
        }}
      >
        <TypeIcon size={16} aria-hidden="true" />
        {typeLabel}
      </div>
      <h3 style={{ marginBottom: "4px" }}>{location.nameAr}</h3>
      <p
        style={{
          color: "var(--art-text-muted)",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {location.name}
      </p>
      <p
        style={{
          color: "var(--art-text-muted)",
          fontSize: "12px",
          marginBottom: "12px",
        }}
      >
        {location.address}
      </p>
      {location.features && location.features.length > 0 ? (
        <div>
          {location.features.map((feature, index) => (
            <span key={index} className="art-feature-tag">
              {feature}
            </span>
          ))}
        </div>
      ) : null}
    </CardSpotlight>
  );
}

function EmptyState() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
      <div className="art-empty-state" style={{ padding: 0 }}>
        <MapPin size={48} aria-hidden="true" />
        <h3>لا توجد مواقع</h3>
        <p>ابدأ بإضافة موقع جديد أو قم بالبحث</p>
      </div>
    </CardSpotlight>
  );
}

interface AddLocationFormProps {
  formData: LocationFormData;
  onFormChange: (data: Partial<LocationFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function AddLocationForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
}: AddLocationFormProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <h3 style={{ marginBottom: "20px" }}>إضافة موقع جديد</h3>
        <div className="art-form-grid">
          <div className="art-form-group">
            <label htmlFor="location-name-ar">اسم الموقع (عربي)</label>
            <input
              id="location-name-ar"
              type="text"
              className="art-input"
              placeholder="مثال: قصر البارون"
              value={formData.nameAr}
              onChange={(e) => onFormChange({ nameAr: e.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="location-name-en">اسم الموقع (إنجليزي)</label>
            <input
              id="location-name-en"
              type="text"
              className="art-input"
              placeholder="Example: Baron Palace"
              value={formData.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="location-type">النوع</label>
            <select
              id="location-type"
              className="art-input"
              value={formData.type}
              onChange={(e) => onFormChange({ type: e.target.value })}
            >
              <option value="interior">داخلي</option>
              <option value="exterior">خارجي</option>
              <option value="natural">طبيعي</option>
              <option value="studio">استوديو</option>
            </select>
          </div>
          <div className="art-form-group">
            <label htmlFor="location-address">العنوان</label>
            <input
              id="location-address"
              type="text"
              className="art-input"
              placeholder="العنوان الكامل"
              value={formData.address}
              onChange={(e) => onFormChange({ address: e.target.value })}
            />
          </div>
          <div className="art-form-group full-width">
            <label htmlFor="location-features">المميزات (مفصولة بفواصل)</label>
            <input
              id="location-features"
              type="text"
              className="art-input"
              placeholder="مثال: إضاءة طبيعية, مساحة واسعة, موقف سيارات"
              value={formData.features}
              onChange={(e) => onFormChange({ features: e.target.value })}
            />
          </div>
        </div>
        <div className="art-form-actions">
          <button className="art-btn" onClick={onSubmit} type="button">
            <Plus size={18} aria-hidden="true" />
            إضافة
          </button>
          <button
            className="art-btn art-btn-secondary"
            onClick={onCancel}
            type="button"
          >
            إلغاء
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onAddClick: () => void;
}

function SearchToolbar({
  searchQuery,
  onSearchChange,
  onSearch,
  onAddClick,
}: SearchToolbarProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") onSearch();
    },
    [onSearch]
  );

  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className="art-toolbar" style={{ marginBottom: 0 }}>
        <div className="art-search-box">
          <input
            type="text"
            className="art-input"
            placeholder="ابحث عن موقع..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="البحث عن موقع"
          />
          <button className="art-btn" onClick={onSearch} type="button">
            <Search size={18} aria-hidden="true" />
            بحث
          </button>
        </div>
        <button className="art-btn" onClick={onAddClick} type="button">
          <Plus size={18} aria-hidden="true" />
          إضافة موقع جديد
        </button>
      </div>
    </CardSpotlight>
  );
}

export default function Locations() {
  const { state, updateLocationsState } = useArtDirectorPersistence();
  const [locations, setLocations] = useState<LocationSimple[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showAddForm, searchQuery, formData } = state.locations;
  const initialSearchQueryRef = useRef(searchQuery);

  const fetchLocations = useCallback(async (query: string) => {
    setError(null);

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<{ locations: LocationSimple[] }>
      >("/locations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query || undefined }),
      });

      if (data.success && data.data?.locations) {
        setLocations(data.data.locations);
      } else {
        setLocations([]);
        if (data.error) setError(data.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء البحث";
      setError(errorMessage);
      setLocations([]);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    await fetchLocations(searchQuery);
  }, [fetchLocations, searchQuery]);

  const handleAddLocation = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchArtDirectorJson<ApiResponse>("/locations/add", {
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

      if (data.success) {
        updateLocationsState({
          showAddForm: false,
          formData: DEFAULT_FORM_DATA,
          searchQuery: "",
        });
        await fetchLocations("");
      } else {
        setError(data.error ?? "فشل في إضافة الموقع");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء الإضافة";
      setError(errorMessage);
    }
  }, [fetchLocations, formData, updateLocationsState]);

  const handleFormChange = useCallback(
    (data: Partial<LocationFormData>) => {
      updateLocationsState({
        formData: {
          ...formData,
          ...data,
        },
      });
    },
    [formData, updateLocationsState]
  );

  const handleCancelForm = useCallback(() => {
    updateLocationsState({
      showAddForm: false,
      formData: DEFAULT_FORM_DATA,
    });
  }, [updateLocationsState]);

  const locationsContent = useMemo(() => {
    if (locations.length === 0) {
      return <EmptyState />;
    }

    return locations.map((location) => (
      <LocationCard key={location.id} location={location} />
    ));
  }, [locations]);

  useEffect(() => {
    void fetchLocations(initialSearchQueryRef.current);
  }, [fetchLocations]);

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <MapPin size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>إدارة المواقع</h1>
          <p>قاعدة بيانات مواقع التصوير والديكورات</p>
        </div>
      </header>

      <SearchToolbar
        searchQuery={searchQuery}
        onSearchChange={(query) => updateLocationsState({ searchQuery: query })}
        onSearch={handleSearch}
        onAddClick={() => updateLocationsState({ showAddForm: true })}
      />

      {error ? (
        <div
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"
          style={{ marginBottom: "24px", marginTop: "24px" }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {showAddForm ? (
        <div style={{ marginBottom: "24px", marginTop: "24px" }}>
          <AddLocationForm
            formData={formData}
            onFormChange={handleFormChange}
            onSubmit={handleAddLocation}
            onCancel={handleCancelForm}
          />
        </div>
      ) : null}

      <div className="art-grid-3">{locationsContent}</div>
    </div>
  );
}

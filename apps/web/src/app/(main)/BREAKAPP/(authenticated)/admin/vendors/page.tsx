"use client";

/**
 * إدارة الموردين — Admin Vendors CRUD
 *
 * @description
 * تُتيح لمدير النظام عرض الموردين وإضافة/تعديل/حذف كل مورد
 * من جدول واحد، مع حقول: اسم، متنقّل، خط عرض، خط طول.
 *
 * السبب: الموردون مكوّن بياني ثقيل يُعاد استخدامه في كل
 * العمليات الميدانية، لذا يحتاج المسؤول CRUD كاملاً بسيطاً.
 */

import { api, type Vendor } from "@the-copy/breakapp";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface VendorFormState {
  name: string;
  is_mobile: boolean;
  lat: string;
  lng: string;
}

const EMPTY_FORM: VendorFormState = {
  name: "",
  is_mobile: false,
  lat: "",
  lng: "",
};

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<VendorFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchVendors = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await api.get<Vendor[]>("/admin/vendors");
      setVendors(response.data);
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب الموردين",
        description: axiosError.message ?? "تعذّر تحميل القائمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const resetForm = useCallback((): void => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }, []);

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((prev) => ({ ...prev, name: event.target.value }));
    },
    []
  );

  const handleMobileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((prev) => ({ ...prev, is_mobile: event.target.checked }));
    },
    []
  );

  const handleLatChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((prev) => ({ ...prev, lat: event.target.value }));
    },
    []
  );

  const handleLngChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((prev) => ({ ...prev, lng: event.target.value }));
    },
    []
  );

  const validateForm = useCallback((): {
    valid: boolean;
    lat: number;
    lng: number;
    name: string;
  } => {
    const name = form.name.trim();
    const lat = Number.parseFloat(form.lat);
    const lng = Number.parseFloat(form.lng);

    if (name.length < 2) {
      toast({
        title: "اسم غير صالح",
        description: "اسم المورد يجب أن يكون حرفين على الأقل",
        variant: "destructive",
      });
      return { valid: false, lat: 0, lng: 0, name };
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast({
        title: "خط عرض غير صالح",
        description: "يجب أن يقع خط العرض بين -90 و 90",
        variant: "destructive",
      });
      return { valid: false, lat: 0, lng: 0, name };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast({
        title: "خط طول غير صالح",
        description: "يجب أن يقع خط الطول بين -180 و 180",
        variant: "destructive",
      });
      return { valid: false, lat: 0, lng: 0, name };
    }
    return { valid: true, lat, lng, name };
  }, [form]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const validation = validateForm();
      if (!validation.valid) {
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          name: validation.name,
          is_mobile: form.is_mobile,
          lat: validation.lat,
          lng: validation.lng,
        };

        if (editingId) {
          await api.patch<Vendor>(`/admin/vendors/${editingId}`, payload);
          toast({ title: "تم التحديث", description: "تم تعديل بيانات المورد" });
        } else {
          await api.post<Vendor>("/admin/vendors", payload);
          toast({ title: "تمت الإضافة", description: "تم إنشاء المورد" });
        }

        resetForm();
        await fetchVendors();
      } catch (error: unknown) {
        const axiosError = error as { message?: string };
        toast({
          title: editingId ? "فشل التحديث" : "فشل الإضافة",
          description: axiosError.message ?? "حدث خطأ أثناء الحفظ",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [editingId, fetchVendors, form.is_mobile, resetForm, validateForm]
  );

  const handleEdit = useCallback((vendor: Vendor): void => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      is_mobile: Boolean(vendor.is_mobile),
      lat: vendor.fixed_location.lat.toString(),
      lng: vendor.fixed_location.lng.toString(),
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      const confirmed = window.confirm("هل تريد حذف هذا المورد نهائياً؟");
      if (!confirmed) {
        return;
      }
      try {
        await api.delete<{ success: boolean }>(`/admin/vendors/${id}`);
        toast({ title: "تم الحذف", description: "تم حذف المورد" });
        if (editingId === id) {
          resetForm();
        }
        await fetchVendors();
      } catch (error: unknown) {
        const axiosError = error as { message?: string };
        toast({
          title: "فشل الحذف",
          description: axiosError.message ?? "تعذّر حذف المورد",
          variant: "destructive",
        });
      }
    },
    [editingId, fetchVendors, resetForm]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              الموردون
            </h1>
            <p className="text-white/55 font-cairo">
              إدارة الموردين الثابتين والمتنقلين
            </p>
          </div>
          <Link
            href="/BREAKAPP/admin"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة
          </Link>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            {editingId ? "تعديل مورد" : "إضافة مورد"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="field-page-1"
                className="block text-sm font-medium text-white mb-2 font-cairo"
              >
                الاسم
              </label>
              <input
                id="field-page-1"
                type="text"
                value={form.name}
                onChange={handleNameChange}
                disabled={submitting}
                className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
                required
                minLength={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="field-page-2"
                  className="block text-sm font-medium text-white mb-2 font-cairo"
                >
                  خط العرض
                </label>
                <input
                  id="field-page-2"
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={handleLatChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="field-page-3"
                  className="block text-sm font-medium text-white mb-2 font-cairo"
                >
                  خط الطول
                </label>
                <input
                  id="field-page-3"
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={handleLngChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-white font-cairo">
              <input
                type="checkbox"
                checked={form.is_mobile}
                onChange={handleMobileChange}
                disabled={submitting}
                className="w-4 h-4 accent-white"
              />
              <span>مورد متنقّل</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
              >
                {submitting
                  ? "جارٍ الحفظ..."
                  : editingId
                    ? "تحديث المورد"
                    : "إضافة مورد"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="px-4 py-2 bg-white/6 text-white rounded-[22px] hover:bg-white/8 font-cairo transition"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </CardSpotlight>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            قائمة الموردين ({vendors.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              لا يوجد موردون بعد
            </p>
          ) : (
            <div className="space-y-3">
              {vendors.map((vendor: Vendor) => (
                <div
                  key={vendor.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white font-cairo">
                      {vendor.name}
                    </h3>
                    <p className="text-xs text-white/45 mt-1 font-cairo">
                      {vendor.is_mobile ? "متنقّل" : "ثابت"} •{" "}
                      {vendor.fixed_location.lat.toFixed(4)},{" "}
                      {vendor.fixed_location.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="px-4 py-2 text-sm bg-white/8 text-white rounded-[22px] hover:bg-white/12 font-cairo transition"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => void handleDelete(vendor.id)}
                      className="px-4 py-2 text-sm bg-white/6 text-white rounded-[22px] hover:bg-white/12 font-cairo transition border border-white/8"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardSpotlight>
      </div>
    </div>
  );
}

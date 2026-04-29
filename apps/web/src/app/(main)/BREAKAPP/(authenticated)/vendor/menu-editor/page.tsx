"use client";

/**
 * محرر قائمة المورد — Vendor Menu Editor
 *
 * @description
 * يُتيح للمورد إضافة/تعديل/حذف عناصر قائمة الطعام الخاصة به،
 * مع تبديل حالة التوفّر وإمكانية إدخال سعر اختياري.
 *
 * السبب: قائمة المورد هي المصدر الوحيد الذي يراه الطاقم،
 * لذا يحتاج المورد أداة CRUD مستقلة لا تتطلب تدخّل المسؤول.
 */

import { api, type MenuItem } from "@the-copy/breakapp";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface MenuFormState {
  name: string;
  description: string;
  price: string;
  available: boolean;
}

const EMPTY_FORM: MenuFormState = {
  name: "",
  description: "",
  price: "",
  available: true,
};

interface MenuPayload {
  name: string;
  available: boolean;
  description?: string;
  price?: number;
}

// ── Module-level helpers ──────────────────────────────────────────────────────

function buildPayload(form: MenuFormState): MenuPayload | null {
  const name = form.name.trim();
  if (name.length < 2) {
    toast({
      title: "اسم غير صالح",
      description: "اسم العنصر يجب أن يكون حرفين على الأقل",
      variant: "destructive",
    });
    return null;
  }
  const payload: MenuPayload = { name, available: form.available };
  const description = form.description.trim();
  if (description.length > 0) payload.description = description;
  const priceText = form.price.trim();
  if (priceText.length > 0) {
    const priceValue = Number.parseFloat(priceText);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast({
        title: "سعر غير صالح",
        description: "السعر يجب أن يكون رقماً موجباً",
        variant: "destructive",
      });
      return null;
    }
    payload.price = priceValue;
  }
  return payload;
}

async function submitMenuItemApi(
  form: MenuFormState,
  editingId: string | null
): Promise<boolean> {
  const payload = buildPayload(form);
  if (!payload) return false;
  if (editingId) {
    await api.patch<MenuItem>(`/vendor/menu-items/${editingId}`, payload);
    toast({ title: "تم التحديث", description: "تم تعديل العنصر" });
  } else {
    await api.post<MenuItem>("/vendor/menu-items", payload);
    toast({ title: "تمت الإضافة", description: "تم إنشاء العنصر" });
  }
  return true;
}

async function deleteMenuItemApi(
  id: string,
  editingId: string | null,
  resetForm: () => void,
  fetchItems: () => Promise<void>
): Promise<void> {
  const confirmed = window.confirm("هل تريد حذف هذا العنصر نهائياً؟");
  if (!confirmed) return;
  try {
    await api.delete<{ success: boolean }>(`/vendor/menu-items/${id}`);
    toast({ title: "تم الحذف", description: "تم حذف العنصر" });
    if (editingId === id) resetForm();
    await fetchItems();
  } catch (e: unknown) {
    toast({
      title: "فشل الحذف",
      description: (e as { message?: string }).message ?? "تعذّر حذف العنصر",
      variant: "destructive",
    });
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface MenuFormCardProps {
  form: MenuFormState;
  editingId: string | null;
  submitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPriceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAvailableChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

function MenuFormCard({
  form,
  editingId,
  submitting,
  onSubmit,
  onNameChange,
  onDescriptionChange,
  onPriceChange,
  onAvailableChange,
  onReset,
}: MenuFormCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        {editingId ? "تعديل عنصر" : "إضافة عنصر"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
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
            onChange={onNameChange}
            disabled={submitting}
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
            required
            minLength={2}
          />
        </div>
        <div>
          <label
            htmlFor="field-page-2"
            className="block text-sm font-medium text-white mb-2 font-cairo"
          >
            الوصف (اختياري)
          </label>
          <textarea
            id="field-page-2"
            value={form.description}
            onChange={onDescriptionChange}
            disabled={submitting}
            rows={3}
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="field-page-3"
            className="block text-sm font-medium text-white mb-2 font-cairo"
          >
            السعر (اختياري)
          </label>
          <input
            id="field-page-3"
            type="number"
            step="any"
            min={0}
            value={form.price}
            onChange={onPriceChange}
            disabled={submitting}
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
          />
        </div>
        <label className="flex items-center gap-2 text-white font-cairo">
          <input
            type="checkbox"
            checked={form.available}
            onChange={onAvailableChange}
            disabled={submitting}
            className="w-4 h-4 accent-white"
          />
          <span>متوفّر الآن</span>
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
                ? "تحديث العنصر"
                : "إضافة عنصر"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={onReset}
              disabled={submitting}
              className="px-4 py-2 bg-white/6 text-white rounded-[22px] hover:bg-white/8 font-cairo transition"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>
    </CardSpotlight>
  );
}

interface MenuItemsListCardProps {
  items: MenuItem[];
  loading: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (item: MenuItem) => void;
}

function MenuItemsListCard({
  items,
  loading,
  onEdit,
  onDelete,
  onToggleAvailable,
}: MenuItemsListCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
      <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
        عناصر القائمة ({items.length})
      </h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-white/55 text-center py-8 font-cairo">
          لا توجد عناصر بعد
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item: MenuItem) => (
            <div
              key={item.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-white font-cairo">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-sm text-white/55 mt-1 font-cairo">
                    {item.description}
                  </p>
                )}
                <p className="text-xs text-white/45 mt-1 font-cairo">
                  {item.available ? "متوفّر" : "غير متوفّر"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void onToggleAvailable(item)}
                  className="px-3 py-2 text-sm bg-white/6 text-white rounded-[22px] hover:bg-white/8 font-cairo transition"
                >
                  {item.available ? "إخفاء" : "إظهار"}
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className="px-3 py-2 text-sm bg-white/8 text-white rounded-[22px] hover:bg-white/12 font-cairo transition"
                >
                  تعديل
                </button>
                <button
                  onClick={() => void onDelete(item.id)}
                  className="px-3 py-2 text-sm bg-white/6 text-white rounded-[22px] hover:bg-white/12 font-cairo transition border border-white/8"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardSpotlight>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function VendorMenuEditorPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchItems = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get<MenuItem[]>("/vendor/menu-items");
      setItems(res.data);
    } catch (e: unknown) {
      toast({
        title: "خطأ في جلب القائمة",
        description:
          (e as { message?: string }).message ?? "تعذّر تحميل عناصر القائمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const resetForm = useCallback((): void => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }, []);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((p) => ({ ...p, name: e.target.value }));
    },
    []
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setForm((p) => ({ ...p, description: e.target.value }));
    },
    []
  );
  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((p) => ({ ...p, price: e.target.value }));
    },
    []
  );
  const handleAvailableChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((p) => ({ ...p, available: e.target.checked }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setSubmitting(true);
      try {
        const ok = await submitMenuItemApi(form, editingId);
        if (ok) {
          resetForm();
          await fetchItems();
        }
      } catch (e: unknown) {
        toast({
          title: editingId ? "فشل التحديث" : "فشل الإضافة",
          description:
            (e as { message?: string }).message ?? "حدث خطأ أثناء الحفظ",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [form, editingId, fetchItems, resetForm]
  );

  const handleEdit = useCallback((item: MenuItem): void => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: "",
      available: item.available,
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      await deleteMenuItemApi(id, editingId, resetForm, fetchItems);
    },
    [editingId, fetchItems, resetForm]
  );

  const handleToggleAvailable = useCallback(
    async (item: MenuItem): Promise<void> => {
      try {
        await api.patch<MenuItem>(`/vendor/menu-items/${item.id}`, {
          available: !item.available,
        });
        await fetchItems();
      } catch (e: unknown) {
        toast({
          title: "فشل التبديل",
          description:
            (e as { message?: string }).message ?? "تعذّر تحديث حالة التوفّر",
          variant: "destructive",
        });
      }
    },
    [fetchItems]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              محرر القائمة
            </h1>
            <p className="text-white/55 font-cairo">
              أضف وعدّل عناصر قائمة الطعام
            </p>
          </div>
          <Link
            href="/BREAKAPP/vendor/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            لوحة الطلبات
          </Link>
        </div>
        <MenuFormCard
          form={form}
          editingId={editingId}
          submitting={submitting}
          onSubmit={(e) => void handleSubmit(e)}
          onNameChange={handleNameChange}
          onDescriptionChange={handleDescriptionChange}
          onPriceChange={handlePriceChange}
          onAvailableChange={handleAvailableChange}
          onReset={resetForm}
        />
        <MenuItemsListCard
          items={items}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleAvailable={handleToggleAvailable}
        />
      </div>
    </div>
  );
}

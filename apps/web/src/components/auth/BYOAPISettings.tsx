"use client";

import { useState, useEffect } from "react";

import { logger } from "@/lib/ai/utils/logger";

/**
 * إعدادات BYO-API
 * Bring Your Own API Settings Component
 *
 * المبادئ:
 * 1. لا يتم إرسال مفاتيح API إلى السيرفر
 * 2. التخزين المحلي المشفر فقط
 * 3. الاتصال المباشر بمزود الخدمة
 */

import {
  saveAPIConfig,
  listAPIConfigs,
  deleteAPIConfig,
  testAPIConnection,
  type APIProviderConfig,
} from "@/lib/crypto";

export function BYOAPISettings() {
  const [providers, setProviders] = useState<
    Omit<APIProviderConfig, "apiKey">[]
  >([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    providerName: "",
    endpointUrl: "",
    apiKey: "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProviders().catch((err: unknown) => {
      logger.error("خطأ غير متوقع في تحميل المزودين:", err);
    });
  }, []);

  const loadProviders = async () => {
    try {
      const list = await listAPIConfigs();
      setProviders(list);
    } catch (err) {
      logger.error("خطأ في تحميل المزودين:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const config: APIProviderConfig = {
        id: Date.now().toString(),
        providerName: formData.providerName,
        endpointUrl: formData.endpointUrl,
        apiKey: formData.apiKey,
      };

      await saveAPIConfig(config);

      // إعادة تعيين النموذج
      setFormData({ providerName: "", endpointUrl: "", apiKey: "" });
      setIsAdding(false);
      await loadProviders();
    } catch (err) {
      logger.error("خطأ في الحفظ:", err);
      setError("فشل في حفظ الإعدادات");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const config: APIProviderConfig = {
        id: "test",
        providerName: formData.providerName,
        endpointUrl: formData.endpointUrl,
        apiKey: formData.apiKey,
      };

      const result = await testAPIConnection(config);
      setTestResult(result);
    } catch (err) {
      logger.error("خطأ في الاختبار:", err);
      setTestResult({
        success: false,
        message: "فشل في اختبار الاتصال",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المزود؟")) {
      return;
    }

    try {
      await deleteAPIConfig(id);
      await loadProviders();
    } catch (err) {
      logger.error("خطأ في الحذف:", err);
      setError("فشل في حذف المزود");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <h2 className="text-2xl font-bold mb-6">إعدادات BYO-API</h2>

      {/* تحذير أمني */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-4 mb-6">
        <h3 className="font-bold text-lg mb-2">⚠️ مهم: BYO-API</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>
            <strong>الفوترة:</strong> أنت المسؤول عن جميع التكاليف والفواتير في
            حسابك لدى مزود الخدمة
          </li>
          <li>
            <strong>الأمان:</strong> مفاتيح API تُخزن محلياً فقط على جهازك
            (مشفرة)
          </li>
          <li>
            <strong>الاتصال:</strong> الطلبات تذهب مباشرة من متصفحك إلى مزود
            الخدمة (لا تمر عبر خوادمنا)
          </li>
          <li>
            <strong>الخصوصية:</strong> لا نستطيع رؤية أو الوصول إلى مفاتيحك أو
            طلباتك
          </li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {/* قائمة المزودين الحاليين */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">المزودون المحفوظون</h3>
        {providers.length === 0 ? (
          <p className="text-gray-500">لا توجد إعدادات محفوظة</p>
        ) : (
          <div className="space-y-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 border border-gray-300 rounded"
              >
                <div>
                  <p className="font-medium">{provider.providerName}</p>
                  <p className="text-sm text-gray-600" dir="ltr">
                    {provider.endpointUrl}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* زر إضافة مزود جديد */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + إضافة مزود جديد
        </button>
      )}

      {/* نموذج إضافة مزود */}
      {isAdding && (
        <div className="border border-gray-300 rounded p-4">
          <h3 className="text-lg font-semibold mb-4">إضافة مزود API</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                اسم المزود
              </label>
              <input
                type="text"
                value={formData.providerName}
                onChange={(e) =>
                  setFormData({ ...formData, providerName: e.target.value })
                }
                required
                placeholder="مثال: Google Gemini, OpenAI, Groq"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                value={formData.endpointUrl}
                onChange={(e) =>
                  setFormData({ ...formData, endpointUrl: e.target.value })
                }
                required
                placeholder="https://api.example.com/v1/chat"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                required
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded ${
                  testResult.success
                    ? "bg-green-50 border border-green-300 text-green-700"
                    : "bg-red-50 border border-red-300 text-red-700"
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="flex-1 py-2 px-4 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
              >
                {testing ? "جارٍ الاختبار..." : "اختبار الاتصال"}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({
                    providerName: "",
                    endpointUrl: "",
                    apiKey: "",
                  });
                  setTestResult(null);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded hover:bg-gray-100"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

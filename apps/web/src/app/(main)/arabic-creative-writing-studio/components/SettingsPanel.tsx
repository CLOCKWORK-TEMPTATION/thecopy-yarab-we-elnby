// SettingsPanel.tsx
// لوحة إعدادات التطبيق

"use client";

import React, { useState, useCallback } from "react";

import { AppSettings } from "@/app/(main)/arabic-creative-writing-studio/types";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsUpdate: (newSettings: Partial<AppSettings>) => void;
  onTestConnection: () => Promise<void>;
}

interface GeminiApiCardProps {
  tempSettings: AppSettings;
  isTestingConnection: boolean;
  showApiKey: boolean;
  onToggleShowApiKey: () => void;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
  onTestConnection: () => void;
}

function GeminiApiCard({
  tempSettings,
  isTestingConnection,
  showApiKey,
  onToggleShowApiKey,
  onUpdateSetting,
  onTestConnection,
}: GeminiApiCardProps) {
  return (
    <CardSpotlight className="rounded-[22px]">
      <CardHeader>
        <CardTitle className="text-white">🤖 إعدادات Gemini API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="api-key">🔑 مفتاح API</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showApiKey ? "text" : "password"}
              value={tempSettings.geminiApiKey ?? ""}
              onChange={(e) => onUpdateSetting("geminiApiKey", e.target.value)}
              placeholder="أدخل مفتاح Gemini API هنا..."
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2"
              onClick={onToggleShowApiKey}
            >
              {showApiKey ? "👁️" : "👁️‍🗨️"}
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="model-select">🧠 النموذج</Label>
          <Select
            value={tempSettings.geminiModel}
            onValueChange={(value) => onUpdateSetting("geminiModel", value)}
          >
            <SelectTrigger id="model-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
              <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>🌡️ درجة الحرارة: {tempSettings.geminiTemperature}</Label>
          <Slider
            value={[tempSettings.geminiTemperature]}
            onValueChange={(value) =>
              onUpdateSetting("geminiTemperature", value[0] ?? 0.7)
            }
            max={2}
            min={0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/45 mt-1">
            <span>محافظ (0.0)</span>
            <span>متوازن (1.0)</span>
            <span>إبداعي (2.0)</span>
          </div>
        </div>
        <div>
          <Label>📏 أقصى عدد رموز: {tempSettings.geminiMaxTokens}</Label>
          <Slider
            value={[tempSettings.geminiMaxTokens]}
            onValueChange={(value) =>
              onUpdateSetting("geminiMaxTokens", value[0] ?? 8192)
            }
            max={32768}
            min={1024}
            step={1024}
            className="w-full"
          />
          <div className="text-xs text-white/45 mt-1">1K - 32K رمز</div>
        </div>
        <Button
          onClick={onTestConnection}
          disabled={isTestingConnection || !tempSettings.geminiApiKey}
          className="w-full"
        >
          {isTestingConnection ? "🔄 جاري الاختبار..." : "🧪 اختبار الاتصال"}
        </Button>
        <div className="mt-6 p-4 bg-white/[0.04] backdrop-blur-2xl border border-white/8 rounded-[22px]">
          <h4 className="font-semibold text-white mb-2">
            📋 دليل الإعداد السريع:
          </h4>
          <ol className="text-sm text-white/68 space-y-1">
            <li>
              1. قم بزيارة{" "}
              <a
                href="https://ai.google.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ai.google.dev
              </a>
            </li>
            <li>2. اضغط على &quot;Get API Key&quot;</li>
            <li>3. أنشئ مفتاح API جديد</li>
            <li>4. انسخ والصق المفتاح أعلاه</li>
            <li>5. اضغط &quot;اختبار الاتصال&quot; للتأكد</li>
          </ol>
        </div>
      </CardContent>
    </CardSpotlight>
  );
}

interface InterfaceCardProps {
  tempSettings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
}

function InterfaceCard({ tempSettings, onUpdateSetting }: InterfaceCardProps) {
  return (
    <CardSpotlight className="rounded-[22px]">
      <CardHeader>
        <CardTitle className="text-white">🎨 إعدادات الواجهة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="language-select">🌍 اللغة</Label>
          <Select
            value={tempSettings.language}
            onValueChange={(value) =>
              onUpdateSetting("language", value as "ar" | "en")
            }
          >
            <SelectTrigger id="language-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-white/68 mb-2">
            🌙 المظهر
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "auto"] as const).map((theme) => (
              <Button
                key={theme}
                variant={tempSettings.theme === theme ? "default" : "outline"}
                onClick={() => onUpdateSetting("theme", theme)}
                className="px-3 py-2"
              >
                {theme === "light"
                  ? "☀️ فاتح"
                  : theme === "dark"
                    ? "🌙 داكن"
                    : "🔄 تلقائي"}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-white/68 mb-2">
            📝 حجم الخط
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(["small", "medium", "large"] as const).map((size) => (
              <Button
                key={size}
                variant={tempSettings.fontSize === size ? "default" : "outline"}
                onClick={() => onUpdateSetting("fontSize", size)}
                className="px-3 py-2"
              >
                {size === "small"
                  ? "صغير"
                  : size === "medium"
                    ? "متوسط"
                    : "كبير"}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-white/68 mb-2">
            ↔️ اتجاه النص
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["rtl", "ltr"] as const).map((direction) => (
              <Button
                key={direction}
                variant={
                  tempSettings.textDirection === direction
                    ? "default"
                    : "outline"
                }
                onClick={() => onUpdateSetting("textDirection", direction)}
                className="px-3 py-2"
              >
                {direction === "rtl" ? "⬅️ من اليمين" : "➡️ من اليسار"}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </CardSpotlight>
  );
}

interface SaveCardProps {
  tempSettings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
}

function SaveCard({ tempSettings, onUpdateSetting }: SaveCardProps) {
  return (
    <CardSpotlight className="rounded-[22px]">
      <CardHeader>
        <CardTitle className="text-white">💾 إعدادات الحفظ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-white/68">
              الحفظ التلقائي
            </Label>
            <p className="text-xs text-white/45">
              حفظ تلقائي للمشاريع أثناء الكتابة
            </p>
          </div>
          <Switch
            checked={tempSettings.autoSave}
            onCheckedChange={(checked) => onUpdateSetting("autoSave", checked)}
          />
        </div>
        {tempSettings.autoSave && (
          <div>
            <Label>
              فترة الحفظ: {tempSettings.autoSaveInterval / 1000} ثانية
            </Label>
            <Slider
              value={[tempSettings.autoSaveInterval]}
              onValueChange={(value) =>
                onUpdateSetting("autoSaveInterval", value[0] ?? 30000)
              }
              max={300000}
              min={10000}
              step={10000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/45 mt-1">
              <span>10 ثوان</span>
              <span>5 دقائق</span>
            </div>
          </div>
        )}
      </CardContent>
    </CardSpotlight>
  );
}

interface SystemInfoCardProps {
  tempSettings: AppSettings;
}

function SystemInfoCard({ tempSettings }: SystemInfoCardProps) {
  return (
    <CardSpotlight className="rounded-[22px]">
      <CardHeader>
        <CardTitle className="text-white">ℹ️ معلومات النظام</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/55">إصدار التطبيق:</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/55">نموذج الذكاء الاصطناعي:</span>
            <span className="font-medium">{tempSettings.geminiModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/55">حالة API:</span>
            <span
              className={`font-medium ${tempSettings.geminiApiKey ? "text-green-600" : "text-red-600"}`}
            >
              {tempSettings.geminiApiKey ? "✅ متصل" : "❌ غير متصل"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/55">اللغة:</span>
            <span className="font-medium">
              {tempSettings.language === "ar" ? "العربية" : "English"}
            </span>
          </div>
        </div>
      </CardContent>
    </CardSpotlight>
  );
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsUpdate,
  onTestConnection,
}) => {
  const [isTestingConnection, setIsTestingConnection] =
    useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);

  const handleTestConnection = useCallback(async () => {
    if (!tempSettings.geminiApiKey) {
      alert("يرجى إدخال مفتاح API أولاً");
      return;
    }
    setIsTestingConnection(true);
    try {
      await onTestConnection();
    } finally {
      setIsTestingConnection(false);
    }
  }, [tempSettings.geminiApiKey, onTestConnection]);

  const handleSaveSettings = useCallback(() => {
    onSettingsUpdate(tempSettings);
  }, [tempSettings, onSettingsUpdate]);

  const updateTempSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setTempSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-8">⚙️ إعدادات التطبيق</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GeminiApiCard
          tempSettings={tempSettings}
          isTestingConnection={isTestingConnection}
          showApiKey={showApiKey}
          onToggleShowApiKey={() => setShowApiKey((v) => !v)}
          onUpdateSetting={updateTempSetting}
          onTestConnection={() => {
            void handleTestConnection();
          }}
        />
        <InterfaceCard
          tempSettings={tempSettings}
          onUpdateSetting={updateTempSetting}
        />
        <SaveCard
          tempSettings={tempSettings}
          onUpdateSetting={updateTempSetting}
        />
        <SystemInfoCard tempSettings={tempSettings} />
      </div>
      <div className="flex justify-end space-x-4 space-x-reverse mt-8">
        <Button onClick={() => setTempSettings(settings)} variant="outline">
          ↩️ إلغاء التغييرات
        </Button>
        <Button onClick={handleSaveSettings}>💾 حفظ الإعدادات</Button>
      </div>
    </div>
  );
};

export default SettingsPanel;

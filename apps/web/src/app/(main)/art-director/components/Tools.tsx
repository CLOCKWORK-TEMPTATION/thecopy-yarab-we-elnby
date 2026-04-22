"use client";

/**
 * الصفحة: art-director / Tools
 * الهوية: مساحة أدوات داخلية بطابع داكن زجاجي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import { Play, Loader2 } from "lucide-react";
import { toolConfigs, type ToolId, type ToolInput } from "../core/toolConfigs";
import { usePlugins } from "../hooks/usePlugins";
import type { PluginInfo, ApiResponse } from "../types";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

type FormData = Record<string, string>;

interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
}

interface InputFieldProps {
  input: ToolInput;
  value: string;
  onChange: (name: string, value: string) => void;
}

function InputField({ input, value, onChange }: InputFieldProps) {
  const handleChange = useCallback(
    (
      e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      onChange(input.name, e.target.value);
    },
    [input.name, onChange]
  );

  if (input.type === "select" && input.options) {
    return (
      <select
        className="art-input"
        value={value}
        onChange={handleChange}
        aria-label={input.label}
      >
        <option value="">اختر...</option>
        {input.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (input.type === "textarea") {
    return (
      <textarea
        className="art-input"
        placeholder={input.placeholder}
        value={value}
        onChange={handleChange}
        rows={4}
        style={{ resize: "none" }}
        aria-label={input.label}
      />
    );
  }

  return (
    <input
      type={input.type}
      className="art-input"
      placeholder={input.placeholder}
      value={value}
      onChange={handleChange}
      aria-label={input.label}
    />
  );
}

interface FormFieldsProps {
  inputs: ToolInput[];
  formData: FormData;
  onFieldChange: (name: string, value: string) => void;
}

function FormFields({ inputs, formData, onFieldChange }: FormFieldsProps) {
  return (
    <>
      {inputs.map((input) => (
        <div
          key={input.name}
          className={`art-form-group ${input.type === "textarea" ? "full-width" : ""}`}
        >
          <label>{input.label}</label>
          <InputField
            input={input}
            value={formData[input.name] ?? ""}
            onChange={onFieldChange}
          />
        </div>
      ))}
    </>
  );
}

interface CSSPropertiesWithVars extends React.CSSProperties {
  "--tool-color"?: string;
}

interface ToolItemProps {
  plugin: PluginInfo;
  isActive: boolean;
  onClick: () => void;
}

function ToolItem({ plugin, isActive, onClick }: ToolItemProps) {
  const config = toolConfigs[plugin.id as ToolId];
  const Icon = config?.icon ?? Play;
  const color = config?.color ?? "#e94560";

  const buttonStyle: CSSPropertiesWithVars = {
    "--tool-color": color,
  };

  return (
    <button
      className={`art-tool-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      style={buttonStyle}
      aria-current={isActive ? "true" : undefined}
      type="button"
    >
      <Icon size={20} style={{ color }} aria-hidden="true" />
      <div className="art-tool-info">
        <span className="art-tool-name-ar">{plugin.nameAr}</span>
        <span className="art-tool-category">{plugin.category}</span>
      </div>
    </button>
  );
}

interface ToolsSidebarProps {
  plugins: PluginInfo[];
  selectedTool: ToolId | null;
  onToolSelect: (toolId: ToolId) => void;
}

function ToolsSidebar({
  plugins,
  selectedTool,
  onToolSelect,
}: ToolsSidebarProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <aside
        className="art-tools-sidebar"
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        <h3>الأدوات المتاحة ({plugins.length})</h3>
        <div
          className="art-tools-list"
          role="listbox"
          aria-label="قائمة الأدوات"
        >
          {plugins.map((plugin) => (
            <ToolItem
              key={plugin.id}
              plugin={plugin}
              isActive={selectedTool === plugin.id}
              onClick={() => onToolSelect(plugin.id as ToolId)}
            />
          ))}
        </div>
      </aside>
    </CardSpotlight>
  );
}

function NoToolSelected() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
      <div className="art-no-tool-selected" style={{ height: "320px" }}>
        <Play size={64} aria-hidden="true" />
        <h2>اختر أداة للبدء</h2>
        <p>اختر أداة من القائمة الجانبية لتشغيلها</p>
      </div>
    </CardSpotlight>
  );
}

interface ExecutionResultProps {
  result: ExecutionResult;
}

function ExecutionResultDisplay({ result }: ExecutionResultProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div
        className="art-result-card"
        style={{ animation: "fadeIn 0.3s ease-in-out", marginTop: 0 }}
      >
        <h3>النتيجة</h3>
        <div
          className={`art-result-status ${result.success ? "success" : "error"}`}
        >
          {result.success ? "تم بنجاح" : "حدث خطأ"}
        </div>
        <pre className="art-result-json">{JSON.stringify(result, null, 2)}</pre>
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
      style={{ marginTop: "12px" }}
      role="alert"
    >
      {message}
    </div>
  );
}

interface ToolWorkspaceProps {
  selectedTool: ToolId;
  plugin: PluginInfo;
  formData: FormData;
  result: ExecutionResult | null;
  loading: boolean;
  error: string | null;
  onFieldChange: (name: string, value: string) => void;
  onExecute: () => void;
}

function ToolWorkspace({
  selectedTool,
  plugin,
  formData,
  result,
  loading,
  error,
  onFieldChange,
  onExecute,
}: ToolWorkspaceProps) {
  const config = toolConfigs[selectedTool];

  if (!config) {
    return <NoToolSelected />;
  }

  const Icon = config.icon;

  return (
    <div className="art-tool-workspace space-y-6">
      <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
        <div
          className="art-tool-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: 0,
          }}
        >
          <Icon size={32} style={{ color: config.color }} aria-hidden="true" />
          <div>
            <h2 style={{ margin: 0 }}>{plugin.nameAr}</h2>
            <p style={{ color: "var(--art-text-muted)", margin: 0 }}>
              {plugin.name}
            </p>
          </div>
        </div>
      </CardSpotlight>

      <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
        <div className="art-tool-form" style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: "16px" }}>المدخلات</h3>
          <div className="art-form-grid">
            <FormFields
              inputs={config.inputs}
              formData={formData}
              onFieldChange={onFieldChange}
            />
          </div>
          <button
            className="art-btn art-execute-btn"
            onClick={onExecute}
            disabled={loading}
            type="button"
            style={{ marginTop: "16px" }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="art-spinner" aria-hidden="true" />
                جاري التنفيذ...
              </>
            ) : (
              <>
                <Play size={18} aria-hidden="true" />
                تنفيذ
              </>
            )}
          </button>

          {error ? <ErrorAlert message={error} /> : null}
        </div>
      </CardSpotlight>

      {result ? <ExecutionResultDisplay result={result} /> : null}
    </div>
  );
}

export default function Tools() {
  const { plugins, error: pluginsError } = usePlugins();
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleToolSelect = useCallback((toolId: ToolId) => {
    setSelectedTool(toolId);
    setFormData({});
    setResult(null);
    setError(null);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!selectedTool) return;

    const config = toolConfigs[selectedTool];
    if (!config) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse<Record<string, unknown>> = await response.json();

      const nextResult: ExecutionResult = {
        success: data.success ?? response.ok,
      };
      if (data.data) {
        nextResult.data = data.data;
      }
      if (data.error) {
        nextResult.error = data.error;
      }

      setResult(nextResult);

      if (!response.ok || data.success === false) {
        setError(data.error ?? "فشل تنفيذ الأداة");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر الاتصال بالخادم الرئيسي";
      setError(errorMessage);
      setResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTool, formData]);

  const selectedPlugin = useMemo(
    () => (selectedTool ? plugins.find((p) => p.id === selectedTool) : null),
    [selectedTool, plugins]
  );

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <Play size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>جميع الأدوات</h1>
          <p>تشغيل واختبار أدوات CineArchitect</p>
        </div>
      </header>

      {pluginsError ? <ErrorAlert message={pluginsError} /> : null}

      <div className="art-tools-layout">
        <ToolsSidebar
          plugins={plugins}
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
        />

        <main>
          {!selectedTool || !selectedPlugin ? (
            <NoToolSelected />
          ) : (
            <ToolWorkspace
              selectedTool={selectedTool}
              plugin={selectedPlugin}
              formData={formData}
              result={result}
              loading={loading}
              error={error}
              onFieldChange={handleFieldChange}
              onExecute={handleExecute}
            />
          )}
        </main>
      </div>
    </div>
  );
}

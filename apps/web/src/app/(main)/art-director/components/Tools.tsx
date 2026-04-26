"use client";

/**
 * الصفحة: art-director / Tools
 * الهوية: مساحة أدوات داخلية بطابع داكن زجاجي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import {
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  ListChecks,
} from "lucide-react";
import { useState, useCallback, useMemo, type ChangeEvent } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { toolConfigs, type ToolId, type ToolInput } from "../core/toolConfigs";
import {
  useArtDirectorPersistence,
  type ArtDirectorExecutionResult,
} from "../hooks/useArtDirectorPersistence";
import { usePlugins } from "../hooks/usePlugins";
import { fetchArtDirectorJson } from "../lib/api-client";

import type { PluginInfo, ApiResponse } from "../types";

type FormData = Record<string, string>;

type ExecutionResult = ArtDirectorExecutionResult;

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
  const config = toolConfigs[plugin.id];
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
              onClick={() => onToolSelect(plugin.id)}
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
  selectedTool: ToolId;
  result: ExecutionResult;
}

interface VisualIssue {
  type: string;
  severity: "low" | "medium" | "high";
  description?: string;
  descriptionAr?: string;
  location?: string;
  suggestion?: string;
}

interface VisualAnalysisData {
  consistent: boolean;
  score: number;
  issues: VisualIssue[];
  suggestions: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVisualIssue(value: unknown): value is VisualIssue {
  if (!isRecord(value)) return false;

  return (
    typeof value["type"] === "string" &&
    (value["severity"] === "low" ||
      value["severity"] === "medium" ||
      value["severity"] === "high")
  );
}

function isVisualAnalysisData(value: unknown): value is VisualAnalysisData {
  if (!isRecord(value)) return false;

  return (
    typeof value["consistent"] === "boolean" &&
    typeof value["score"] === "number" &&
    Array.isArray(value["issues"]) &&
    value["issues"].every(isVisualIssue) &&
    Array.isArray(value["suggestions"]) &&
    value["suggestions"].every((item) => typeof item === "string")
  );
}

function SeverityBadge({ severity }: { severity: VisualIssue["severity"] }) {
  const label =
    severity === "high" ? "مرتفع" : severity === "medium" ? "متوسط" : "منخفض";

  return <span className={`art-severity-badge ${severity}`}>{label}</span>;
}

function VisualConsistencyResult({ data }: { data: VisualAnalysisData }) {
  return (
    <div className="art-visual-result">
      <div className="art-result-metrics">
        <div className="art-result-metric">
          <Gauge size={20} aria-hidden="true" />
          <span>درجة الاتساق</span>
          <strong>{data.score}%</strong>
        </div>
        <div className="art-result-metric">
          {data.consistent ? (
            <CheckCircle2 size={20} aria-hidden="true" />
          ) : (
            <AlertTriangle size={20} aria-hidden="true" />
          )}
          <span>حالة التناسق</span>
          <strong>{data.consistent ? "متسق" : "يحتاج مراجعة"}</strong>
        </div>
      </div>

      <section className="art-result-section">
        <h4>
          <ListChecks size={18} aria-hidden="true" />
          مشاكل مكتشفة
        </h4>
        {data.issues.length === 0 ? (
          <p className="art-result-empty">لم تظهر مشاكل مؤثرة في العينة.</p>
        ) : (
          <div className="art-result-issues">
            {data.issues.map((issue, index) => (
              <article key={`${issue.type}-${index}`} className="art-issue">
                <div className="art-issue-header">
                  <SeverityBadge severity={issue.severity} />
                  <span>{issue.location ?? "موضع غير محدد"}</span>
                </div>
                <p>{issue.descriptionAr ?? issue.description}</p>
                {issue.suggestion ? <small>{issue.suggestion}</small> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {data.suggestions.length > 0 ? (
        <section className="art-result-section">
          <h4>التوصيات</h4>
          <ul className="art-result-list">
            {data.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function GenericResultData({ data }: { data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <p className="art-result-empty">
        اكتمل التنفيذ دون بيانات إضافية من الخادم.
      </p>
    );
  }

  return (
    <details className="art-result-details" open>
      <summary>تفاصيل النتيجة</summary>
      <pre className="art-result-json">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

function ExecutionResultDisplay({
  selectedTool,
  result,
}: ExecutionResultProps) {
  const data = result.data;
  const isVisualResult =
    selectedTool === "visual-analyzer" && isVisualAnalysisData(data);

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
          {result.success ? "نجح التنفيذ" : "فشل التنفيذ"}
        </div>
        {!result.success && result.error ? (
          <p className="art-result-error">{result.error}</p>
        ) : null}
        {isVisualResult ? (
          <VisualConsistencyResult data={data} />
        ) : data === undefined ? (
          <GenericResultData />
        ) : (
          <GenericResultData data={data} />
        )}
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

      {result ? (
        <ExecutionResultDisplay selectedTool={selectedTool} result={result} />
      ) : null}
    </div>
  );
}

function normalizeToolEndpoint(endpoint: string): string {
  return endpoint.replace(/^\/api\/art-director/, "") || "/";
}

export default function Tools() {
  const { plugins, error: pluginsError } = usePlugins();
  const { state, updateToolsState } = useArtDirectorPersistence();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedTool = useMemo<ToolId | null>(() => {
    const toolId = state.tools.selectedTool;
    return toolId && toolId in toolConfigs ? (toolId) : null;
  }, [state.tools.selectedTool]);

  const formData = useMemo<FormData>(
    () => (selectedTool ? (state.tools.formsByTool[selectedTool] ?? {}) : {}),
    [selectedTool, state.tools.formsByTool]
  );

  const result = useMemo<ExecutionResult | null>(
    () =>
      selectedTool ? (state.tools.resultsByTool[selectedTool] ?? null) : null,
    [selectedTool, state.tools.resultsByTool]
  );

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      if (!selectedTool) return;

      updateToolsState((current) => ({
        ...current,
        formsByTool: {
          ...current.formsByTool,
          [selectedTool]: {
            ...(current.formsByTool[selectedTool] ?? {}),
            [name]: value,
          },
        },
      }));
    },
    [selectedTool, updateToolsState]
  );

  const handleToolSelect = useCallback(
    (toolId: ToolId) => {
      updateToolsState((current) => ({
        ...current,
        selectedTool: toolId,
      }));
      setError(null);
    },
    [updateToolsState]
  );

  const handleExecute = useCallback(async () => {
    if (!selectedTool) return;

    const config = toolConfigs[selectedTool];
    if (!config) return;

    setLoading(true);
    setError(null);
    updateToolsState((current) => ({
      ...current,
      resultsByTool: {
        ...current.resultsByTool,
        [selectedTool]: null,
      },
    }));

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<Record<string, unknown>>
      >(normalizeToolEndpoint(config.endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const nextResult: ExecutionResult = {
        success: data.success,
      };
      if (data.data) {
        nextResult.data = data.data;
      }
      if (data.error) {
        nextResult.error = data.error;
      }

      updateToolsState((current) => ({
        ...current,
        resultsByTool: {
          ...current.resultsByTool,
          [selectedTool]: nextResult,
        },
      }));

      if (data.success === false) {
        setError(data.error ?? "فشل تنفيذ الأداة");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر الاتصال بالخادم الرئيسي";
      setError(errorMessage);
      const nextResult: ExecutionResult = {
        success: false,
        error: errorMessage,
      };
      updateToolsState((current) => ({
        ...current,
        resultsByTool: {
          ...current.resultsByTool,
          [selectedTool]: nextResult,
        },
      }));
    } finally {
      setLoading(false);
    }
  }, [formData, selectedTool, updateToolsState]);

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

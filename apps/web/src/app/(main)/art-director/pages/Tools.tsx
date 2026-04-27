import { Play, Loader2 } from "lucide-react";
import { useState, useEffect, type CSSProperties } from "react";

import {
  toolConfigs,
  ToolId,
  ToolInput,
  ToolInputOption,
} from "../core/toolConfigs";
import "./Tools.css";
import { artDirectorApiPath } from "../lib/api-client";

interface Plugin {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  version: string;
}

function Tools() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    [key: string]: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(artDirectorApiPath("/plugins"))
      .then((res) => res.json())
      .then((data) => setPlugins(data.plugins ?? []))
      .catch(console.error);
  }, []);

  const handleExecute = async () => {
    if (!selectedTool) return;

    const config = toolConfigs[selectedTool];
    if (!config) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        config.endpoint.startsWith("/api/")
          ? artDirectorApiPath(config.endpoint.replace(/^\/api/, ""))
          : config.endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        [key: string]: unknown;
      };
      setResult(data);
    } catch {
      setResult({ success: false, error: "حدث خطأ في الاتصال" });
    }
    setLoading(false);
  };

  const renderInput = (input: ToolInput) => {
    if (input.type === "select") {
      return (
        <select
          className="input"
          value={formData[input.name] ?? ""}
          onChange={(e) =>
            setFormData({ ...formData, [input.name]: e.target.value })
          }
        >
          <option value="">اختر...</option>
          {input.options?.map((opt: ToolInputOption) => (
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
          className="input"
          placeholder={input.placeholder}
          value={formData[input.name] ?? ""}
          onChange={(e) =>
            setFormData({ ...formData, [input.name]: e.target.value })
          }
        />
      );
    }
    return (
      <input
        type={input.type}
        className="input"
        placeholder={input.placeholder}
        value={formData[input.name] ?? ""}
        onChange={(e) =>
          setFormData({ ...formData, [input.name]: e.target.value })
        }
      />
    );
  };

  return (
    <div className="tools-page fade-in">
      <header className="page-header">
        <Play size={32} className="header-icon" />
        <div>
          <h1>جميع الأدوات</h1>
          <p>تشغيل واختبار جميع أدوات CineArchitect الـ 16</p>
        </div>
      </header>

      <div className="tools-layout">
        <aside className="tools-sidebar">
          <h3>الأدوات المتاحة ({plugins.length})</h3>
          <div className="tools-list">
            {plugins.map((plugin) => {
              const config = toolConfigs[plugin.id];
              const Icon = config?.icon ?? Play;
              const color = config?.color ?? "#e94560";

              return (
                <button
                  key={plugin.id}
                  className={`tool-item ${selectedTool === plugin.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedTool(plugin.id);
                    setFormData({});
                    setResult(null);
                  }}
                  style={{ "--tool-color": color } as CSSProperties}
                >
                  <Icon size={20} style={{ color }} />
                  <div className="tool-info">
                    <span className="tool-name-ar">{plugin.nameAr}</span>
                    <span className="tool-category">{plugin.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="tools-main">
          {!selectedTool ? (
            <div className="no-tool-selected">
              <Play size={64} />
              <h2>اختر أداة للبدء</h2>
              <p>اختر أداة من القائمة الجانبية لتشغيلها</p>
            </div>
          ) : (
            <div className="tool-workspace">
              <div className="tool-header">
                {(() => {
                  const plugin = plugins.find((p) => p.id === selectedTool);
                  const config = toolConfigs[selectedTool];
                  const Icon = config?.icon ?? Play;
                  return (
                    <>
                      <Icon size={32} style={{ color: config?.color }} />
                      <div>
                        <h2>{plugin?.nameAr}</h2>
                        <p>{plugin?.name}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="tool-form card">
                <h3>المدخلات</h3>
                <div className="form-grid">
                  {toolConfigs[selectedTool]?.inputs.map((input) => (
                    <div key={input.name} className="form-group">
                      <label>{input.label}</label>
                      {renderInput(input)}
                    </div>
                  ))}
                </div>
                <button
                  className="btn execute-btn"
                  onClick={handleExecute}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      جاري التنفيذ...
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      تنفيذ
                    </>
                  )}
                </button>
              </div>

              {result && (
                <div className="tool-result card fade-in">
                  <h3>النتيجة</h3>
                  <div
                    className={`result-status ${result.success ? "success" : "error"}`}
                  >
                    {result.success ? "تم بنجاح" : "حدث خطأ"}
                  </div>
                  <pre className="result-json">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Tools;

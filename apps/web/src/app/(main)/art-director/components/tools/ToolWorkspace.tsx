"use client";

import { Play, Loader2 } from "lucide-react";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toolConfigs } from "../../core/toolConfigs";
import { FormFields } from "./FormFields";
import { ErrorAlert } from "./ErrorAlert";
import { NoToolSelected } from "./NoToolSelected";
import { ExecutionResultDisplay } from "./ResultComponents";
import type { ToolWorkspaceProps } from "./types";

export function ToolWorkspace({
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

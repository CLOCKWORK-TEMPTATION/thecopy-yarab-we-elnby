"use client";

/**
 * الصفحة: art-director / Tools
 * الهوية: مساحة أدوات داخلية بطابع داكن زجاجي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Play } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import { toolConfigs, type ToolId } from "../core/toolConfigs";
import { useArtDirectorPersistence } from "../hooks/useArtDirectorPersistence";
import { usePlugins } from "../hooks/usePlugins";
import { fetchArtDirectorJson } from "../lib/api-client";

import {
  ToolsSidebar,
  ToolWorkspace,
  NoToolSelected,
  ErrorAlert,
  type FormData,
  type ExecutionResult,
} from "./tools";

import type { ApiResponse } from "../types";

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
    return toolId && toolId in toolConfigs ? toolId : null;
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

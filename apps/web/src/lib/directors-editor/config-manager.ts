import { z } from "zod";

/**
 * مدير إعدادات الربط بين استوديو المخرج والمحرر.
 * الهدف: توحيد مفاتيح query params في مكان واحد بدل نشرها في عدة ملفات.
 */
const DirectorsEditorConfigSchema = z.object({
  projectQueryParam: z.string().trim().min(1),
  sourceQueryParam: z.string().trim().min(1),
  sourceValue: z.string().trim().min(1),
  importIntentQueryParam: z.string().trim().min(1),
  importIntentValue: z.string().trim().min(1),
});

export interface DirectorsEditorRuntimeConfig {
  projectQueryParam: string;
  sourceQueryParam: string;
  sourceValue: string;
  importIntentQueryParam: string;
  importIntentValue: string;
}

const DEFAULT_CONFIG: DirectorsEditorRuntimeConfig = {
  projectQueryParam: "projectId",
  sourceQueryParam: "source",
  sourceValue: "directors-studio",
  importIntentQueryParam: "intent",
  importIntentValue: "import",
};

export class DirectorsEditorConfigManager {
  private static cachedConfig: DirectorsEditorRuntimeConfig | null = null;

  static getConfig(): DirectorsEditorRuntimeConfig {
    if (DirectorsEditorConfigManager.cachedConfig) {
      return DirectorsEditorConfigManager.cachedConfig;
    }

    const candidateConfig: DirectorsEditorRuntimeConfig = {
      projectQueryParam:
        process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_PROJECT_QUERY_PARAM"] ??
        DEFAULT_CONFIG.projectQueryParam,
      sourceQueryParam:
        process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_QUERY_PARAM"] ??
        DEFAULT_CONFIG.sourceQueryParam,
      sourceValue:
        process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_SOURCE_VALUE"] ??
        DEFAULT_CONFIG.sourceValue,
      importIntentQueryParam:
        process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_IMPORT_INTENT_QUERY_PARAM"] ??
        DEFAULT_CONFIG.importIntentQueryParam,
      importIntentValue:
        process.env["NEXT_PUBLIC_DIRECTORS_EDITOR_IMPORT_INTENT_VALUE"] ??
        DEFAULT_CONFIG.importIntentValue,
    };

    const parsedConfig = DirectorsEditorConfigSchema.safeParse(candidateConfig);
    DirectorsEditorConfigManager.cachedConfig = parsedConfig.success
      ? parsedConfig.data
      : DEFAULT_CONFIG;

    return DirectorsEditorConfigManager.cachedConfig;
  }

  static buildEditorUrl(
    projectId: string,
    options?: { importIntent?: boolean }
  ): string {
    const config = DirectorsEditorConfigManager.getConfig();
    const params = new URLSearchParams({
      [config.projectQueryParam]: projectId,
      [config.sourceQueryParam]: config.sourceValue,
    });

    if (options?.importIntent) {
      params.set(config.importIntentQueryParam, config.importIntentValue);
    }

    return `/editor?${params.toString()}`;
  }

  static resetForTests(): void {
    DirectorsEditorConfigManager.cachedConfig = null;
  }
}

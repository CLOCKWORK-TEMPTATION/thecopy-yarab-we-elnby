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
    options?: { importIntent?: boolean; sceneId?: string; shotId?: string }
  ): string {
    const config = DirectorsEditorConfigManager.getConfig();
    const params = new URLSearchParams({
      [config.projectQueryParam]: projectId,
      [config.sourceQueryParam]: config.sourceValue,
    });

    if (options?.importIntent) {
      params.set(config.importIntentQueryParam, config.importIntentValue);
    }

    // إصلاح P0-7: تمرير sceneId/shotId إلى المحرر ليفتح على المشهد
    // المحدد بدل تركه يفتح على آخر مستند autosave.
    if (typeof options?.sceneId === "string" && options.sceneId.length > 0) {
      params.set("sceneId", options.sceneId);
    }
    if (typeof options?.shotId === "string" && options.shotId.length > 0) {
      params.set("shotId", options.shotId);
    }

    return `/editor?${params.toString()}`;
  }

  /**
   * يبني رابط /login مع redirect حقيقي يعود للمحرر بنفس projectId.
   *
   * إصلاح P0-7: التقرير وثّق أن الزائر يُحوَّل صامتاً إلى /login
   * عند الضغط على "فتح المحرر". الحل: عند اكتشاف غياب الجلسة
   * نوجّهه إلى /login ومعاه redirect target الكامل.
   */
  static buildLoginRedirectUrl(
    projectId: string,
    options?: { importIntent?: boolean; sceneId?: string; shotId?: string }
  ): string {
    const editorUrl = DirectorsEditorConfigManager.buildEditorUrl(projectId, options);
    const params = new URLSearchParams({ redirect: editorUrl });
    return `/login?${params.toString()}`;
  }

  static resetForTests(): void {
    DirectorsEditorConfigManager.cachedConfig = null;
  }
}

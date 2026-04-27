import {
  CreativeProject,
  CreativePrompt,
  AppSettings,
} from "@/app/(main)/arabic-creative-writing-studio/types";
import { logger } from "@/lib/ai/utils/logger";

// dataManager.ts
// مدير البيانات المحلية لاستوديو الكتابة الإبداعية

// إدخال تاريخي محفوظ في سجل النشاط
export interface HistoryEntry {
  type?: string;
  description?: string;
  promptId?: string;
  projectId?: string;
  timestamp?: Date;
  [key: string]: unknown;
}

// إحصائيات الاستخدام المُجمَّعة
export interface UsageStatistics {
  totalProjects: number;
  completedProjects: number;
  totalWords: number;
  averageWordsPerProject: number;
  mostUsedGenre: string;
  writingSessions: number;
  lastActivity: number | null;
}

// قيمة مُخزَّنة داخلياً في الذاكرة المؤقتة
type StoredValue =
  | CreativeProject[]
  | CreativePrompt[]
  | HistoryEntry[]
  | AppSettings;

export class DataManager {
  private static instance: DataManager;
  private storage = new Map<string, StoredValue>();
  private readonly STORAGE_KEYS = {
    PROJECTS: "creative_projects",
    SETTINGS: "app_settings",
    PROMPTS: "custom_prompts",
    HISTORY: "writing_history",
  };

  private constructor() {
    this.initializeStorage();
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // تهيئة التخزين
  private initializeStorage(): void {
    // في البيئة المحدودة، نستخدم الذاكرة
    // يمكن توسيعها لاحقاً لدعم localStorage أو IndexedDB
    this.storage.set(this.STORAGE_KEYS.PROJECTS, []);
    this.storage.set(this.STORAGE_KEYS.SETTINGS, this.getDefaultSettings());
    this.storage.set(this.STORAGE_KEYS.PROMPTS, []);
    this.storage.set(this.STORAGE_KEYS.HISTORY, []);
  }

  // الحصول على الإعدادات الافتراضية
  private getDefaultSettings(): AppSettings {
    return {
      language: "ar",
      theme: "dark",
      textDirection: "rtl",
      fontSize: "medium",
      autoSave: true,
      autoSaveInterval: 30000,
      geminiModel: "gemini-2.5-pro",
      geminiTemperature: 0.7,
      geminiMaxTokens: 8192,
    };
  }

  // حفظ المشاريع
  saveProjects(projects: CreativeProject[]): void {
    this.storage.set(this.STORAGE_KEYS.PROJECTS, projects);
  }

  // استرجاع المشاريع
  getProjects(): CreativeProject[] {
    const value = this.storage.get(this.STORAGE_KEYS.PROJECTS);
    return Array.isArray(value) ? (value as CreativeProject[]) : [];
  }

  // حفظ مشروع واحد
  saveProject(project: CreativeProject): void {
    const projects = this.getProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);

    if (existingIndex >= 0) {
      projects[existingIndex] = { ...project, updatedAt: new Date() };
    } else {
      projects.push(project);
    }

    this.saveProjects(projects);
  }

  // حذف مشروع
  deleteProject(projectId: string): void {
    const projects = this.getProjects();
    const filteredProjects = projects.filter((p) => p.id !== projectId);
    this.saveProjects(filteredProjects);
  }

  // حفظ الإعدادات
  saveSettings(settings: AppSettings): void {
    this.storage.set(this.STORAGE_KEYS.SETTINGS, settings);
  }

  // استرجاع الإعدادات
  getSettings(): AppSettings {
    const value = this.storage.get(this.STORAGE_KEYS.SETTINGS);
    return value && !Array.isArray(value)
      ? (value)
      : this.getDefaultSettings();
  }

  // حفظ محفز مخصص
  saveCustomPrompt(prompt: CreativePrompt): void {
    const prompts = this.getCustomPrompts();
    prompts.push(prompt);
    this.storage.set(this.STORAGE_KEYS.PROMPTS, prompts);
  }

  // استرجاع المحفزات المخصصة
  getCustomPrompts(): CreativePrompt[] {
    const value = this.storage.get(this.STORAGE_KEYS.PROMPTS);
    return Array.isArray(value) ? (value as CreativePrompt[]) : [];
  }

  // إضافة إلى التاريخ
  addToHistory(entry: HistoryEntry): void {
    const history = this.getHistory();
    history.unshift({ ...entry, timestamp: new Date() });

    // الاحتفاظ بآخر 50 عنصر فقط
    if (history.length > 50) {
      history.splice(50);
    }

    this.storage.set(this.STORAGE_KEYS.HISTORY, history);
  }

  // استرجاع التاريخ
  getHistory(): HistoryEntry[] {
    const value = this.storage.get(this.STORAGE_KEYS.HISTORY);
    return Array.isArray(value) ? (value as HistoryEntry[]) : [];
  }

  // تصدير جميع البيانات
  exportAllData(): string {
    const data = {
      projects: this.getProjects(),
      settings: this.getSettings(),
      customPrompts: this.getCustomPrompts(),
      history: this.getHistory(),
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  // استيراد البيانات
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData) as {
        projects?: CreativeProject[];
        settings?: Partial<AppSettings>;
        customPrompts?: CreativePrompt[];
        history?: unknown[];
      };

      if (data.projects) {
        this.saveProjects(data.projects);
      }

      if (data.settings) {
        this.saveSettings({ ...this.getDefaultSettings(), ...data.settings });
      }

      if (data.customPrompts) {
        this.storage.set(this.STORAGE_KEYS.PROMPTS, data.customPrompts);
      }

      if (data.history) {
        this.storage.set(
          this.STORAGE_KEYS.HISTORY,
          data.history as HistoryEntry[]
        );
      }

      return true;
    } catch (error) {
      logger.error("خطأ في استيراد البيانات:", error);
      return false;
    }
  }

  // مسح جميع البيانات
  clearAllData(): void {
    this.initializeStorage();
  }

  // إحصائيات الاستخدام
  getUsageStatistics(): UsageStatistics {
    const projects = this.getProjects();
    const history = this.getHistory();

    return {
      totalProjects: projects.length,
      completedProjects: projects.filter((p) => p.isCompleted).length,
      totalWords: projects.reduce((sum, p) => sum + p.wordCount, 0),
      averageWordsPerProject:
        projects.length > 0
          ? Math.round(
              projects.reduce((sum, p) => sum + p.wordCount, 0) /
                projects.length
            )
          : 0,
      mostUsedGenre: this.getMostUsedGenre(projects),
      writingSessions: history.length,
      lastActivity:
        projects.length > 0
          ? Math.max(...projects.map((p) => new Date(p.updatedAt).getTime()))
          : null,
    };
  }

  // النوع الأكثر استخداماً
  private getMostUsedGenre(projects: CreativeProject[]): string {
    const genreCounts: Record<string, number> = {};

    projects.forEach((project) => {
      genreCounts[project.genre] = (genreCounts[project.genre] ?? 0) + 1;
    });

    const mostUsed = Object.entries(genreCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostUsed ? mostUsed[0] : "غير محدد";
  }

  // نسخة احتياطية تلقائية
  createBackup(): string {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: this.exportAllData(),
    };

    return JSON.stringify(backup);
  }

  // استعادة من النسخة الاحتياطية
  restoreFromBackup(backupData: string): boolean {
    try {
      const backup = JSON.parse(backupData) as {
        version?: string;
        timestamp?: string;
        data?: string;
      };

      if (backup.data) {
        return this.importData(backup.data);
      }

      return false;
    } catch (error) {
      logger.error("خطأ في استعادة النسخة الاحتياطية:", error);
      return false;
    }
  }
}

export default DataManager;

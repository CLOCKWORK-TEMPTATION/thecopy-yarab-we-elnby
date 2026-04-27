/**
 * Brainstorm Agent Registry — types
 * أنواع الوكيل للعرض في الواجهة
 */

import { TaskType } from "../../enums";

/**
 * واجهة تعريف الوكيل للعرض في صفحة brainstorm
 */
export interface BrainstormAgentDefinition {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  description: string;
  category: AgentCategory;
  icon: AgentIcon;
  taskType: TaskType;
  capabilities: BrainstormAgentCapabilities;
  collaboratesWith: TaskType[];
  enhances: TaskType[];
  complexityScore: number;
  phaseRelevance: BrainstormPhase[];
}

/**
 * قدرات الوكيل المبسطة للعرض
 */
export interface BrainstormAgentCapabilities {
  canAnalyze: boolean;
  canGenerate: boolean;
  canPredict: boolean;
  hasMemory: boolean;
  usesSelfReflection: boolean;
  supportsRAG: boolean;
}

/**
 * فئات الوكلاء
 */
export type AgentCategory =
  | "core" // الوكلاء الأساسيين
  | "analysis" // وكلاء التحليل
  | "creative" // وكلاء الإبداع
  | "predictive" // وكلاء التنبؤ
  | "advanced"; // الوحدات المتقدمة

/**
 * أيقونات الوكلاء
 */
export type AgentIcon =
  | "brain" // Brain
  | "users" // Users - شبكة الشخصيات
  | "message-square" // MessageSquare - الحوار
  | "book-open" // BookOpen - الموضوعات
  | "target" // Target - الجمهور
  | "shield" // Shield - التحقق
  | "zap" // Zap - التوتر
  | "cpu" // Cpu - التكامل
  | "layers" // Layers - البناء
  | "rocket" // Rocket - التنسيق
  | "file-text" // FileText - المشاهد
  | "sparkles" // Sparkles - الإبداع
  | "trophy" // Trophy - الجودة
  | "globe" // Globe - الثقافة
  | "film" // Film - السينما
  | "chart-bar" // ChartBar - الإنتاج
  | "lightbulb" // Lightbulb - التوصيات
  | "compass" // Compass - البوصلة
  | "fingerprint" // Fingerprint - البصمة
  | "pen-tool" // PenTool - إعادة الكتابة
  | "music" // Music - الإيقاع
  | "search"; // Search - التنقيب

/**
 * مراحل العصف الذهني
 */
export type BrainstormPhase = 1 | 2 | 3 | 4 | 5;

import { IDE_PROHIBITED_PATTERNS } from "./constants";
import type { IdeTarget } from "./repo-state";

export interface VerificationIssue {
  level: "error" | "warning";
  message: string;
}

function hasAllNeedles(content: string, needles: string[]): boolean {
  return needles.every((needle) => content.includes(needle));
}

export function verifyIdeMirrorContent(target: IdeTarget, content: string): VerificationIssue[] {
  const issues: VerificationIssue[] = [];

  if (!hasAllNeedles(content, ["AGENTS.md", "output/session-state.md"])) {
    issues.push({
      level: "error",
      message: `ملف IDE لا يشير إلى العقد الأعلى أو الحالة الحية: ${target.path}`,
    });
  }

  if (!content.includes("brief") || !content.includes("handoff brief")) {
    issues.push({
      level: "error",
      message: `ملف IDE لا يفرض إثبات القراءة أو handoff brief: ${target.path}`,
    });
  }

  if (!content.includes("ليس مصدر الحقيقة")) {
    issues.push({
      level: "error",
      message: `ملف IDE لا يصرح بأنه ليس مصدر الحقيقة: ${target.path}`,
    });
  }

  for (const pattern of IDE_PROHIBITED_PATTERNS) {
    if (content.includes(pattern)) {
      issues.push({
        level: "error",
        message: `ملف IDE يحمل حقيقة تشغيلية أو نمطًا محظورًا: ${target.path} => ${pattern}`,
      });
    }
  }

  return issues;
}

export function verifyManualGuidanceContent(filePath: string, content: string): VerificationIssue[] {
  const issues: VerificationIssue[] = [];

  if (!content.trim()) {
    issues.push({
      level: "error",
      message: `ملف التعليمات اليدوي مفقود أو فارغ: ${filePath}`,
    });
    return issues;
  }

  if (!hasAllNeedles(content, ["AGENTS.md", "output/session-state.md"])) {
    issues.push({
      level: "error",
      message: `ملف التعليمات اليدوي لا يفرض الرجوع إلى العقد الأعلى والحالة الحية: ${filePath}`,
    });
  }

  if (!content.includes("brief")) {
    issues.push({
      level: "error",
      message: `ملف التعليمات اليدوي لا يفرض إثبات القراءة قبل العمل: ${filePath}`,
    });
  }

  if (!content.includes("output/round-notes.md")) {
    issues.push({
      level: "error",
      message: `ملف التعليمات اليدوي لا يحيل إلى سجل الجولات التنفيذي: ${filePath}`,
    });
  }

  if (!content.includes("handoff brief") && !content.includes("HANDOFF-PROTOCOL")) {
    issues.push({
      level: "error",
      message: `ملف التعليمات اليدوي لا يربط إغلاق الجولة ببروتوكول التسليم: ${filePath}`,
    });
  }

  if (content.includes("Weaviate") || content.includes("workspace:embed") || content.includes("text-embedding-004")) {
    issues.push({
      level: "error",
      message: `ملف التعليمات اليدوي يحمل حقيقة RAG محلية بدل الإحالة إلى المرجع الأعلى: ${filePath}`,
    });
  }

  return issues;
}
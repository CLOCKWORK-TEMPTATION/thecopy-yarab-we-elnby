/**
 * @module export
 * @description أدوات تصدير نتائج جلسات العصف الذهني
 *
 * السبب: يتيح للمستخدمين حفظ نتائج الجلسات
 * ومشاركتها مع فريق الإنتاج بصيغ مختلفة
 */

import type { Session, DebateMessage } from "../types";

/**
 * نتيجة عملية التصدير
 */
export interface ExportResult {
  ok: boolean;
  filename?: string;
  error?: string;
}

/**
 * بيانات التصدير المُنظّمة
 */
export interface ExportData {
  session: {
    id: string;
    brief: string;
    phase: number;
    status: string;
    startTime: string;
  };
  messages: Array<{
    agent: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  results: Record<string, unknown>;
  exportedAt: string;
  version: string;
}

/**
 * تجهيز بيانات التصدير من الجلسة والرسائل
 */
export function prepareExportData(
  session: Session,
  messages: DebateMessage[]
): ExportData {
  return {
    session: {
      id: session.id,
      brief: session.brief,
      phase: session.phase,
      status: session.status,
      startTime:
        session.startTime instanceof Date
          ? session.startTime.toISOString()
          : String(session.startTime),
    },
    messages: messages.map((m) => ({
      agent: m.agentName,
      type: m.type,
      message: m.message,
      timestamp:
        m.timestamp instanceof Date
          ? m.timestamp.toISOString()
          : String(m.timestamp),
    })),
    results: session.results || {},
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };
}

/**
 * تنزيل ملف نصي — يُرجع نتيجة التحميل
 */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): ExportResult {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { ok: true, filename };
  } catch (err) {
    return {
      ok: false,
      filename,
      error: err instanceof Error ? err.message : "فشل إنشاء ملف التحميل",
    };
  }
}

/**
 * تصدير الجلسة بصيغة JSON
 */
export function exportToJSON(
  session: Session,
  messages: DebateMessage[]
): ExportResult {
  try {
    const data = prepareExportData(session, messages);
    const json = JSON.stringify(data, null, 2);
    const filename = `brainstorm_${session.id}_${Date.now()}.json`;
    return downloadFile(json, filename, "application/json;charset=utf-8");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "فشل تجهيز بيانات JSON",
    };
  }
}

/**
 * بناء محتوى Markdown من بيانات التصدير
 */
export function buildMarkdownContent(data: ExportData): string {
  const typeLabels: Record<string, string> = {
    proposal: "اقتراح",
    critique: "نقد",
    agreement: "اتفاق",
    decision: "قرار",
  };

  let md = `# تقرير جلسة العصف الذهني\n\n`;
  md += `**المعرّف:** ${data.session.id}\n\n`;
  md += `**الموجز:** ${data.session.brief}\n\n`;
  md += `**المرحلة:** ${data.session.phase} / 5\n\n`;
  md += `**الحالة:** ${data.session.status}\n\n`;
  md += `**تاريخ البدء:** ${data.session.startTime}\n\n`;
  md += `**تاريخ التصدير:** ${data.exportedAt}\n\n`;
  md += `---\n\n`;
  md += `## مسار النقاش\n\n`;

  for (const msg of data.messages) {
    const typeLabel = typeLabels[msg.type] || msg.type;
    md += `### ${msg.agent} — ${typeLabel}\n\n`;
    md += `${msg.message}\n\n`;
    md += `_${msg.timestamp}_\n\n`;
    md += `---\n\n`;
  }

  if (Object.keys(data.results).length > 0) {
    md += `## النتائج\n\n`;
    md += `\`\`\`json\n${JSON.stringify(data.results, null, 2)}\n\`\`\`\n`;
  }

  return md;
}

/**
 * تصدير الجلسة بصيغة Markdown
 */
export function exportToMarkdown(
  session: Session,
  messages: DebateMessage[]
): ExportResult {
  try {
    const data = prepareExportData(session, messages);
    const md = buildMarkdownContent(data);
    const filename = `brainstorm_${session.id}_${Date.now()}.md`;
    return downloadFile(md, filename, "text/markdown;charset=utf-8");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "فشل تجهيز بيانات Markdown",
    };
  }
}

/**
 * نسخ ملخص الجلسة إلى الحافظة
 */
export async function copyToClipboard(
  session: Session,
  messages: DebateMessage[]
): Promise<ExportResult> {
  try {
    let text = `جلسة عصف ذهني: ${session.brief}\n\n`;

    const decisions = messages.filter((m) => m.type === "decision");
    if (decisions.length > 0) {
      text += `القرارات:\n`;
      decisions.forEach((d) => {
        text += `- ${d.agentName}: ${d.message}\n`;
      });
      text += `\n`;
    }

    const proposals = messages.filter((m) => m.type === "proposal");
    if (proposals.length > 0) {
      text += `الاقتراحات:\n`;
      proposals.forEach((p) => {
        text += `- ${p.agentName}: ${p.message.substring(0, 200)}...\n`;
      });
    }

    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "فشل النسخ إلى الحافظة",
    };
  }
}

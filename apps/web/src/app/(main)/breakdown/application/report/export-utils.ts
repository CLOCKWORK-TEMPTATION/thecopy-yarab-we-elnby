/**
 * @module export-utils
 * @description أدوات تصدير تقارير تفكيك السيناريو
 *
 * السبب: يتيح للمخرج تصدير نتائج التحليل
 * بصيغ مختلفة لمشاركتها مع فريق الإنتاج
 */

/**
 * تنزيل ملف
 */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * تصدير تقرير التفكيك بصيغة JSON
 */
export function exportBreakdownToJSON(
  data: Record<string, unknown>,
  scriptTitle: string
): void {
  const exportData = {
    title: scriptTitle,
    exportedAt: new Date().toISOString(),
    version: "1.0",
    breakdown: data,
  };

  const json = JSON.stringify(exportData, null, 2);
  const safeTitle = scriptTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
  const filename = `breakdown_${safeTitle}_${Date.now()}.json`;
  downloadFile(json, filename, "application/json;charset=utf-8");
}

/**
 * تصدير تقرير التفكيك بصيغة Markdown
 */
export function exportBreakdownToMarkdown(
  data: Record<string, unknown>,
  scriptTitle: string
): void {
  let md = `# تقرير تفكيك السيناريو\n\n`;
  md += `**العنوان:** ${scriptTitle}\n\n`;
  md += `**تاريخ التصدير:** ${new Date().toLocaleString("ar-SA")}\n\n`;
  md += `---\n\n`;

  // تحويل البيانات لأقسام Markdown
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object") {
      md += `## ${formatSectionTitle(key)}\n\n`;

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            for (const [k, v] of Object.entries(obj)) {
              md += `- **${k}:** ${String(v)}\n`;
            }
            md += `\n`;
          } else {
            md += `- ${String(item)}\n`;
          }
        }
      } else {
        md += `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
      }
      md += `\n`;
    }
  }

  const safeTitle = scriptTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
  const filename = `breakdown_${safeTitle}_${Date.now()}.md`;
  downloadFile(md, filename, "text/markdown;charset=utf-8");
}

/**
 * تصدير تقرير التفكيك بصيغة CSV
 * (للمشاهد وبيانات الإنتاج)
 */
export function exportBreakdownToCSV(
  scenes: Array<Record<string, unknown>>,
  scriptTitle: string
): void {
  if (!scenes || scenes.length === 0) return;

  // استخراج أعمدة من أول مشهد
  const firstScene = scenes[0];
  if (!firstScene) return;
  const headers = Object.keys(firstScene);
  const csvRows: string[] = [];

  // BOM لدعم العربية في Excel
  const BOM = "\uFEFF";

  // رأس الأعمدة
  csvRows.push(headers.map(escapeCSV).join(","));

  // الصفوف
  for (const scene of scenes) {
    const row = headers.map((h) => {
      const val = scene[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return escapeCSV(JSON.stringify(val));
      return escapeCSV(String(val));
    });
    csvRows.push(row.join(","));
  }

  const csv = BOM + csvRows.join("\n");
  const safeTitle = scriptTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
  const filename = `breakdown_scenes_${safeTitle}_${Date.now()}.csv`;
  downloadFile(csv, filename, "text/csv;charset=utf-8");
}

/**
 * نسخ ملخص التفكيك للحافظة
 */
export async function copyBreakdownSummary(
  data: Record<string, unknown>,
  scriptTitle: string
): Promise<void> {
  let text = `ملخص تفكيك: ${scriptTitle}\n\n`;

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      text += `${formatSectionTitle(key)}: ${value.length} عنصر\n`;
    }
  }

  await navigator.clipboard.writeText(text);
}

/**
 * تنسيق عنوان القسم
 */
function formatSectionTitle(key: string): string {
  const titles: Record<string, string> = {
    scenes: "المشاهد",
    locations: "المواقع",
    characters: "الشخصيات",
    costumes: "الأزياء",
    props: "الممتلكات",
    vehicles: "المركبات",
    stunts: "المشاهد الخطرة",
    vfx: "المؤثرات البصرية",
    sfx: "المؤثرات الصوتية",
    music: "الموسيقى",
    makeup: "المكياج",
    extras: "الكومبارس",
  };
  return titles[key] || key;
}

/**
 * تهريب قيمة CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

import { access, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Document, Packer, Paragraph, TextRun } from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixtureDir = __dirname;
const legacyDocxPath = path.join(
  fixtureDir,
  "QA-Report-TheCopy-Editor-2026-04-13.docx"
);
const sampleDocxPath = path.join(fixtureDir, "sample-runtime.docx");
const sampleDocPath = path.join(fixtureDir, "sample-runtime.doc");
const samplePdfPath = path.join(fixtureDir, "sample-runtime.pdf");

const screenplayLines = [
  "الملخص التنفيذي",
  "داخلي - مكتب التحرير - نهار",
  "سليم:",
  "نحتاج نسخة ثابتة قابلة للتحرير بعد الاستقرار.",
  "ينظر إلى شاشة المحرر ويتابع سجل التشخيص.",
  "نادية:",
  "الحفظ المحلي يجب أن يعود بعد إعادة التحميل.",
  "قطع إلى:",
];

const buildLongEditorFixtureText = () => {
  const lines = [...screenplayLines];
  for (let index = 1; index <= 48; index += 1) {
    lines.push(
      `داخلي - موقع الاختبار ${index} - نهار`,
      "سليم:",
      `هذا سطر تحقق رقم ${index} داخل عينة المحرر الإنتاجية.`,
      "نادية:",
      "نؤكد أن البنية والصفحات والحفظ لا تتراجع.",
      "يتحرك المؤشر داخل النص وتبقى الورقة قابلة للتحرير."
    );
  }
  return `${lines.join("\n")}\n`;
};

const shouldWrite = async (filePath, minimumBytes = 1) => {
  try {
    const info = await stat(filePath);
    return info.size < minimumBytes;
  } catch {
    return true;
  }
};

const ensureDocx = async (filePath, text) => {
  if (!(await shouldWrite(filePath, 1000))) return false;

  const document = new Document({
    sections: [
      {
        properties: {},
        children: text.split("\n").map(
          (line) =>
            new Paragraph({
              bidirectional: true,
              children: [
                new TextRun({
                  text: line || " ",
                  font: "Arial",
                  rightToLeft: true,
                  size: 24,
                }),
              ],
            })
        ),
      },
    ],
  });

  await writeFile(filePath, await Packer.toBuffer(document));
  return true;
};

const ensureTextFile = async (filePath, text) => {
  if (!(await shouldWrite(filePath))) return false;
  await writeFile(filePath, text, "utf8");
  return true;
};

const ensurePdf = async (filePath) => {
  if (!(await shouldWrite(filePath, 100))) return false;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 84 >>
stream
BT
/F1 14 Tf
72 720 Td
(TheCopy editor production readiness fixture) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000375 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
445
%%EOF
`;
  await writeFile(filePath, pdf, "utf8");
  return true;
};

export const ensureEditorFixtures = async () => {
  await mkdir(fixtureDir, { recursive: true });
  const text = buildLongEditorFixtureText();
  const result = {
    legacyDocx: await ensureDocx(legacyDocxPath, text),
    sampleDocx: await ensureDocx(sampleDocxPath, text),
    sampleDoc: await ensureTextFile(sampleDocPath, text),
    samplePdf: await ensurePdf(samplePdfPath),
  };

  await Promise.all([
    access(legacyDocxPath),
    access(sampleDocxPath),
    access(sampleDocPath),
    access(samplePdfPath),
  ]);

  return {
    fixtureDir,
    files: {
      legacyDocxPath,
      sampleDocxPath,
      sampleDocPath,
      samplePdfPath,
    },
    generated: result,
  };
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  ensureEditorFixtures()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error("[ensure-editor-fixtures] failed:", error);
      process.exitCode = 1;
    });
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import process from "node:process";

export const execFileAsync = promisify(execFile);

export const toFileUrl = (filePath) => pathToFileURL(filePath).href;

export const toChildProcessEnv = (overrideEnv = {}) => {
  const merged = { ...process.env, ...overrideEnv };
  const safeEnv = {};
  for (const [key, value] of Object.entries(merged)) {
    if (!key || key.includes("=") || typeof value === "undefined") continue;
    safeEnv[key] = String(value);
  }
  return safeEnv;
};

export const toSafePdfFilename = (filename) => {
  const candidate = (filename || "document.pdf").split(/[\\/]/).pop();
  if (candidate.toLowerCase().endsWith(".pdf")) return candidate;
  return `${candidate}.pdf`;
};

export const getMockMode = () =>
  (process.env.PDF_OCR_AGENT_MOCK_MODE || "").trim().toLowerCase();

export const buildMockSuccessResult = () => {
  const text =
    process.env.PDF_OCR_AGENT_MOCK_TEXT?.trim() ||
    "هذا نص OCR تجريبي من وضع المحاكاة.";
  const forcedReject = /^(1|true|yes|on)$/iu.test(
    (process.env.PDF_OCR_AGENT_MOCK_FORCE_REJECT || "").trim()
  );
  return {
    text,
    textRaw: text,
    textMarkdown: text,
    method: "ocr-mistral",
    usedOcr: true,
    attempts: [
      "pdf-ocr-agent",
      "classify",
      "ocr-mistral",
      "write-output",
      "mock-success",
    ],
    warnings: [],
    qualityScore: forcedReject ? 0.2 : 1,
    quality: {
      wordMatch: forcedReject ? 92 : 100,
      structuralMatch: forcedReject ? 95 : 100,
      accepted: !forcedReject,
    },
    mismatchReport: forcedReject
      ? [
          {
            page: 1,
            line: 1,
            token: "مشهد1",
            expected: "مشهد1",
            actual: "مسـاهد 1",
            severity: "critical",
          },
        ]
      : [],
    status: forcedReject ? "rejected" : "accepted",
    rejectionReason: forcedReject
      ? "mock rejection requested by PDF_OCR_AGENT_MOCK_FORCE_REJECT."
      : undefined,
    referenceMode: "pdf-vision",
    payloadVersion: 2,
    classification: null,
    rawExtractedText: text,
  };
};

export const collectStderrWarnings = (stderr) => {
  if (typeof stderr !== "string" || !stderr.trim()) return [];
  return stderr
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const buildTsxNodeArgs = (
  scriptPath,
  scriptArgs = [],
  extraImports = []
) => {
  const nodeArgs = [];
  for (const importTarget of extraImports) {
    if (typeof importTarget === "string" && importTarget.trim())
      nodeArgs.push("--import", importTarget.trim());
  }
  nodeArgs.push("--import", "tsx", scriptPath, ...scriptArgs);
  return nodeArgs;
};

export const parseJsonObject = (raw, label) => {
  const rawText = typeof raw === "string" ? raw.trim() : "";
  if (!rawText) throw new Error(`${label} returned empty output.`);
  const tryParse = (candidate) => {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(rawText);
  if (!parsed) {
    const lines = rawText
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (!line.startsWith("{") || !line.endsWith("}")) continue;
      parsed = tryParse(line);
      if (parsed) break;
    }
  }
  if (!parsed) {
    const firstBraceIndex = rawText.indexOf("{");
    const lastBraceIndex = rawText.lastIndexOf("}");
    if (
      firstBraceIndex >= 0 &&
      lastBraceIndex > firstBraceIndex &&
      lastBraceIndex <= rawText.length - 1
    ) {
      parsed = tryParse(rawText.slice(firstBraceIndex, lastBraceIndex + 1));
    }
  }
  if (!parsed)
    throw new Error(`${label} returned invalid JSON: unable to parse output.`);
  if (typeof parsed !== "object")
    throw new Error(`${label} returned malformed payload.`);
  return parsed;
};

export const readFileIfExists = async (filePath) => {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
};

export const buildCriticalTokenList = (text) => {
  const seed = ["مشهد1", "مشهد2", "قطع", "داخلي", "خارجي", "نهار", "ليل"];
  const dynamic = String(text ?? "")
    .match(/\b(?:مشهد[0-9٠-٩]+|[0-9٠-٩]+)\b/gu)
    ?.map((token) => token.trim());
  return Array.from(new Set([...seed, ...(dynamic ?? [])])).filter(Boolean);
};

export const buildRunFileKey = (filename) => {
  const base = (filename || "document.pdf")
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).slice(2, 8);
  return `${base || "document.pdf"}-${stamp}-${random}`;
};

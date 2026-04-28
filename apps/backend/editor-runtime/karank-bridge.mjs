/**
 * @description KarankBridge — مدير subprocess للتواصل مع محرك Python عبر stdio JSON lines
 */

import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = resolve(
  __dirname,
  "karank_engine",
  "engine",
  "ts_bridge.py",
);
const MIN_PYTHON_MAJOR = 3;
const MIN_PYTHON_MINOR = 10;

const resolveTimeoutFromEnv = (name, fallbackMs) => {
  const rawValue = process.env[name];
  if (!rawValue) return fallbackMs;

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackMs;
  }

  return parsedValue;
};

const PING_TIMEOUT_MS = resolveTimeoutFromEnv("KARANK_PING_TIMEOUT_MS", 10_000);
const REQUEST_TIMEOUT_MS = resolveTimeoutFromEnv(
  "KARANK_REQUEST_TIMEOUT_MS",
  30_000,
);
const DOCX_REQUEST_TIMEOUT_MS = Math.max(
  REQUEST_TIMEOUT_MS,
  resolveTimeoutFromEnv("KARANK_DOCX_REQUEST_TIMEOUT_MS", 120_000),
);
const SHUTDOWN_TIMEOUT_MS = 5_000;

/** @type {{ command: string, args: string[], version: { major: number, minor: number } } | null} */
let resolvedPythonRuntime = null;

/** @type {"idle" | "starting" | "ready" | "dead" | "error"} */
let state = "idle";

/** @type {import("node:child_process").ChildProcess | null} */
let proc = null;

/** @type {import("node:readline").Interface | null} */
let rl = null;

/** @type {Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>} */
const pending = new Map();

let requestCounter = 0;
let retryAttempted = false;

/**
 * التحقق من توفر Python 3.10+ وحلّ الأمر المناسب لتشغيل المحرك.
 */
const trimEnvValue = (value) => (typeof value === "string" ? value.trim() : "");

const parsePythonVersion = (output) => {
  const match = String(output ?? "").match(/Python\s+(\d+)\.(\d+)/u);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
  };
};

const isSupportedPythonVersion = (version) => {
  if (!version) {
    return false;
  }

  return (
    version.major > MIN_PYTHON_MAJOR ||
    (version.major === MIN_PYTHON_MAJOR && version.minor >= MIN_PYTHON_MINOR)
  );
};

const formatCandidateLabel = (candidate) =>
  [candidate.command, ...candidate.args].join(" ").trim();

const getPythonCandidates = () => {
  const candidates = [];
  const configuredExecutable =
    trimEnvValue(process.env.KARANK_PYTHON_BIN) ||
    trimEnvValue(process.env.PYTHON_BIN) ||
    trimEnvValue(process.env.PYTHON_EXECUTABLE) ||
    trimEnvValue(process.env.PYTHON);

  if (configuredExecutable) {
    candidates.push({ command: configuredExecutable, args: [] });
  }

  if (process.platform === "win32") {
    const preferredVersion = trimEnvValue(process.env.KARANK_PYTHON_VERSION);
    if (preferredVersion) {
      candidates.push({ command: "py", args: [`-${preferredVersion}`] });
    }

    for (const version of ["3.13", "3.12", "3.11", "3.10"]) {
      candidates.push({ command: "py", args: [`-${version}`] });
    }
  }

  candidates.push({ command: "python", args: [] });
  candidates.push({ command: "python3", args: [] });

  const deduped = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = formatCandidateLabel(candidate);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
};

const probePythonCandidate = (candidate) => {
  const result = spawnSync(
    candidate.command,
    [...candidate.args, "--version"],
    {
      encoding: "utf-8",
      timeout: 5_000,
      windowsHide: true,
    },
  );

  if (result.error) {
    return {
      ok: false,
      candidate,
      reason: result.error.message,
    };
  }

  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const version = parsePythonVersion(output);
  if (!version) {
    return {
      ok: false,
      candidate,
      reason: `تعذر تحديد إصدار Python من الناتج: "${output || "<empty>"}".`,
    };
  }

  if (!isSupportedPythonVersion(version)) {
    return {
      ok: false,
      candidate,
      reason: `Python ${version.major}.${version.minor} غير مدعوم. المطلوب: Python ${MIN_PYTHON_MAJOR}.${MIN_PYTHON_MINOR}+.`,
    };
  }

  return {
    ok: true,
    candidate,
    version,
  };
};

const checkPython = () => {
  if (resolvedPythonRuntime) {
    return resolvedPythonRuntime;
  }

  const attempts = [];
  for (const candidate of getPythonCandidates()) {
    const probe = probePythonCandidate(candidate);
    if (probe.ok) {
      resolvedPythonRuntime = {
        command: candidate.command,
        args: candidate.args,
        version: probe.version,
      };
      return resolvedPythonRuntime;
    }

    attempts.push(`${formatCandidateLabel(candidate)} → ${probe.reason}`);
  }

  throw new Error(
    [
      `تعذر العثور على Python مناسب لتشغيل karank bridge. المطلوب: Python ${MIN_PYTHON_MAJOR}.${MIN_PYTHON_MINOR}+.`,
      attempts.length > 0 ? `المحاولات: ${attempts.join(" | ")}` : null,
      "يمكنك ضبط KARANK_PYTHON_BIN على المسار الصحيح لـ python.exe أو استخدام KARANK_PYTHON_VERSION مع py على ويندوز.",
    ]
      .filter(Boolean)
      .join(" "),
  );
};

/**
 * التحقق من وجود ملفات المحرك
 */
const checkEngineFiles = () => {
  if (!existsSync(ENGINE_PATH)) {
    throw new Error(
      `ملف المحرك غير موجود: ${ENGINE_PATH}. تأكد من نسخ ملفات المحرك إلى server/karank_engine/engine/.`,
    );
  }
};

const nextId = () => `req-${++requestCounter}-${Date.now()}`;

/**
 * إعادة تعيين المحرك بعد طلب متعثر حتى لا تبقى الطلبات اللاحقة عالقة خلفه.
 * @param {string} requestId
 * @param {number} timeoutMs
 */
const restartAfterTimeout = (requestId, timeoutMs) => {
  if (!proc || proc.killed) {
    state = "dead";
    return;
  }

  console.warn(
    `[karank-bridge] انتهت مهلة ${requestId} بعد ${timeoutMs}ms، إعادة تشغيل المحرك.`,
  );
  state = "dead";
  proc.kill();
};

/**
 * معالجة سطر JSON قادم من stdout
 */
const handleLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    console.warn("[karank-bridge] تعذر تحليل سطر JSON:", trimmed.slice(0, 200));
    return;
  }

  const id = parsed?.id;
  if (!id || !pending.has(id)) return;

  const { resolve: res, timer } = pending.get(id);
  clearTimeout(timer);
  pending.delete(id);
  res(parsed);
};

/**
 * تشغيل عملية Python
 */
const spawnProcess = () => {
  state = "starting";

  const pythonRuntime = checkPython();
  proc = spawn(
    pythonRuntime.command,
    [...pythonRuntime.args, "-u", ENGINE_PATH],
    {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: "1" },
    },
  );

  rl = createInterface({ input: proc.stdout });
  rl.on("line", handleLine);

  proc.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.warn("[karank-bridge:stderr]", text);
  });

  proc.on("close", (code) => {
    const wasReady = state === "ready";
    state = "dead";
    rl = null;
    proc = null;

    // reject all pending requests
    for (const [_id, { reject: rej, timer }] of pending) {
      clearTimeout(timer);
      rej(new Error(`عملية المحرك انتهت برمز ${code}`));
    }
    pending.clear();

    if (wasReady) {
      console.warn(`[karank-bridge] العملية انتهت برمز ${code}`);
    }
  });
};

/**
 * إرسال طلب JSON وانتظار الرد
 */
const sendRequest = (payload, timeoutMs = REQUEST_TIMEOUT_MS) => {
  return new Promise((resolve, reject) => {
    if (!proc || !proc.stdin.writable) {
      reject(new Error("عملية المحرك غير نشطة"));
      return;
    }

    const id = payload.id;
    const timer = setTimeout(() => {
      pending.delete(id);
      const timeoutError = new Error(`انتهت مهلة الطلب ${id} (${timeoutMs}ms)`);
      restartAfterTimeout(id, timeoutMs);
      reject(timeoutError);
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer });

    proc.stdin.write(JSON.stringify(payload) + "\n", "utf-8", (err) => {
      if (err) {
        clearTimeout(timer);
        pending.delete(id);
        reject(err);
      }
    });
  });
};

/**
 * إرسال ping والتحقق من الجاهزية
 */
const sendPing = async () => {
  const id = nextId();
  const response = await sendRequest({ id, action: "ping" }, PING_TIMEOUT_MS);
  if (!response?.ok) {
    throw new Error("المحرك لم يُرجع ping ناجح");
  }
  return response.result;
};

/**
 * ضمان جاهزية البريدج — lazy spawn + ping
 */
const ensureReady = async () => {
  if (state === "ready" && proc && !proc.killed) return;

  if (state === "error") {
    throw new Error("المحرك في حالة خطأ نهائي. أعد تشغيل الخادم.");
  }

  checkPython();
  checkEngineFiles();

  spawnProcess();

  try {
    await sendPing();
    state = "ready";
    retryAttempted = false;
    console.log("[karank-bridge] المحرك جاهز");
  } catch (error) {
    if (!retryAttempted) {
      retryAttempted = true;
      console.warn("[karank-bridge] فشل ping الأول، محاولة إعادة تشغيل...");

      if (proc && !proc.killed) proc.kill();
      proc = null;
      rl = null;

      spawnProcess();

      try {
        await sendPing();
        state = "ready";
        console.log("[karank-bridge] المحرك جاهز بعد إعادة التشغيل");
      } catch (retryError) {
        state = "error";
        if (proc && !proc.killed) proc.kill();
        proc = null;
        rl = null;
        throw new Error(
          `تعذر تشغيل المحرك بعد محاولتين. ${retryError.message}`,
          { cause: retryError },
        );
      }
    } else {
      state = "error";
      throw error;
    }
  }
};

/**
 * تحليل نص عبر المحرك
 * @param {string} text - النص العربي
 * @returns {Promise<object>} نتيجة التحليل
 */
export const parseText = async (text) => {
  await ensureReady();
  const id = nextId();
  const response = await sendRequest({
    id,
    action: "parseText",
    text,
  });

  if (!response?.ok) {
    const errMsg = response?.error?.message || "فشل تحليل النص";
    throw new Error(errMsg);
  }

  return response.result;
};

export const ping = async () => {
  await ensureReady();
  return sendPing();
};

export const getPythonMinimumVersion = () => ({
  major: MIN_PYTHON_MAJOR,
  minor: MIN_PYTHON_MINOR,
});

export const getPythonRuntimeInfo = () => {
  const runtime = checkPython();
  return {
    command: runtime.command,
    args: [...runtime.args],
    version: { ...runtime.version },
    label: formatCandidateLabel(runtime),
  };
};

export const getEngineFilesInfo = () => ({
  path: ENGINE_PATH,
  exists: existsSync(ENGINE_PATH),
});

/**
 * تحليل ملف DOCX عبر المحرك
 * @param {string} docxPath - المسار المطلق لملف DOCX
 * @param {number} [timeoutMs] - مهلة اختيارية لهذا الطلب فقط
 * @returns {Promise<object>} نتيجة التحليل
 */
export const parseDocx = async (
  docxPath,
  timeoutMs = DOCX_REQUEST_TIMEOUT_MS,
) => {
  await ensureReady();
  const id = nextId();
  const response = await sendRequest(
    {
      id,
      action: "parseDocx",
      path: docxPath,
    },
    timeoutMs,
  );

  if (!response?.ok) {
    const errMsg = response?.error?.message || "فشل تحليل DOCX";
    throw new Error(errMsg);
  }

  return response.result;
};

/**
 * إيقاف البريدج بشكل آمن
 */
export const destroy = async () => {
  if (!proc || proc.killed) {
    state = "idle";
    return;
  }

  try {
    const id = nextId();
    proc.stdin.write(
      JSON.stringify({ id, action: "shutdown" }) + "\n",
      "utf-8",
    );

    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (proc && !proc.killed) proc.kill();
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);

      proc.on("close", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  } catch {
    if (proc && !proc.killed) proc.kill();
  }

  proc = null;
  rl = null;
  state = "idle";
  pending.clear();
  retryAttempted = false;
};

/**
 * الحصول على حالة البريدج الحالية
 */
export const getState = () => state;

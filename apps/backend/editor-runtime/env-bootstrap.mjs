import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let envLoaded = false;

const collectEnvCandidates = (startPath, limit = 5) => {
  const candidates = [];
  let current = resolve(startPath);

  for (let index = 0; index < limit; index += 1) {
    candidates.push(resolve(current, ".env"));
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return candidates;
};

const stripWrappingQuotes = (value) => value.replace(/^['"]|['"]$/g, "");

const isPlaceholderEnvValue = (key, value) => {
  const trimmed = stripWrappingQuotes((value ?? "").trim());
  if (!trimmed) {
    return true;
  }

  if (trimmed.includes("CHANGE_THIS")) {
    return true;
  }

  if (
    key === "DATABASE_URL" &&
    /:\/\/USER:PASSWORD@HOST(?::\d+)?\/DB_NAME/i.test(trimmed)
  ) {
    return true;
  }

  return false;
};

const applyEnvFile = (path, env = process.env) => {
  const parsed = parseEnv(readFileSync(path));

  for (const [key, rawValue] of Object.entries(parsed)) {
    const value = rawValue.trim();
    const existingValue = env[key];

    if (isPlaceholderEnvValue(key, value)) {
      continue;
    }

    if (
      existingValue === undefined ||
      isPlaceholderEnvValue(key, existingValue)
    ) {
      env[key] = value;
    }
  }
};

export const ensureServerEnvLoaded = (env = process.env) => {
  if (envLoaded) {
    return;
  }

  if (env.NODE_ENV === "test" || env.SKIP_DOTENV_AUTOLOAD === "true") {
    envLoaded = true;
    return;
  }

  const configuredPath = env.EDITOR_RUNTIME_ENV_FILE?.trim();
  const candidatePaths = [
    configuredPath || null,
    ...collectEnvCandidates(process.cwd()),
    ...collectEnvCandidates(__dirname),
  ];

  const seen = new Set();
  for (const candidate of candidatePaths) {
    if (!candidate) {
      continue;
    }

    const normalized = resolve(candidate);
    if (seen.has(normalized) || !existsSync(normalized)) {
      continue;
    }

    seen.add(normalized);
    applyEnvFile(normalized, env);
  }

  envLoaded = true;
};

ensureServerEnvLoaded();

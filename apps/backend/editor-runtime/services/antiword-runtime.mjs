import process from "node:process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "..", "..", "..", "..");
const isWindows = process.platform === "win32";

const vendoredRoot = join(repoRoot, ".tools", "antiword-app");
const vendoredBinPath = join(
  vendoredRoot,
  "bin",
  isWindows ? "antiword.exe" : "antiword",
);
const vendoredHomePath = join(vendoredRoot, "Resources");

const legacyWindowsRoot = "C:\\antiword";
const legacyWindowsBinPath = join(legacyWindowsRoot, "antiword.exe");
const legacyWindowsHomePath = join(legacyWindowsRoot, "Resources");
const antiwordHomeResourceFiles = ["Default", "fontnames"];

const systemDefaultAntiwordPath = isWindows ? "antiword.exe" : "antiword";
const systemDefaultAntiwordHome = isWindows
  ? vendoredHomePath
  : "/usr/share/antiword";

const resolveDefaultAntiwordPath = () => {
  if (existsSync(vendoredBinPath)) return vendoredBinPath;
  if (isWindows && existsSync(legacyWindowsBinPath))
    return legacyWindowsBinPath;
  return systemDefaultAntiwordPath;
};

const hasAntiwordHomeResources = (homePath, exists) =>
  exists(homePath) &&
  antiwordHomeResourceFiles.every((fileName) => exists(join(homePath, fileName)));

const resolveDefaultAntiwordHomeForRuntime = ({
  exists = existsSync,
  isWindows: runtimeIsWindows = isWindows,
  legacyWindowsRoot: runtimeLegacyWindowsRoot = legacyWindowsRoot,
  vendoredHomePath: runtimeVendoredHomePath = vendoredHomePath,
} = {}) => {
  if (hasAntiwordHomeResources(runtimeVendoredHomePath, exists)) {
    return runtimeVendoredHomePath;
  }

  if (runtimeIsWindows) {
    const legacyHomeCandidates = [
      join(runtimeLegacyWindowsRoot, "Resources"),
      runtimeLegacyWindowsRoot,
    ];
    const existingHome = legacyHomeCandidates.find((homePath) =>
      hasAntiwordHomeResources(homePath, exists),
    );
    if (existingHome) {
      return existingHome;
    }
  }

  return systemDefaultAntiwordHome;
};

const resolveDefaultAntiwordHome = () => resolveDefaultAntiwordHomeForRuntime();

const inferRuntimeSource = (antiwordPath, antiwordHome) => {
  if (process.env.ANTIWORD_PATH?.trim() || process.env.ANTIWORDHOME?.trim()) {
    return "env";
  }
  if (antiwordPath === vendoredBinPath || antiwordHome === vendoredHomePath) {
    return "vendored";
  }
  if (
    isWindows &&
    (antiwordPath === legacyWindowsBinPath ||
      antiwordHome === legacyWindowsHomePath ||
      antiwordHome === legacyWindowsRoot)
  ) {
    return "windows-legacy";
  }
  return "path-default";
};

const DEFAULT_ANTIWORD_PATH = resolveDefaultAntiwordPath();
const DEFAULT_ANTIWORD_HOME = resolveDefaultAntiwordHome();

const resolveAntiwordRuntime = () => {
  const antiwordPath =
    process.env.ANTIWORD_PATH?.trim() || DEFAULT_ANTIWORD_PATH;
  const antiwordHome =
    process.env.ANTIWORDHOME?.trim() || DEFAULT_ANTIWORD_HOME;

  return {
    antiwordPath,
    antiwordHome,
    runtimeSource: inferRuntimeSource(antiwordPath, antiwordHome),
    vendoredBinPath,
    vendoredHomePath,
    systemDefaultAntiwordPath,
    systemDefaultAntiwordHome,
  };
};

export {
  DEFAULT_ANTIWORD_PATH,
  DEFAULT_ANTIWORD_HOME,
  resolveAntiwordRuntime,
  resolveDefaultAntiwordHomeForRuntime,
  vendoredBinPath as VENDORED_ANTIWORD_PATH,
  vendoredHomePath as VENDORED_ANTIWORD_HOME,
};

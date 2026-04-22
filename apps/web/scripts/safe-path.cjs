/**
 * SECURITY: Safe path resolution utilities
 *
 * Prevents path traversal attacks by validating that resolved paths
 * remain within the project directory
 */

const path = require("path");
const fs = require("fs");

function safeResolve(basePath, ...userPaths) {
  if (!basePath || typeof basePath !== "string") {
    throw new Error("SECURITY: Base path must be a non-empty string");
  }

  for (const userPath of userPaths) {
    if (typeof userPath !== "string") {
      throw new Error("SECURITY: All path segments must be strings");
    }
    if (userPath.startsWith("/") && userPath.includes("..")) {
      throw new Error(
        `SECURITY: Potential path traversal detected in "${userPath}"`
      );
    }
  }

  const absoluteBase = path.resolve(basePath);
  const joinedUserPath = userPaths.length > 0 ? path.join(...userPaths) : "";
  const resolvedPath = path.resolve(absoluteBase, joinedUserPath);
  const normalizedBase = path.normalize(absoluteBase + path.sep);
  const normalizedResolved = path.normalize(resolvedPath + path.sep);

  if (!normalizedResolved.startsWith(normalizedBase)) {
    throw new Error(
      `SECURITY: Path traversal attempt detected. ` +
        `Path "${joinedUserPath}" would escape base directory "${basePath}"`
    );
  }

  return resolvedPath;
}

function safeJoin(basePath, ...pathSegments) {
  for (const segment of pathSegments) {
    if (typeof segment !== "string") {
      throw new Error("SECURITY: All path segments must be strings");
    }
    if (segment.startsWith("/") && segment.includes("..")) {
      throw new Error(
        `SECURITY: Potential path traversal in segment "${segment}"`
      );
    }
  }

  return safeResolve(basePath, ...pathSegments);
}

function isPathSafe(basePath, targetPath) {
  try {
    const safe = safeResolve(basePath, targetPath);
    return fs.existsSync(safe);
  } catch {
    return false;
  }
}

module.exports = {
  safeResolve,
  safeJoin,
  isPathSafe,
};

import path from "node:path";

import { toPosixPath } from "./utils";

/**
 * Parse workspace patterns from YAML content
 */
export function parseWorkspacePatterns(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-+\s*/, "").replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * Extract port number from script string
 */
export function extractPortFromScript(script: string | undefined): number | null {
  if (!script) {
    return null;
  }

  const match = script.match(/-p\s+(\d{2,5})/);
  return match ? Number(match[1]) : null;
}

/**
 * Extract backend port from doctor script output
 */
export function extractBackendPortFromDoctor(content: string): number | null {
  const match = content.match(/Port\s+(\d{2,5})\s+\(backend\)/);
  return match ? Number(match[1]) : null;
}

/**
 * Extract Specify IDE targets from script content
 */
export function extractSpecifyTargets(content: string): string[] {
  const matches = content.matchAll(/Join-Path \$REPO_ROOT '([^']+)'/g);
  return [...matches]
    .map((match) => toPosixPath(match[1]))
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
}

/**
 * Check if content has merge conflict markers
 */
export function hasMergeMarkers(content: string): boolean {
  return /^(<<<<<<<|=======|>>>>>>>)/m.test(content);
}

/**
 * Check if content has legacy editor relative URLs
 */
export function hasLegacyEditorRelativeUrls(content: string): boolean {
  return (
    /^NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL=\/api\/file-extract/m.test(content) ||
    /^NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL=\/api\/final-review/m.test(content)
  );
}

/**
 * Check if content has legacy Vite editor variables
 */
export function hasLegacyViteEditorVars(content: string): boolean {
  return (
    /^VITE_FILE_IMPORT_BACKEND_URL=/m.test(content) ||
    /^VITE_AGENT_REVIEW_FAIL_OPEN=/m.test(content)
  );
}

/**
 * Get unique sorted array
 */
export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

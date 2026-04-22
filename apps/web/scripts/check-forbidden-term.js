#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
// SECURITY FIX: Import safe path utilities to prevent path traversal
const { safeResolve } = require("./safe-path");

const FORBIDDEN_TERM = "json";
const TARGET_FILES = [
  "src/lib/drama-analyst/services/backendService.ts",
  "src/lib/drama-analyst/services/geminiService.ts",
  "src/lib/drama-analyst/services/cacheService.ts",
  "src/lib/ai/gemini-service.ts",
  "src/lib/ai/stations/gemini-service.ts",
  "scripts/performance-report.js",
  "scripts/enforce-coverage.js",
];

function checkFile(filePath) {
  // SECURITY FIX: Use safe path resolution to prevent traversal attacks
  let fullPath;
  try {
    fullPath = safeResolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`🚨 SECURITY: Invalid path "${filePath}": ${error.message}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const lowerContent = content.toLowerCase();
  const forbiddenLower = FORBIDDEN_TERM.toLowerCase();

  if (lowerContent.includes(forbiddenLower)) {
    console.error(`❌ Forbidden term "${FORBIDDEN_TERM}" found in ${filePath}`);
    // Find lines
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(forbiddenLower)) {
        console.error(`   Line ${idx + 1}: ${line.trim()}`);
      }
    });
    return true;
  }

  return false;
}

console.log("🔍 Checking for forbidden term in targeted files...\n");

let hasForbidden = false;

TARGET_FILES.forEach((file) => {
  if (checkFile(file)) {
    hasForbidden = true;
  }
});

if (hasForbidden) {
  console.error("\n🚨 BUILD FAILED: Forbidden term found in files.");
  console.error("Please remove all occurrences of the forbidden term.");
  process.exit(1);
} else {
  console.log("✅ No forbidden term found. Proceeding...");
}

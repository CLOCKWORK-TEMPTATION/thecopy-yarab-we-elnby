#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
// SECURITY FIX: Import safe path utilities to prevent path traversal
const { safeResolve } = require("./safe-path");

function decodeRecord(text) {
  const lines = text.split("\n").filter((line) => line.trim());
  const result = {};
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    const value = line
      .slice(idx + 1)
      .replace(/\\=/g, "=")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\\\/g, "\\");
    result[key] = value;
  }
  return result;
}

function unflatten(flat) {
  // SECURITY FIX: Use Object.create(null) to prevent prototype pollution
  const result = Object.create(null);
  for (const [key, value] of Object.entries(flat)) {
    // SECURITY FIX: Validate key to prevent prototype pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      console.warn(`SECURITY: Skipping dangerous key: ${key}`);
      continue;
    }

    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      // SECURITY FIX: Check for dangerous property names
      if (
        part === "__proto__" ||
        part === "constructor" ||
        part === "prototype"
      ) {
        console.warn(`SECURITY: Skipping dangerous property: ${part}`);
        break;
      }
      if (!current[part]) current[part] = Object.create(null);
      current = current[part];
    }
    const lastKey = parts[parts.length - 1];
    // SECURITY FIX: Final check for dangerous keys
    if (
      lastKey === "__proto__" ||
      lastKey === "constructor" ||
      lastKey === "prototype"
    ) {
      console.warn(`SECURITY: Skipping dangerous final key: ${lastKey}`);
      continue;
    }
    const numValue = parseFloat(value);
    current[lastKey] = isNaN(numValue) ? value : numValue;
  }
  return result;
}

const ABSOLUTE_MINIMUMS = {
  global: { lines: 85, functions: 90, branches: 85, statements: 85 },
  ai: { lines: 95, functions: 100, branches: 95, statements: 95 },
  lib: { lines: 95, functions: 95, branches: 95, statements: 95 },
  components: { lines: 85, functions: 90, branches: 85, statements: 85 },
};

// SECURITY FIX: Use safe path resolution to prevent traversal attacks
const summaryPath = safeResolve(
  process.cwd(),
  "reports/unit/coverage-summary.txt"
);

if (!fs.existsSync(summaryPath)) {
  console.error("❌ FATAL: Coverage summary file not found");
  console.error("📁 Expected at:", summaryPath);
  console.error("💡 Run: npm run test:coverage");
  process.exit(1);
}

const summaryText = fs.readFileSync(summaryPath, "utf-8");
const flat = decodeRecord(summaryText);
const summary = unflatten(flat);
const failures = [];
const warnings = [];

console.log("\n🔍 Enforcing MANDATORY coverage thresholds...\n");

const total = summary.total;
console.log("📊 Global Coverage:");
console.log(
  `   Lines:      ${total.lines.pct.toFixed(2)}% (required: ${ABSOLUTE_MINIMUMS.global.lines}%)`
);
console.log(
  `   Functions:  ${total.functions.pct.toFixed(2)}% (required: ${ABSOLUTE_MINIMUMS.global.functions}%)`
);
console.log(
  `   Branches:   ${total.branches.pct.toFixed(2)}% (required: ${ABSOLUTE_MINIMUMS.global.branches}%)`
);
console.log(
  `   Statements: ${total.statements.pct.toFixed(2)}% (required: ${ABSOLUTE_MINIMUMS.global.statements}%)`
);

// فحص الحدود الإجمالية
["lines", "functions", "branches", "statements"].forEach((metric) => {
  const actual = total[metric].pct;
  const required = ABSOLUTE_MINIMUMS.global[metric];

  if (actual < required) {
    failures.push(
      `❌ Global ${metric}: ${actual.toFixed(2)}% < ${required}% (DEFICIT: ${(required - actual).toFixed(2)}%)`
    );
  }
});

// فحص ملفات محددة حسب المجلد
const fileCategories = {
  ai: /\/ai\//,
  lib: /\/lib\//,
  components: /\/components\//,
};

Object.entries(summary).forEach(([filePath, metrics]) => {
  if (filePath === "total") return;

  let category = "global";
  for (const [cat, regex] of Object.entries(fileCategories)) {
    if (regex.test(filePath)) {
      category = cat;
      break;
    }
  }

  const thresholds = ABSOLUTE_MINIMUMS[category];

  ["lines", "functions", "branches", "statements"].forEach((metric) => {
    const actual = metrics[metric].pct;
    const required = thresholds[metric];

    if (actual < required) {
      failures.push(
        `❌ ${filePath}\n   ${metric}: ${actual.toFixed(2)}% < ${required}% (category: ${category})`
      );
    } else if (actual < required + 5) {
      warnings.push(
        `⚠️  ${filePath}\n   ${metric}: ${actual.toFixed(2)}% (close to threshold: ${required}%)`
      );
    }
  });
});

console.log("\n" + "=".repeat(80));

if (failures.length > 0) {
  console.error("\n🚨 COVERAGE ENFORCEMENT FAILED\n");
  console.error(
    "The following files/metrics DO NOT meet mandatory thresholds:\n"
  );
  failures.forEach((failure) => console.error(failure));

  console.error("\n" + "=".repeat(80));
  console.error("\n📋 REQUIRED ACTIONS:");
  console.error("1. Add comprehensive tests for the failing files");
  console.error("2. Cover all branches, edge cases, and error paths");
  console.error("3. Re-run: npm run test:coverage");
  console.error("4. Verify: npm run enforce:coverage");
  console.error(
    "\n⛔ Merge/Commit BLOCKED until coverage requirements are met.\n"
  );

  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("\n⚠️  WARNING: Some files are close to thresholds:\n");
  warnings.forEach((warning) => console.warn(warning));
  console.warn("\n💡 Consider adding more tests to these files.\n");
}

console.log("\n✅ ALL MANDATORY COVERAGE THRESHOLDS MET");
console.log("🎉 Proceeding with merge/commit\n");

process.exit(0);

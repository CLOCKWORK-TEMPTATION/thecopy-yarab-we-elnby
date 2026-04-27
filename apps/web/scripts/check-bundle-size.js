#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Checks if bundle sizes are within defined budgets
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { gzip } = require("zlib");

const gzipAsync = promisify(gzip);
const readFileAsync = promisify(fs.readFile);

// Load performance budget configuration
const budgetPath = path.join(__dirname, "..", "performance-budget.json");
const budget = JSON.parse(fs.readFileSync(budgetPath, "utf8"));

// Next.js build output directory
const buildDir = path.join(__dirname, "..", ".next");

/**
 * Get file size in KB
 */
function getFileSizeKB(bytes) {
  return (bytes / 1024).toFixed(2);
}

/**
 * Parse size string to bytes (e.g., "500KB" -> 512000)
 */
function parseSizeToBytes(sizeStr) {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)(KB|MB|GB)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] || "KB").toUpperCase();

  const multipliers = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1024);
}

/**
 * Get gzipped size of a file
 */
async function getGzippedSize(filePath) {
  try {
    const content = await readFileAsync(filePath);
    const gzipped = await gzipAsync(content);
    return gzipped.length;
  } catch (error) {
    console.error(`Error gzipping file ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Find files matching a glob pattern
 */
function findFiles(dir, pattern) {
  const results = [];

  function traverse(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);

      files.forEach((file) => {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else {
          // Simple pattern matching
          if (pattern.includes("**")) {
            // SECURITY: Complete escaping of all regex special characters
            // Use placeholder for ** before escaping, then replace after
            const DOUBLE_STAR_PLACEHOLDER = "__DOUBLESTAR__";
            const SINGLE_STAR_PLACEHOLDER = "__SINGLESTAR__";
            const QUESTION_PLACEHOLDER = "__QUESTION__";

            try {
              const escapedPattern = pattern
                .replace(/\*\*/g, DOUBLE_STAR_PLACEHOLDER) // Preserve ** before escaping
                .replace(/\*/g, SINGLE_STAR_PLACEHOLDER) // Preserve * before escaping
                .replace(/\?/g, QUESTION_PLACEHOLDER) // Preserve ? before escaping
                .replace(/[.+^${}()|[\]\\-]/g, "\\$&") // Escape all regex special chars
                .replace(new RegExp(DOUBLE_STAR_PLACEHOLDER, "g"), ".*") // Convert ** to .*
                .replace(new RegExp(SINGLE_STAR_PLACEHOLDER, "g"), "[^/]*") // Convert * to [^/]*
                .replace(new RegExp(QUESTION_PLACEHOLDER, "g"), "."); // Convert ? to .

              const regex = new RegExp(escapedPattern);
              if (regex.test(fullPath)) {
                results.push(fullPath);
              }
            } catch {
              // Skip invalid patterns
              console.warn(`Invalid glob pattern: ${pattern}`);
            }
          } else if (fullPath.endsWith(pattern)) {
            results.push(fullPath);
          }
        }
      });
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  traverse(dir);
  return results;
}

/**
 * Check a single budget rule
 */
async function checkBudget(budgetRule) {
  const files = findFiles(buildDir, budgetRule.path);

  if (files.length === 0) {
    return {
      passed: true,
      name: budgetRule.name,
      message: "No files found",
      files: [],
    };
  }

  const maxBytes = parseSizeToBytes(budgetRule.maxSize);
  const results = [];
  let totalSize = 0;
  let passed = true;

  for (const file of files) {
    const stats = fs.statSync(file);
    let size = stats.size;

    if (budgetRule.gzip) {
      size = await getGzippedSize(file);
    }

    totalSize += size;

    const exceeds = size > maxBytes;
    if (exceeds) {
      passed = false;
    }

    results.push({
      file: path.relative(buildDir, file),
      size: getFileSizeKB(size),
      gzipped: budgetRule.gzip || false,
      exceeds,
    });
  }

  return {
    passed,
    name: budgetRule.name,
    budget: budgetRule.maxSize,
    totalSize: getFileSizeKB(totalSize),
    gzipped: budgetRule.gzip || false,
    files: results.filter((r) => r.exceeds),
  };
}

/**
 * Main function
 */
async function main() {
  console.log("🔍 Checking performance budgets...\n");

  if (!fs.existsSync(buildDir)) {
    console.error(
      "❌ Build directory not found. Please run `pnpm build` first."
    );
    process.exit(1);
  }

  const results = [];
  let allPassed = true;

  for (const budgetRule of budget.budgets) {
    const result = await checkBudget(budgetRule);
    results.push(result);

    if (!result.passed) {
      allPassed = false;
    }
  }

  // Print results
  console.log("📊 Budget Check Results:\n");

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    const gzipText = result.gzipped ? " (gzipped)" : "";

    console.log(`${icon} ${result.name}`);
    if (result.files.length > 0) {
      console.log(`   Budget: ${result.budget}${gzipText}`);
      console.log(`   Total: ${result.totalSize} KB${gzipText}`);
      console.log("   Exceeded files:");
      result.files.forEach((file) => {
        console.log(`     - ${file.file}: ${file.size} KB`);
      });
    } else {
      console.log(
        `   ${result.message || `Total: ${result.totalSize} KB${gzipText}`}`
      );
    }
    console.log("");
  }

  // Summary
  if (allPassed) {
    console.log("✅ All performance budgets passed!");
    process.exit(0);
  } else {
    console.log("❌ Some performance budgets exceeded!");
    console.log("   Please optimize bundle sizes or update budgets.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

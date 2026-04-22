#!/usr/bin/env node

/**
 * Performance Budget Checker
 *
 * This script checks if the built application meets the defined performance budgets.
 * It validates bundle sizes, Web Vitals estimates, and resource counts.
 *
 * Usage: node scripts/check-performance-budget.js
 *
 * Exit codes:
 *   0 - All budgets are met
 *   1 - One or more budgets exceeded
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { execSync } = require("child_process");

// Load performance budget configuration
const budgetConfig = require("../performance-budget.config.js");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "bright");
  console.log("=".repeat(60) + "\n");
}

function logResult(passed, message) {
  if (passed) {
    log(`✅ ${message}`, "green");
  } else {
    log(`❌ ${message}`, "red");
  }
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

// Calculate directory size recursively
function getDirectorySize(dirPath) {
  let totalSize = 0;

  function calculateSize(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stats = fs.statSync(currentPath);

    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach((file) => {
        calculateSize(path.join(currentPath, file));
      });
    } else {
      totalSize += stats.size;
    }
  }

  calculateSize(dirPath);
  return totalSize;
}

// Convert bytes to KB
function bytesToKB(bytes) {
  return Math.round(bytes / 1024);
}

// Convert bytes to MB
function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// Estimate compressed size (gzip compression ratio ~30%)
function estimateCompressedSize(bytes) {
  return Math.round(bytes * 0.3);
}

// Check JavaScript bundle size
function checkJavaScriptBudget(buildDir) {
  logHeader("📦 Checking JavaScript Bundle Budget");

  const chunksDir = path.join(buildDir, "static", "chunks");
  const pagesDir = path.join(buildDir, "static", "chunks", "pages");

  if (!fs.existsSync(chunksDir)) {
    logWarning("Chunks directory not found");
    return { passed: true, warnings: [] };
  }

  const totalJsSize = getDirectorySize(chunksDir);
  const totalJsKB = bytesToKB(totalJsSize);
  const compressedJsKB = bytesToKB(estimateCompressedSize(totalJsSize));

  const budget = budgetConfig.resourceSizes.javascript;
  const passed = compressedJsKB <= budget.total;

  logInfo(`Total JS size: ${totalJsKB} KB (uncompressed)`);
  logInfo(`Estimated compressed: ${compressedJsKB} KB`);
  logInfo(`Budget: ${budget.total} KB`);

  logResult(
    passed,
    `JavaScript bundle ${passed ? "within" : "exceeds"} budget`
  );

  // Check main bundle size
  const mainChunks = fs
    .readdirSync(chunksDir)
    .filter((file) => file.endsWith(".js") && file.includes("main"));

  if (mainChunks.length > 0) {
    const mainSize = mainChunks.reduce((total, file) => {
      return total + fs.statSync(path.join(chunksDir, file)).size;
    }, 0);

    const mainKB = bytesToKB(estimateCompressedSize(mainSize));
    const mainPassed = mainKB <= budget.mainBundle;

    logInfo(`Main bundle: ${mainKB} KB (compressed)`);
    logResult(
      mainPassed,
      `Main bundle ${mainPassed ? "within" : "exceeds"} budget`
    );
  }

  return {
    passed,
    totalJsKB: compressedJsKB,
    budget: budget.total,
  };
}

// Check CSS bundle size
function checkCSSBudget(buildDir) {
  logHeader("🎨 Checking CSS Bundle Budget");

  const staticDir = path.join(buildDir, "static");
  const cssFiles = [];

  function findCSSFiles(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        findCSSFiles(filePath);
      } else if (file.endsWith(".css")) {
        cssFiles.push(filePath);
      }
    });
  }

  findCSSFiles(staticDir);

  const totalCssSize = cssFiles.reduce((total, file) => {
    return total + fs.statSync(file).size;
  }, 0);

  const totalCssKB = bytesToKB(totalCssSize);
  const compressedCssKB = bytesToKB(estimateCompressedSize(totalCssSize));

  const budget = budgetConfig.resourceSizes.css;
  const passed = compressedCssKB <= budget.total;

  logInfo(`Total CSS size: ${totalCssKB} KB (uncompressed)`);
  logInfo(`Estimated compressed: ${compressedCssKB} KB`);
  logInfo(`Budget: ${budget.total} KB`);

  logResult(passed, `CSS bundle ${passed ? "within" : "exceeds"} budget`);

  return {
    passed,
    totalCssKB: compressedCssKB,
    budget: budget.total,
  };
}

// Check total page weight
function checkPageWeightBudget(buildDir) {
  logHeader("⚖️  Checking Total Page Weight Budget");

  const staticDir = path.join(buildDir, "static");
  const totalSize = getDirectorySize(staticDir);
  const totalKB = bytesToKB(totalSize);
  const compressedKB = bytesToKB(estimateCompressedSize(totalSize));

  const budget = budgetConfig.resourceSizes.pageWeight;
  const passed = compressedKB <= budget.firstLoad;

  logInfo(`Total static size: ${totalKB} KB (uncompressed)`);
  logInfo(`Estimated compressed: ${compressedKB} KB`);
  logInfo(`Budget: ${budget.firstLoad} KB`);

  logResult(
    passed,
    `Total page weight ${passed ? "within" : "exceeds"} budget`
  );

  return {
    passed,
    totalKB: compressedKB,
    budget: budget.firstLoad,
  };
}

// Check build manifest for chunk analysis
function checkBuildManifest(buildDir) {
  logHeader("📋 Analyzing Build Manifest");

  const manifestPath = path.join(buildDir, "build-manifest.json");

  if (!fs.existsSync(manifestPath)) {
    logWarning("Build manifest not found");
    return { passed: true };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const pages = Object.keys(manifest.pages || {});

  logInfo(`Total pages: ${pages.length}`);

  // Check for duplicate chunks
  const allChunks = [];
  Object.values(manifest.pages || {}).forEach((pageChunks) => {
    allChunks.push(...pageChunks);
  });

  const uniqueChunks = new Set(allChunks);
  const duplicateCount = allChunks.length - uniqueChunks.size;

  logInfo(`Total chunks: ${allChunks.length}`);
  logInfo(`Unique chunks: ${uniqueChunks.size}`);

  if (duplicateCount > 0) {
    logWarning(
      `Found ${duplicateCount} duplicate chunk references (may be intentional)`
    );
  }

  return { passed: true };
}

// Check for large individual files
function checkLargeFiles(buildDir) {
  logHeader("📊 Checking for Large Files");

  const staticDir = path.join(buildDir, "static");
  const largeFiles = [];
  const maxChunkSizeKB = budgetConfig.bundleAnalysis.maxChunkSize;

  function findLargeFiles(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        findLargeFiles(filePath);
      } else if (file.endsWith(".js") || file.endsWith(".css")) {
        const sizeKB = bytesToKB(stats.size);
        const compressedKB = bytesToKB(estimateCompressedSize(stats.size));

        if (compressedKB > maxChunkSizeKB) {
          largeFiles.push({
            name: file,
            size: sizeKB,
            compressed: compressedKB,
            path: path.relative(buildDir, filePath),
          });
        }
      }
    });
  }

  findLargeFiles(staticDir);

  if (largeFiles.length > 0) {
    logWarning(
      `Found ${largeFiles.length} files exceeding ${maxChunkSizeKB} KB (compressed):`
    );
    largeFiles.forEach((file) => {
      logInfo(`  ${file.name}: ${file.compressed} KB (compressed)`);
    });
    return { passed: false, largeFiles };
  } else {
    logResult(true, `No files exceed ${maxChunkSizeKB} KB budget`);
    return { passed: true, largeFiles: [] };
  }
}

// Generate performance report
function generateReport(results) {
  logHeader("📊 Performance Budget Summary");

  const allPassed = results.every((r) => r.passed);

  console.log("");
  results.forEach((result) => {
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  });

  console.log("\n" + "=".repeat(60));

  if (allPassed) {
    log("🎉 All performance budgets are met!", "green");
  } else {
    log("⚠️  Some performance budgets exceeded!", "red");
    console.log("\nRecommendations:");
    console.log("- Use code splitting to reduce bundle size");
    console.log("- Implement dynamic imports for heavy components");
    console.log("- Optimize and compress images");
    console.log("- Remove unused dependencies");
    console.log("- Use tree shaking to eliminate dead code");
  }

  console.log("=".repeat(60) + "\n");

  return allPassed;
}

// Main execution
function main() {
  const buildDir = path.join(process.cwd(), ".next");

  if (!fs.existsSync(buildDir)) {
    log("❌ Build directory not found. Run `npm run build` first.", "red");
    process.exit(1);
  }

  log("🔍 Checking Performance Budget...", "bright");

  const results = [];

  // Run all checks
  try {
    const jsCheck = checkJavaScriptBudget(buildDir);
    results.push({
      name: "JavaScript Bundle Size",
      passed: jsCheck.passed,
      details: jsCheck.totalJsKB
        ? `${jsCheck.totalJsKB} KB / ${jsCheck.budget} KB`
        : "",
    });

    const cssCheck = checkCSSBudget(buildDir);
    results.push({
      name: "CSS Bundle Size",
      passed: cssCheck.passed,
      details: cssCheck.totalCssKB
        ? `${cssCheck.totalCssKB} KB / ${cssCheck.budget} KB`
        : "",
    });

    const pageWeightCheck = checkPageWeightBudget(buildDir);
    results.push({
      name: "Total Page Weight",
      passed: pageWeightCheck.passed,
      details: pageWeightCheck.totalKB
        ? `${pageWeightCheck.totalKB} KB / ${pageWeightCheck.budget} KB`
        : "",
    });

    const manifestCheck = checkBuildManifest(buildDir);
    results.push({
      name: "Build Manifest Analysis",
      passed: manifestCheck.passed,
    });

    const largeFilesCheck = checkLargeFiles(buildDir);
    results.push({
      name: "Large Files Check",
      passed: largeFilesCheck.passed,
      details: largeFilesCheck.largeFiles?.length
        ? `${largeFilesCheck.largeFiles.length} files exceed budget`
        : "",
    });

    // Generate final report
    const allPassed = generateReport(results);

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    log(`❌ Error checking performance budget: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

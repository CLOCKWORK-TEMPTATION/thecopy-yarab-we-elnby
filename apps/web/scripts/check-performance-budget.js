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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

import budgetConfig from "../performance-budget.config.js";

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

// Convert bytes to KB
function bytesToKB(bytes) {
  return Math.round(bytes / 1024);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toStaticPath(buildDir, assetPath) {
  return path.join(buildDir, ...assetPath.split("/"));
}

function fileSize(filePath) {
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function gzipFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return zlib.gzipSync(fs.readFileSync(filePath)).length;
}

function listFiles(dirPath) {
  const files = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else {
        files.push(entryPath);
      }
    }
  }

  walk(dirPath);
  return files;
}

function uniqueAssets(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseClientReferenceManifest(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/__RSC_MANIFEST\["([^"]+)"\]=(.*);$/s);
  if (!match) return null;

  return {
    route: match[1],
    manifest: JSON.parse(match[2]),
  };
}

function findClientReferenceManifests(buildDir) {
  const appDir = path.join(buildDir, "server", "app");
  if (!fs.existsSync(appDir)) return [];

  return listFiles(appDir).filter((filePath) =>
    filePath.endsWith("_client-reference-manifest.js")
  );
}

function collectFontAssets(buildDir) {
  const mediaDir = path.join(buildDir, "static", "media");
  return listFiles(mediaDir)
    .filter((filePath) => /\.(?:woff2?|ttf|otf)$/i.test(filePath))
    .map((filePath) =>
      path.relative(buildDir, filePath).split(path.sep).join("/")
    );
}

function collectRouteAssets(buildDir) {
  const buildManifestPath = path.join(buildDir, "build-manifest.json");
  const buildManifest = fs.existsSync(buildManifestPath)
    ? readJson(buildManifestPath)
    : {};
  const rootMainFiles = buildManifest.rootMainFiles ?? [];
  const fontAssets = collectFontAssets(buildDir);

  return findClientReferenceManifests(buildDir)
    .map(parseClientReferenceManifest)
    .filter(Boolean)
    .filter(({ route }) => !route.startsWith("/api/"))
    .map(({ route, manifest }) => {
      const jsAssets = [...rootMainFiles];
      for (const clientModule of Object.values(manifest.clientModules ?? {})) {
        for (const chunk of clientModule.chunks ?? []) {
          if (typeof chunk === "string" && chunk.endsWith(".js")) {
            jsAssets.push(chunk);
          }
        }
      }

      const cssAssets = [];
      for (const cssEntries of Object.values(manifest.entryCSSFiles ?? {})) {
        for (const cssEntry of cssEntries ?? []) {
          if (cssEntry?.path?.endsWith(".css")) {
            cssAssets.push(cssEntry.path);
          }
        }
      }

      const js = uniqueAssets(jsAssets);
      const css = uniqueAssets(cssAssets);
      const fonts = uniqueAssets(fontAssets);
      const sumRaw = (assets) =>
        assets.reduce(
          (total, asset) => total + fileSize(toStaticPath(buildDir, asset)),
          0
        );
      const sumGzip = (assets) =>
        assets.reduce(
          (total, asset) => total + gzipFileSize(toStaticPath(buildDir, asset)),
          0
        );

      return {
        route,
        js,
        css,
        fonts,
        jsRawBytes: sumRaw(js),
        cssRawBytes: sumRaw(css),
        fontRawBytes: sumRaw(fonts),
        jsGzipBytes: sumGzip(js),
        cssGzipBytes: sumGzip(css),
        fontGzipBytes: sumGzip(fonts),
      };
    });
}

function getWorstRoute(routeAssets, selector) {
  return [...routeAssets].sort((a, b) => selector(b) - selector(a))[0];
}

// Check JavaScript bundle size
function checkJavaScriptBudget(routeAssets) {
  logHeader("📦 Checking JavaScript Bundle Budget");

  if (routeAssets.length === 0) {
    return {
      passed: false,
      details: "No client route manifests found for budget analysis",
    };
  }

  const budget = budgetConfig.resourceSizes.javascript;
  const worstRoute = getWorstRoute(routeAssets, (route) => route.jsGzipBytes);
  const worstRouteKB = bytesToKB(worstRoute.jsGzipBytes);
  const passed = routeAssets.every(
    (route) => bytesToKB(route.jsGzipBytes) <= budget.total
  );

  logInfo(`Routes checked: ${routeAssets.length}`);
  logInfo(`Worst route: ${worstRoute.route}`);
  logInfo(`Worst route JS: ${worstRouteKB} KB (gzip)`);
  logInfo(`Budget: ${budget.total} KB per initial route load`);

  logResult(
    passed,
    `JavaScript initial route load ${passed ? "within" : "exceeds"} budget`
  );

  return {
    passed,
    totalJsKB: worstRouteKB,
    budget: budget.total,
    details: `${worstRouteKB} KB / ${budget.total} KB on ${worstRoute.route}`,
  };
}

// Check CSS bundle size
function checkCSSBudget(routeAssets) {
  logHeader("🎨 Checking CSS Bundle Budget");

  const budget = budgetConfig.resourceSizes.css;
  const worstRoute = getWorstRoute(routeAssets, (route) => route.cssGzipBytes);
  const worstRouteKB = bytesToKB(worstRoute.cssGzipBytes);
  const passed = routeAssets.every(
    (route) => bytesToKB(route.cssGzipBytes) <= budget.total
  );

  logInfo(`Routes checked: ${routeAssets.length}`);
  logInfo(`Worst route: ${worstRoute.route}`);
  logInfo(`Worst route CSS: ${worstRouteKB} KB (gzip)`);
  logInfo(`Budget: ${budget.total} KB per initial route load`);

  logResult(
    passed,
    `CSS initial route load ${passed ? "within" : "exceeds"} budget`
  );

  return {
    passed,
    totalCssKB: worstRouteKB,
    budget: budget.total,
    details: `${worstRouteKB} KB / ${budget.total} KB on ${worstRoute.route}`,
  };
}

// Check total page weight
function checkPageWeightBudget(routeAssets) {
  logHeader("⚖️  Checking Total Page Weight Budget");

  const budget = budgetConfig.resourceSizes.pageWeight;
  const routeWeight = (route) =>
    route.jsGzipBytes + route.cssGzipBytes + route.fontGzipBytes;
  const worstRoute = getWorstRoute(routeAssets, routeWeight);
  const worstRouteKB = bytesToKB(routeWeight(worstRoute));
  const passed = routeAssets.every(
    (route) => bytesToKB(routeWeight(route)) <= budget.firstLoad
  );

  logInfo(`Routes checked: ${routeAssets.length}`);
  logInfo(`Worst route: ${worstRoute.route}`);
  logInfo(`Worst route page weight: ${worstRouteKB} KB (gzip)`);
  logInfo(`Budget: ${budget.firstLoad} KB per first load`);

  logResult(
    passed,
    `First-load page weight ${passed ? "within" : "exceeds"} budget`
  );

  return {
    passed,
    totalKB: worstRouteKB,
    budget: budget.firstLoad,
    details: `${worstRouteKB} KB / ${budget.firstLoad} KB on ${worstRoute.route}`,
  };
}

// Check build manifest for chunk analysis
function checkBuildManifest(routeAssets) {
  logHeader("📋 Analyzing Build Manifest");

  logInfo(`Client routes: ${routeAssets.length}`);

  // Check for duplicate chunks
  const allChunks = routeAssets.flatMap((route) => route.js);

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

  for (const filePath of listFiles(staticDir)) {
    if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
      const sizeKB = bytesToKB(fileSize(filePath));
      const compressedKB = bytesToKB(gzipFileSize(filePath));

      if (compressedKB > maxChunkSizeKB) {
        largeFiles.push({
          name: path.basename(filePath),
          size: sizeKB,
          compressed: compressedKB,
          path: path.relative(buildDir, filePath),
        });
      }
    }
  }

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
    log(
      "❌ Build directory not found. Run `pnpm --filter @the-copy/web build` first.",
      "red"
    );
    process.exit(1);
  }

  log("🔍 Checking Performance Budget...", "bright");

  const results = [];
  const routeAssets = collectRouteAssets(buildDir);

  // Run all checks
  try {
    const jsCheck = checkJavaScriptBudget(routeAssets);
    results.push({
      name: "JavaScript Bundle Size",
      passed: jsCheck.passed,
      details: jsCheck.details,
    });

    const cssCheck = checkCSSBudget(routeAssets);
    results.push({
      name: "CSS Bundle Size",
      passed: cssCheck.passed,
      details: cssCheck.details,
    });

    const pageWeightCheck = checkPageWeightBudget(routeAssets);
    results.push({
      name: "Total Page Weight",
      passed: pageWeightCheck.passed,
      details: pageWeightCheck.details,
    });

    const manifestCheck = checkBuildManifest(routeAssets);
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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { main };

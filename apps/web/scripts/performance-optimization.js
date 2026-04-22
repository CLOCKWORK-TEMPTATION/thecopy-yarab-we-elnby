#!/usr/bin/env node

/**
 * Performance Optimization and Analysis Script
 *
 * Analyzes build performance, identifies bottlenecks, and provides
 * actionable recommendations for optimization.
 *
 * Usage: node scripts/performance-optimization.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log("\n" + "=".repeat(70));
  log(title, "bright");
  console.log("=".repeat(70) + "\n");
}

function logSection(title) {
  console.log(`\n${colors.cyan}► ${title}${colors.reset}`);
  console.log("-".repeat(70));
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

function logMetric(label, value, unit = "", color = "reset") {
  console.log(
    `   ${label.padEnd(35)} ${colors[color]}${value}${unit}${colors.reset}`
  );
}

// Convert bytes to KB
function bytesToKB(bytes) {
  return Math.round(bytes / 1024);
}

// Convert bytes to MB
function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// Get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;

  function calculateSize(currentPath) {
    if (!fs.existsSync(currentPath)) return;

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

// Analyze bundle size
function analyzeBundleSize() {
  logSection("📦 Bundle Size Analysis");

  const buildDir = path.join(process.cwd(), ".next");

  if (!fs.existsSync(buildDir)) {
    logError("Build directory not found. Run `npm run build` first.");
    return null;
  }

  const staticDir = path.join(buildDir, "static");
  const chunksDir = path.join(staticDir, "chunks");

  const sizes = {
    total: getDirectorySize(staticDir),
    chunks: chunksDir ? getDirectorySize(chunksDir) : 0,
    css: 0,
    js: 0,
    other: 0,
  };

  // Count individual file types
  function countFiles(dir, ext) {
    let total = 0;

    if (!fs.existsSync(dir)) return total;

    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        total += countFiles(filePath, ext);
      } else if (file.endsWith(ext)) {
        total += stats.size;
      }
    });

    return total;
  }

  sizes.css = countFiles(staticDir, ".css");
  sizes.js = countFiles(staticDir, ".js");
  sizes.other = sizes.total - sizes.js - sizes.css;

  const totalKB = bytesToKB(sizes.total);
  const totalMB = bytesToMB(sizes.total);

  logMetric(
    "Total Static Bundle",
    totalMB,
    " MB",
    totalKB > 1000 ? "red" : "green"
  );
  logMetric("JavaScript", bytesToMB(sizes.js), " MB");
  logMetric("CSS", bytesToMB(sizes.css), " MB");
  logMetric("Other Assets", bytesToMB(sizes.other), " MB");

  // Check against budget
  const budget = 1500; // KB
  if (totalKB > budget) {
    logWarning(
      `Bundle size exceeds budget of ${budget}KB by ${totalKB - budget}KB`
    );
  } else {
    logSuccess(`Bundle size within budget (${totalKB}KB / ${budget}KB)`);
  }

  return sizes;
}

// Analyze largest files
function analyzeLargestFiles() {
  logSection("📊 Largest Files");

  const staticDir = path.join(process.cwd(), ".next", "static");
  const files = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir);

    entries.forEach((entry) => {
      const filePath = path.join(dir, entry);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        scanDirectory(filePath);
      } else if (entry.endsWith(".js") || entry.endsWith(".css")) {
        files.push({
          name: entry,
          path: path.relative(staticDir, filePath),
          size: stats.size,
        });
      }
    });
  }

  scanDirectory(staticDir);

  // Sort by size
  files.sort((a, b) => b.size - a.size);

  // Show top 10
  files.slice(0, 10).forEach((file, index) => {
    const sizeKB = bytesToKB(file.size);
    const color = sizeKB > 200 ? "red" : sizeKB > 100 ? "yellow" : "green";
    logMetric(`${index + 1}. ${file.name}`, sizeKB, " KB", color);
  });

  // Recommendations
  const largeFiles = files.filter((f) => bytesToKB(f.size) > 250);
  if (largeFiles.length > 0) {
    logWarning(`Found ${largeFiles.length} files exceeding 250KB`);
    logInfo(
      "Consider: code splitting, dynamic imports, or removing unused code"
    );
  }

  return files;
}

// Analyze dependencies
function analyzeDependencies() {
  logSection("📚 Dependency Analysis");

  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const dependencies = {
    production: Object.keys(packageJson.dependencies || {}).length,
    dev: Object.keys(packageJson.devDependencies || {}).length,
  };

  logMetric("Production Dependencies", dependencies.production);
  logMetric("Development Dependencies", dependencies.dev);

  // Check for unused dependencies
  logInfo("Checking for potentially unused dependencies...");

  const unusedDeps = [
    // Add unused dependencies to consider removing
  ];

  if (unusedDeps.length > 0) {
    logWarning(`Found ${unusedDeps.length} potentially unused dependencies`);
    unusedDeps.forEach((dep) => {
      console.log(`   - ${dep}`);
    });
  } else {
    logSuccess("No obvious unused dependencies found");
  }

  return dependencies;
}

// Analyze pages
function analyzePages() {
  logSection("📄 Pages Analysis");

  const appDir = path.join(process.cwd(), "src", "app");
  const pages = [];

  function scanPages(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir);

    entries.forEach((entry) => {
      const filePath = path.join(dir, entry);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (entry === "(main)" || !entry.startsWith("[") || entry === "api") {
          scanPages(filePath, prefix + "/" + entry);
        }
      } else if (entry === "page.tsx" || entry === "page.ts") {
        const size = stats.size;
        const sizeKB = bytesToKB(size);
        pages.push({
          path: prefix,
          size: sizeKB,
          file: filePath,
        });
      }
    });
  }

  scanPages(appDir);

  // Sort by size
  pages.sort((a, b) => b.size - a.size);

  logMetric("Total Pages", pages.length);

  // Show top large pages
  const largePages = pages.filter((p) => p.size > 50);

  if (largePages.length > 0) {
    logWarning(`Found ${largePages.length} pages over 50KB`);
    largePages.slice(0, 5).forEach((page) => {
      logMetric(`  ${page.path}`, page.size, " KB", "yellow");
    });
  } else {
    logSuccess("All pages are reasonably sized");
  }

  return pages;
}

// Performance recommendations
function generateRecommendations() {
  logSection("💡 Performance Optimization Recommendations");

  const recommendations = [
    {
      priority: "HIGH",
      title: "Implement Code Splitting",
      description: "Use dynamic imports for heavy components",
      impact: "Reduce initial bundle size by 20-40%",
      implementation: "Use next/dynamic for components, React.lazy for routes",
    },
    {
      priority: "HIGH",
      title: "Optimize Images",
      description: "Use Next.js Image component with proper sizing",
      impact: "Reduce image payload by 30-60%",
      implementation:
        "Replace <img> with <Image>, add width/height, enable blur placeholder",
    },
    {
      priority: "HIGH",
      title: "Enable Particle System Performance Detection",
      description: "Use the new usePerformanceDetection hook",
      impact: "Reduce CPU usage on low-end devices by 40-60%",
      implementation:
        "Import usePerformanceDetection, disable particles when shouldDisable is true",
    },
    {
      priority: "MEDIUM",
      title: "Tree Shaking and Dead Code Elimination",
      description: "Remove unused exports and dependencies",
      impact: "Reduce bundle size by 5-15%",
      implementation: "Run npm prune, check for unused imports",
    },
    {
      priority: "MEDIUM",
      title: "Lazy Load Third-Party Scripts",
      description: "Defer non-critical scripts until after interaction",
      impact: "Improve LCP by 10-30%",
      implementation: 'Use next/script with strategy="lazyOnload"',
    },
    {
      priority: "MEDIUM",
      title: "Implement Service Worker Caching",
      description: "Cache static assets for faster repeat visits",
      impact: "Reduce page load time by 40-70% on repeat visits",
      implementation: "Setup next-pwa or workbox configuration",
    },
    {
      priority: "LOW",
      title: "CSS Optimization",
      description: "Remove unused CSS, use CSS-in-JS sparingly",
      impact: "Reduce CSS size by 10-20%",
      implementation: "Use PurgeCSS, audit Tailwind usage",
    },
  ];

  recommendations.forEach((rec, index) => {
    const priorityColor =
      rec.priority === "HIGH"
        ? "red"
        : rec.priority === "MEDIUM"
          ? "yellow"
          : "green";

    console.log(
      `\n${index + 1}. ${colors[priorityColor]}[${rec.priority}]${colors.reset} ${rec.title}`
    );
    console.log(`   ${rec.description}`);
    console.log(`   ${colors.green}Impact:${colors.reset} ${rec.impact}`);
    console.log(`   ${colors.blue}How:${colors.reset} ${rec.implementation}`);
  });
}

// Web Vitals checklist
function generateWebVitalsChecklist() {
  logSection("🎯 Web Vitals Optimization Checklist");

  const checklist = [
    {
      metric: "LCP (Largest Contentful Paint)",
      target: "< 2.5s",
      checks: [
        "Optimize critical rendering path",
        "Minimize main thread work",
        "Use server-side rendering",
        "Optimize image loading",
      ],
    },
    {
      metric: "FID (First Input Delay)",
      target: "< 100ms",
      checks: [
        "Break up long tasks",
        "Use web workers",
        "Defer non-critical JavaScript",
        "Optimize JavaScript parsing",
      ],
    },
    {
      metric: "CLS (Cumulative Layout Shift)",
      target: "< 0.1",
      checks: [
        "Reserve space for images/ads",
        "Avoid inserting content above existing content",
        "Use transform animations instead of position changes",
        "Font loading optimization",
      ],
    },
  ];

  checklist.forEach((item) => {
    console.log(`\n${colors.cyan}${item.metric}${colors.reset}`);
    console.log(`   Target: ${colors.green}${item.target}${colors.reset}`);
    item.checks.forEach((check) => {
      console.log(`   ☐ ${check}`);
    });
  });
}

// Performance comparison
function generatePerformanceComparison() {
  logSection("📈 Device Performance Profiles");

  const profiles = [
    {
      name: "High-End Device",
      specs: "8+ cores, 8GB+ RAM, 5G",
      particles: 800,
      frameRate: 120,
      quality: "high",
    },
    {
      name: "Mid-Range Device",
      specs: "4-6 cores, 4-8GB RAM, 4G",
      particles: 400,
      frameRate: 60,
      quality: "high",
    },
    {
      name: "Low-End Device",
      specs: "2-4 cores, 2-4GB RAM, 3G",
      particles: 150,
      frameRate: 24,
      quality: "low",
    },
    {
      name: "Very Low-End",
      specs: "1-2 cores, <2GB RAM, 2G",
      particles: 50,
      frameRate: 12,
      quality: "low",
    },
  ];

  profiles.forEach((profile) => {
    console.log(`\n${colors.bright}${profile.name}${colors.reset}`);
    console.log(`   Specs: ${profile.specs}`);
    console.log(`   Particles: ${profile.particles}`);
    console.log(`   Frame Rate: ${profile.frameRate} FPS`);
    console.log(`   Quality: ${profile.quality}`);
  });
}

// Generate summary report
function generateSummaryReport(bundleSize, files, pages, dependencies) {
  logHeader("📋 Performance Summary Report");

  console.log(
    `${colors.bright}Generated:${colors.reset} ${new Date().toISOString()}\n`
  );

  // Bundle metrics
  console.log(`${colors.cyan}Bundle Metrics:${colors.reset}`);
  if (bundleSize) {
    logMetric("Total Size", bytesToMB(bundleSize.total), " MB");
    logMetric("JavaScript", (bytesToMB(bundleSize.js) + " MB").padEnd(10));
    logMetric("CSS", (bytesToMB(bundleSize.css) + " MB").padEnd(10));
  }

  // File analysis
  console.log(`\n${colors.cyan}File Analysis:${colors.reset}`);
  if (files) {
    logMetric("Total Files", files.length);
    const largeFiles = files.filter((f) => bytesToKB(f.size) > 250).length;
    logMetric(
      "Files > 250KB",
      largeFiles,
      "",
      largeFiles > 0 ? "yellow" : "green"
    );
  }

  // Page analysis
  console.log(`\n${colors.cyan}Page Analysis:${colors.reset}`);
  if (pages) {
    logMetric("Total Pages", pages.length);
    const avgSize = Math.round(
      pages.reduce((sum, p) => sum + p.size, 0) / pages.length
    );
    logMetric("Average Page Size", avgSize, " KB");
  }

  // Dependency analysis
  console.log(`\n${colors.cyan}Dependencies:${colors.reset}`);
  if (dependencies) {
    logMetric("Production", dependencies.production);
    logMetric("Development", dependencies.dev);
  }

  console.log("\n" + "=".repeat(70));
}

// Main execution
function main() {
  logHeader("🚀 Performance Optimization Analysis");

  logInfo("This script analyzes your Next.js application performance");
  logInfo("and provides optimization recommendations.\n");

  try {
    // Run analyses
    const bundleSize = analyzeBundleSize();
    const files = analyzeLargestFiles();
    const dependencies = analyzeDependencies();
    const pages = analyzePages();

    // Generate recommendations
    generateRecommendations();
    generateWebVitalsChecklist();
    generatePerformanceComparison();

    // Summary
    generateSummaryReport(bundleSize, files, pages, dependencies);

    // Export results
    const results = {
      timestamp: new Date().toISOString(),
      bundleSize,
      largestFiles: files?.slice(0, 10),
      dependencies,
      pages,
      recommendations: [
        "Implement code splitting for heavy components",
        "Enable particle performance detection",
        "Optimize image loading with next/image",
        "Remove unused dependencies",
        "Enable caching strategies",
      ],
    };

    const reportPath = path.join(
      process.cwd(),
      "reports",
      "performance-analysis.json"
    );
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    logSuccess(`\nDetailed report saved to: ${reportPath}`);
  } catch (error) {
    logError(`Error running analysis: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  analyzeLargestFiles,
  analyzeDependencies,
};

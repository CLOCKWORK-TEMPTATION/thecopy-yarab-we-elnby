#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
// SECURITY FIX: Import safe path utilities to prevent path traversal
const { safeResolve } = require("./safe-path");

// UTILITY FUNCTIONS: Add missing encode/decode/unflatten functions
function encodeRecord(obj, prefix = "") {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      lines.push(...encodeRecord(value, fullKey));
    } else {
      const encodedValue = String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/=/g, "\\=");
      lines.push(`${fullKey}=${encodedValue}`);
    }
  }
  return lines.join("\n");
}

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

function generatePerformanceReport() {
  // SECURITY FIX: Use safe path resolution to prevent traversal attacks
  const reportsDir = safeResolve(process.cwd(), "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    bundleAnalysis: {
      target: "250KB compressed",
      status: "pending",
    },
    testCoverage: {
      target: "80%",
      status: "pending",
    },
    webVitals: {
      fcp: { target: "<1.8s", actual: null, status: "pending" },
      lcp: { target: "<2.5s", actual: null, status: "pending" },
      cls: { target: "<0.1", actual: null, status: "pending" },
      fid: { target: "<100ms", actual: null, status: "pending" },
      ttfb: { target: "<600ms", actual: null, status: "pending" },
    },
    e2eTests: {
      status: "pending",
    },
  };

  // Check if coverage report exists
  // SECURITY FIX: Use safe path resolution
  const coverageFile = safeResolve(
    reportsDir,
    path.join("unit", "coverage-summary.txt")
  );
  if (fs.existsSync(coverageFile)) {
    try {
      const coverageText = fs.readFileSync(coverageFile, "utf8");
      const flat = decodeRecord(coverageText);
      const coverage = unflatten(flat);
      const totalCoverage = coverage.total;

      report.testCoverage.lines = `${totalCoverage.lines.pct}%`;
      report.testCoverage.functions = `${totalCoverage.functions.pct}%`;
      report.testCoverage.branches = `${totalCoverage.branches.pct}%`;
      report.testCoverage.statements = `${totalCoverage.statements.pct}%`;

      const minCoverage = Math.min(
        totalCoverage.lines.pct,
        totalCoverage.functions.pct,
        totalCoverage.branches.pct,
        totalCoverage.statements.pct
      );

      report.testCoverage.status = minCoverage >= 80 ? "passed" : "failed";
    } catch (error) {
      // SECURITY FIX: Proper error logging instead of generic catch
      console.error(`Error reading coverage file: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
      report.testCoverage.status = "error";
      report.testCoverage.errorMessage = error.message;
    }
  }

  // Check if E2E report exists
  // SECURITY FIX: Use safe path resolution
  const e2eFile = safeResolve(reportsDir, path.join("e2e", "results.txt"));
  if (fs.existsSync(e2eFile)) {
    try {
      const e2eText = fs.readFileSync(e2eFile, "utf8");
      const flat = decodeRecord(e2eText);
      const e2eResults = unflatten(flat);
      report.e2eTests.passed = e2eResults.stats?.passed || 0;
      report.e2eTests.failed = e2eResults.stats?.failed || 0;
      report.e2eTests.status =
        e2eResults.stats?.failed === 0 ? "passed" : "failed";
    } catch (error) {
      // SECURITY FIX: Proper error logging instead of generic catch
      console.error(`Error reading E2E report: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
      report.e2eTests.status = "error";
      report.e2eTests.errorMessage = error.message;
    }
  }

  // Check Web Vitals from Sentry or other sources if available
  // SECURITY FIX: Use safe path resolution
  const webVitalsFile = safeResolve(reportsDir, "web-vitals.txt");
  if (fs.existsSync(webVitalsFile)) {
    try {
      const vitalsText = fs.readFileSync(webVitalsFile, "utf8");
      const flat = decodeRecord(vitalsText);
      const vitals = unflatten(flat);
      if (vitals.lcp) {
        report.webVitals.lcp.actual = `${(vitals.lcp / 1000).toFixed(2)}s`;
        report.webVitals.lcp.status = vitals.lcp <= 2500 ? "passed" : "failed";
      }
      if (vitals.fcp) {
        report.webVitals.fcp.actual = `${(vitals.fcp / 1000).toFixed(2)}s`;
        report.webVitals.fcp.status = vitals.fcp <= 1800 ? "passed" : "failed";
      }
      if (vitals.cls) {
        report.webVitals.cls.actual = vitals.cls.toFixed(3);
        report.webVitals.cls.status = vitals.cls <= 0.1 ? "passed" : "failed";
      }
      if (vitals.fid) {
        report.webVitals.fid.actual = `${vitals.fid}ms`;
        report.webVitals.fid.status = vitals.fid <= 100 ? "passed" : "failed";
      }
      if (vitals.ttfb) {
        report.webVitals.ttfb.actual = `${vitals.ttfb}ms`;
        report.webVitals.ttfb.status = vitals.ttfb <= 600 ? "passed" : "failed";
      }
    } catch (error) {
      // SECURITY FIX: Proper error logging with details
      console.error(`Error parsing Web Vitals data: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
      console.warn("Warning: Could not parse Web Vitals data");
    }
  }

  // SECURITY FIX: Use safe path resolution
  const reportFile = safeResolve(reportsDir, "performance-report.txt");
  const reportText = encodeRecord(report);
  fs.writeFileSync(reportFile, reportText);

  console.log("📊 Performance Report Generated");
  console.log("==============================");
  console.log(`Report saved to: ${reportFile}`);
  console.log(`Test Coverage: ${report.testCoverage.status}`);
  console.log(`E2E Tests: ${report.e2eTests.status}`);
  console.log(`Bundle Analysis: ${report.bundleAnalysis.status}`);
  console.log("\n📈 Web Vitals:");
  console.log(
    `  LCP: ${report.webVitals.lcp.actual || "N/A"} (target: ${report.webVitals.lcp.target})`
  );
  console.log(
    `  FCP: ${report.webVitals.fcp.actual || "N/A"} (target: ${report.webVitals.fcp.target})`
  );
  console.log(
    `  CLS: ${report.webVitals.cls.actual || "N/A"} (target: ${report.webVitals.cls.target})`
  );
  console.log(
    `  FID: ${report.webVitals.fid.actual || "N/A"} (target: ${report.webVitals.fid.target})`
  );
}

generatePerformanceReport();

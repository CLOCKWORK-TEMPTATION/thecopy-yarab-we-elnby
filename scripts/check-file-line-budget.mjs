#!/usr/bin/env node

/**
 * @file scripts/check-file-line-budget.mjs
 * @description Checks that no code file exceeds 600 lines.
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /test-results/,
  /\.git/
];
const MAX_LINES = 600;

function shouldExclude(path) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(path));
}

function countLines(content) {
  return content.split('\n').length;
}

function walk(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (shouldExclude(fullPath)) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (ALLOWED_EXTENSIONS.includes(extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const root = process.cwd();
  const files = walk(root);
  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = countLines(content);
    if (lines > MAX_LINES) {
      violations.push({ file, lines });
    }
  }

  if (violations.length > 0) {
    console.error('❌ Files exceeding 600 lines:');
    violations.forEach(({ file, lines }) => {
      console.error(`  ${lines} lines: ${file}`);
    });
    process.exit(1);
  } else {
    console.log('✅ All files are within the 600 line budget.');
  }
}

main();
#!/usr/bin/env node

/**
 * script تشغيل اختبارات E2E
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function runCommand(command, description) {
  console.log(`\n🚀 ${description}`);
  console.log(`الأمر: ${command}`);
  console.log(`cwd: ${REPO_ROOT}`);

  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: REPO_ROOT,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    console.log(`✅ نجح: ${description}`);
    return result;
  } catch (error) {
    console.error(`❌ فشل: ${description}`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 بدء اختبارات E2E للبنية المشتركة\n');
  console.log(`📍 جذر المستودع: ${REPO_ROOT}`);

  try {
    // التحقق من وجود Playwright
    console.log('📋 التحقق من Playwright...');
    try {
      execSync('npx playwright --version', { stdio: 'pipe', cwd: REPO_ROOT });
      console.log('✅ Playwright مثبت');
    } catch {
      console.log('⚠️  تثبيت Playwright...');
      runCommand('npx playwright install --with-deps chromium', 'تثبيت Playwright');
    }

    // التحقق من وجود الملفات المطلوبة
    const requiredFiles = [
      'qa/e2e/playwright.config.ts',
      'qa/e2e/global-setup.ts',
      'qa/e2e/global-teardown.ts',
      'qa/e2e/foundation-e2e.test.ts'
    ];

    console.log('📋 التحقق من ملفات E2E...');
    for (const file of requiredFiles) {
      const abs = path.join(REPO_ROOT, file);
      if (!fs.existsSync(abs)) {
        throw new Error(`الملف مفقود: ${file}`);
      }
      console.log(`✅ موجود: ${file}`);
    }

    // تشغيل اختبارات E2E
    console.log('\n🖥️  تشغيل اختبارات E2E...');
    runCommand(
      'npx playwright test --config=qa/e2e/playwright.config.ts',
      'اختبارات E2E التأسيسية'
    );

    // التحقق من تقرير Playwright
    console.log('\n📊 التحقق من تقرير Playwright...');
    const reportDir = path.join(REPO_ROOT, 'test-results/playwright-report');
    if (fs.existsSync(reportDir)) {
      const files = fs.readdirSync(reportDir);
      console.log(`✅ تقرير E2E: ${files.length} ملفات`);
    }

    // التحقق من artifacts E2E
    const artifactDir = path.join(REPO_ROOT, 'test-results/playwright-artifacts');
    if (fs.existsSync(artifactDir)) {
      const files = fs.readdirSync(artifactDir);
      console.log(`✅ artifacts E2E: ${files.length} ملفات`);
    }

    console.log('\n🎉 نجحت جميع اختبارات E2E!');

  } catch (error) {
    console.error('\n💥 فشلت اختبارات E2E:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
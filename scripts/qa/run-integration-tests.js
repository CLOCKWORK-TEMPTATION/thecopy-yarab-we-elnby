#!/usr/bin/env node

/**
 * script تشغيل اختبارات التكامل الحقيقي
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
  console.log('🎯 بدء اختبارات التكامل الحقيقي للبنية المشتركة\n');
  console.log(`📍 جذر المستودع: ${REPO_ROOT}`);

  try {
    // التحقق من وجود الملفات المطلوبة
    const requiredFiles = [
      'qa/config/TestConfigManager.ts',
      'qa/core/TestLogger.ts',
      'qa/core/TestArtifactsManager.ts',
      'qa/core/TestFixtures.ts',
      'qa/integration/foundation-integration.test.ts'
    ];

    console.log('📋 التحقق من الملفات المطلوبة...');
    for (const file of requiredFiles) {
      const abs = path.join(REPO_ROOT, file);
      if (!fs.existsSync(abs)) {
        throw new Error(`الملف مفقود: ${file}`);
      }
      console.log(`✅ موجود: ${file}`);
    }

    // تشغيل اختبارات التكامل
    console.log('\n🧪 تشغيل اختبارات التكامل الحقيقي...');
    runCommand(
      'npx vitest run qa/integration/foundation-integration.test.ts --reporter=verbose',
      'اختبارات التكامل الحقيقي'
    );

    // التحقق من وجود artifacts
    console.log('\n📁 التحقق من artifacts...');
    const artifactDirs = [
      'test-results/artifacts',
      'test-results/screenshots',
      'test-results/traces',
      'test-results/videos',
      'test-results/logs'
    ];

    for (const dir of artifactDirs) {
      const abs = path.join(REPO_ROOT, dir);
      if (fs.existsSync(abs)) {
        const files = fs.readdirSync(abs);
        console.log(`✅ ${dir}: ${files.length} ملفات`);
      } else {
        console.log(`⚠️  ${dir}: غير موجود`);
      }
    }

    // التحقق من logs
    const logFile = path.join(REPO_ROOT, 'test-results/logs/test.log');
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());
      console.log(`✅ ملف السجل: ${lines.length} سطور`);
    }

    console.log('\n🎉 نجحت جميع اختبارات التكامل الحقيقي!');

  } catch (error) {
    console.error('\n💥 فشلت اختبارات التكامل الحقيقي:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
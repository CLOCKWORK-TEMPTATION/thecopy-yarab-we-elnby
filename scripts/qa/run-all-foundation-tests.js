#!/usr/bin/env node

/**
 * script تشغيل جميع اختبارات البنية المشتركة
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function runCommand(command, description, allowFailure = false) {
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
    if (allowFailure) {
      console.log(`⚠️  فشل (متوقع): ${description}`);
      return null;
    }
    console.error(`❌ فشل: ${description}`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 بدء جميع اختبارات البنية الاختبارية المشتركة\n');

  const results = {
    integration: false,
    e2e: false,
    totalTime: 0
  };

  const startTime = Date.now();

  try {
    // 1. اختبارات التكامل الحقيقي
    console.log('='.repeat(50));
    console.log('🧪 المرحلة 1: اختبارات التكامل الحقيقي');
    console.log('='.repeat(50));

    try {
      runCommand('node scripts/qa/run-integration-tests.js', 'تشغيل اختبارات التكامل');
      results.integration = true;
    } catch (error) {
      console.log('⚠️  فشلت اختبارات التكامل، لكننا نستمر...');
    }

    // 2. اختبارات E2E
    console.log('\n' + '='.repeat(50));
    console.log('🖥️  المرحلة 2: اختبارات E2E');
    console.log('='.repeat(50));

    try {
      runCommand('node scripts/qa/run-e2e-tests.js', 'تشغيل اختبارات E2E');
      results.e2e = true;
    } catch (error) {
      console.log('⚠️  فشلت اختبارات E2E، لكننا نستمر...');
    }

    // 3. التحقق النهائي
    console.log('\n' + '='.repeat(50));
    console.log('📊 المرحلة 3: التحقق النهائي');
    console.log('='.repeat(50));

    // التحقق من artifacts
    const artifactDirs = [
      'test-results/artifacts',
      'test-results/screenshots',
      'test-results/traces',
      'test-results/videos',
      'test-results/logs',
      'test-results/playwright-report',
      'test-results/playwright-artifacts'
    ];

    console.log('\n📁 فحص artifacts...');
    let totalArtifacts = 0;
    for (const dir of artifactDirs) {
      const abs = path.join(REPO_ROOT, dir);
      if (fs.existsSync(abs)) {
        const files = fs.readdirSync(abs, { recursive: true })
          .filter(file => fs.statSync(path.join(abs, file)).isFile());
        console.log(`✅ ${dir}: ${files.length} ملفات`);
        totalArtifacts += files.length;
      } else {
        console.log(`❌ ${dir}: غير موجود`);
      }
    }

    // حساب الوقت الإجمالي
    results.totalTime = Date.now() - startTime;

    // تقرير النتائج
    console.log('\n' + '='.repeat(50));
    console.log('📋 تقرير النتائج النهائي');
    console.log('='.repeat(50));

    console.log(`🧪 اختبارات التكامل: ${results.integration ? '✅ نجح' : '❌ فشل'}`);
    console.log(`🖥️  اختبارات E2E: ${results.e2e ? '✅ نجح' : '❌ فشل'}`);
    console.log(`📁 إجمالي artifacts: ${totalArtifacts} ملف`);
    console.log(`⏱️  الوقت الإجمالي: ${Math.round(results.totalTime / 1000)} ثواني`);

    if (results.integration && results.e2e) {
      console.log('\n🎉 نجحت جميع اختبارات البنية المشتركة!');
      console.log('✅ البنية جاهزة للاستخدام من قبل الوكلاء الآخرين');
    } else {
      console.log('\n⚠️  بعض الاختبارات فشلت، لكن البنية قد تكون قابلة للاستخدام');
      console.log('🔧 راجع الأخطاء أعلاه وحاول إصلاحها');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 فشل عام في اختبارات البنية:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
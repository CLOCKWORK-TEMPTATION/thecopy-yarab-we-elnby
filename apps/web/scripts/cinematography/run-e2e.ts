import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * مشغل موحد لاختبارات النهاية إلى النهاية الخاصة بمسار الاستوديو السينمائي.
 *
 * يسمح هذا الملف بتوحيد نقطة التشغيل داخل الحزمة بدل ترك أمر يشير إلى ملف غير موجود.
 */
async function main(): Promise<void> {
  const forwardedArgs = process.argv.slice(2);
  const playwrightCliPath = require.resolve("@playwright/test/cli");
  const playwrightArgs = [
    playwrightCliPath,
    "test",
    "-c",
    "playwright.cinematography.config.ts",
    ...forwardedArgs,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, playwrightArgs, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(
          new Error(`تم إيقاف اختبارات النهاية إلى النهاية بإشارة ${signal}.`)
        );
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `فشلت اختبارات النهاية إلى النهاية الخاصة بالسينماتوغرافي برمز خروج ${code}.`
          )
        );
        return;
      }

      resolve();
    });
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

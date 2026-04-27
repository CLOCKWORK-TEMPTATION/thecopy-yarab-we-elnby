import { ESLint } from "eslint";

async function main() {
  console.log("Starting ESLint auto-fix for safe rules...");

  const eslint = new ESLint({
    fix: true,
  });

  console.log("Linting files...");
  const results = await eslint.lintFiles(["src/**/*.ts", "src/**/*.tsx"]);

  console.log("Applying fixes...");
  await ESLint.outputFixes(results);

  let fixedCount = 0;
  for (const result of results) {
    if (result.output) {
      fixedCount++;
    }
  }

  console.log(`Auto-fixing complete! Modified ${fixedCount} files.`);
}

main().catch(console.error);

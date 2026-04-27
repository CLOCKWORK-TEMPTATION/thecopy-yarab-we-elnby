import { ESLint } from "eslint";

const SAFE_RULES = [
  "import/order",
  "@typescript-eslint/dot-notation",
  "no-useless-escape",
  "import/no-duplicates",
  "@typescript-eslint/array-type",
  "@typescript-eslint/prefer-optional-chain",
  "@typescript-eslint/prefer-regexp-exec",
  "@typescript-eslint/no-inferrable-types",
  "unused-imports/no-unused-imports",
  "@typescript-eslint/consistent-generic-constructors",
  "@typescript-eslint/consistent-type-definitions",
  "@typescript-eslint/prefer-for-of"
];

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

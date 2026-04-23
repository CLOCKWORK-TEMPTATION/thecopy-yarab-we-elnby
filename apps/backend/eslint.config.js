const js = require("@eslint/js");
const vitest = require("@vitest/eslint-plugin");
const importPlugin = require("eslint-plugin-import");
const unusedImports = require("eslint-plugin-unused-imports");
const prettier = require("eslint-config-prettier");
const globals = require("globals");
const tseslint = require("typescript-eslint");

const toWarning = (config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).map(([ruleName, ruleConfig]) => {
      if (ruleConfig === "error" || ruleConfig === 2) {
        return [ruleName, "warn"];
      }

      if (Array.isArray(ruleConfig) && ruleConfig[0] === "error") {
        return [ruleName, ["warn", ...ruleConfig.slice(1)]];
      }

      if (Array.isArray(ruleConfig) && ruleConfig[0] === 2) {
        return [ruleName, [1, ...ruleConfig.slice(1)]];
      }

      return [ruleName, ruleConfig];
    }),
  ),
});

module.exports = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      "**/coverage/**",
      "**/.eslintcache",
      "**/.tsbuildinfo*",
      "**/.tmp-tests/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map(toWarning),
  ...tseslint.configs.stylisticTypeChecked.map(toWarning),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.check.json"],
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.check.json",
        },
        node: true,
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "import/order": [
        "warn",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
        },
      ],
      "no-console": "warn",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}", "**/*.config.{js,mjs,cjs,ts}"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "@typescript-eslint/no-require-imports": "off",
      "import/no-commonjs": "off",
      "no-console": "off",
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/**/__tests__/**",
      "src/test/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "ExportDefaultDeclaration",
          message: "Default exports are not allowed. Use named exports instead.",
        },
      ],
    },
  },
  {
    files: [
      "**/*.{test,spec}.ts",
      "**/__tests__/**/*.ts",
      "src/test/**/*.ts",
    ],
    plugins: {
      vitest,
    },
    rules: {
      ...toWarning(vitest.configs.recommended).rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  prettier,
);

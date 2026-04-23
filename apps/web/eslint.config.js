import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

const nextTypeScriptConfig = nextCoreWebVitals.find(
  (config) => config.name === "next/typescript",
);
const nextConfigs = nextCoreWebVitals.filter(
  (config) => config.name !== "next/typescript",
);
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

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/.git/**",
      "**/coverage/**",
      "**/.eslintcache",
      "**/.tsbuildinfo*",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map(toWarning),
  ...tseslint.configs.stylisticTypeChecked.map(toWarning),
  ...nextConfigs.map(toWarning),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.check.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
    },
    settings: {
      next: {
        rootDir: ["apps/web/"],
      },
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.check.json",
        },
        node: true,
      },
    },
    rules: {
      ...toWarning(nextTypeScriptConfig ?? {}).rules,
      ...toWarning(jsxA11y.flatConfigs.recommended).rules,
      ...toWarning(reactHooks.configs.flat.recommended).rules,
      ...toWarning(importPlugin.configs.recommended).rules,
      ...toWarning(importPlugin.configs.typescript).rules,
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
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/exhaustive-deps": "warn",
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
    files: ["**/*.{js,jsx,mjs,cjs}", "**/*.config.{js,mjs,cjs,ts}"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: {
        ...globals.browser,
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
    files: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
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

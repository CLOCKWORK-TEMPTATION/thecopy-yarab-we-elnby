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
  (config) => config.name === "next/typescript"
);
const nextConfigs = nextCoreWebVitals.filter(
  (config) => config.name !== "next/typescript"
);

const mechanicalContractRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": [
    "error",
    { checksVoidReturn: { attributes: false } },
  ],
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  complexity: ["error", { max: 20 }],
  "import/no-unresolved": "error",
  "max-depth": ["error", 4],
  "max-lines": [
    "error",
    { max: 600, skipBlankLines: true, skipComments: true },
  ],
  // Disabled due to ESLint 9.39.4 bug: TypeError: Cannot read properties of undefined (reading 'match')
  // Replaced with custom script: scripts/quality/check-function-length.ts
  // "max-lines-per-function": [
  //   "error",
  //   { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true },
  // ],
  "max-params": ["error", 5],
  "no-console": ["error", { allow: ["warn", "error"] }],
  "react-hooks/exhaustive-deps": "error",
  "unused-imports/no-unused-imports": "error",
};

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
      // Temporarily ignored due to ESLint 9.39.4 parsing error with Unicode characters in regex
      "**/editor/src/extensions/paste-classifier/classify-lines.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...nextConfigs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          "./tsconfig.check.json",
          "./tsconfig.eslint-declarations.json",
        ],
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
        rootDir: ["."],
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
      ...(nextTypeScriptConfig?.rules ?? {}),
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      ...mechanicalContractRules,
      "@typescript-eslint/no-unused-vars": "off",
      // Disabled due to ESLint 9.39.4 bug: TypeError: Cannot read properties of undefined (reading 'length')
      "react/no-unescaped-entities": "off",
      "import/order": [
        "error",
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
      "unused-imports/no-unused-vars": [
        "error",
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
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  prettier
);

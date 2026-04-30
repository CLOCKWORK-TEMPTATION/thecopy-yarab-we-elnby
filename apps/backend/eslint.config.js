const js = require("@eslint/js");
const vitest = require("@vitest/eslint-plugin");
const importPlugin = require("eslint-plugin-import");
const unusedImports = require("eslint-plugin-unused-imports");
const prettier = require("eslint-config-prettier");
const globals = require("globals");
const tseslint = require("typescript-eslint");

const typecheckProject =
  process.env.ESLINT_CONTRACT_TSCONFIG ?? "./tsconfig.check.json";

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
  "max-lines-per-function": [
    "error",
    { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true },
  ],
  "max-params": ["error", 5],
  "no-console": "error",
  "unused-imports/no-unused-imports": "error",
};

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
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [typecheckProject],
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
          project: typecheckProject,
        },
        node: {
          extensions: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".d.ts"],
        },
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      ...mechanicalContractRules,
      "@typescript-eslint/no-unused-vars": "off",
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
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Default exports are not allowed. Use named exports instead.",
        },
      ],
    },
  },
  {
    files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.ts", "src/test/**/*.ts"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    files: ["src/db/schema.ts", "src/server/route-registrars.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  prettier,
);

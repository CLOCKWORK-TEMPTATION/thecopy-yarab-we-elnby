#!/bin/bash
# سكريبت إنشاء حزمة تطبيق جديدة
# الاستخدام: bash scripts/create-package.sh brain-storm-ai

PACKAGE_NAME=$1

if [ -z "$PACKAGE_NAME" ]; then
  echo "خطأ: يرجى تحديد اسم الحزمة"
  echo "الاستخدام: bash scripts/create-package.sh <package-name>"
  exit 1
fi

PACKAGE_DIR="packages/${PACKAGE_NAME}"

if [ -d "$PACKAGE_DIR" ]; then
  echo "تحذير: المجلد ${PACKAGE_DIR} موجود بالفعل"
  exit 1
fi

mkdir -p "${PACKAGE_DIR}/src"
mkdir -p "${PACKAGE_DIR}/__tests__"

# --- package.json ---
cat > "${PACKAGE_DIR}/package.json" << EOF
{
  "name": "@the-copy/${PACKAGE_NAME}",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist node_modules .turbo"
  },
  "dependencies": {
    "@the-copy/shared": "workspace:*"
  },
  "devDependencies": {
    "@the-copy/tsconfig": "workspace:*",
    "vitest": "^4.0.6",
    "typescript": "^5.9.3"
  }
}
EOF

# --- tsconfig.json ---
cat > "${PACKAGE_DIR}/tsconfig.json" << EOF
{
  "extends": "@the-copy/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
EOF

# --- vitest.config.ts ---
cat > "${PACKAGE_DIR}/vitest.config.ts" << 'EOF'
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    alias: {
      '@the-copy/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
EOF

# --- src/index.ts ---
cat > "${PACKAGE_DIR}/src/index.ts" << EOF
// حزمة @the-copy/${PACKAGE_NAME}
// نقطة الدخول الرئيسية — أعد تصدير كل المكونات العامة هنا
EOF

echo "✅ تم إنشاء packages/${PACKAGE_NAME}/ بنجاح"
echo "   - package.json"
echo "   - tsconfig.json"
echo "   - vitest.config.ts"
echo "   - src/index.ts"
